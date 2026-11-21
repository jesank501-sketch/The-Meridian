import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseProjectId = '';
if (fs.existsSync(configPath)) {
  try {
    const parsedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { projectId?: string };
    firebaseProjectId = parsedConfig.projectId || '';
  } catch {
    firebaseProjectId = '';
  }
}

if (firebaseProjectId && firebaseProjectId !== 'remixed-project-id') {
  if (!getApps().length) {
    initializeApp({ projectId: firebaseProjectId });
  } else {
    getApp();
  }
}

interface VerifiedUser {
  uid: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

interface AuthedRequest extends Request {
  firebaseUser?: VerifiedUser;
}

const PORT = 3000;
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Dynamic SEO state cached in memory from Admin updates (persisted in Firestore)
let cachedRobotsTxt = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /admin/*',
  `Sitemap: ${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/sitemap.xml`,
].join('\n');

let cachedSitemapEntries: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
  { loc: '/', lastmod: new Date().toISOString().split('T')[0], changefreq: 'hourly', priority: '1.0' },
  { loc: '/category/world', lastmod: new Date().toISOString().split('T')[0], changefreq: 'hourly', priority: '0.9' },
  { loc: '/category/politics', lastmod: new Date().toISOString().split('T')[0], changefreq: 'hourly', priority: '0.9' },
  { loc: '/category/business', lastmod: new Date().toISOString().split('T')[0], changefreq: 'hourly', priority: '0.9' },
  { loc: '/category/technology', lastmod: new Date().toISOString().split('T')[0], changefreq: 'hourly', priority: '0.9' },
];

// Simple sliding-window rate limiter
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const existing = rateBuckets.get(key);
    if (!existing || existing.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (existing.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    existing.count += 1;
    next();
  };
}

async function requireVerifiedFirebaseUser(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.email || decoded.email_verified !== true) {
      res.status(403).json({ error: 'Verified email account required' });
      return;
    }
    req.firebaseUser = {
      uid: decoded.uid,
      email: decoded.email,
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
      emailVerified: true,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

const uploadSchema = z.object({
  fileName: z.string().min(1).max(160),
  mimeType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
  ]),
  base64Data: z.string().min(4).max(18_000_000),
});

const adsenseSchema = z.object({
  clientId: z.string().regex(/^ca-pub-\d{10,20}$/, 'Publisher ID must match ca-pub-XXXXXXXXXXXXXXXX'),
  slotId: z.string().regex(/^\d{6,15}$/, 'Ad Slot ID must be 6-15 digits'),
});

const seoSyncSchema = z.object({
  robotsTxt: z.string().max(2000).optional(),
  entries: z
    .array(
      z.object({
        loc: z.string().min(1).max(300),
        lastmod: z.string().max(40),
        changefreq: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly']),
        priority: z.string().max(5),
      })
    )
    .max(500)
    .optional(),
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Baseline security headers (keep iframe embeddable for preview)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '16mb' }));
  app.use('/api/', createRateLimiter(120, 60_000));

  // Static uploads directory with strict nosniff
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
      },
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'meridian-dispatch-api', timestamp: new Date().toISOString() });
  });

  app.post('/api/auth/verify', requireVerifiedFirebaseUser, (req: AuthedRequest, res) => {
    const user = req.firebaseUser!;
    res.json({
      verified: true,
      uid: user.uid,
      email: user.email,
      isBootstrappedSuperAdmin: user.email.toLowerCase() === 'jesank501@gmail.com',
    });
  });

  app.post('/api/media/upload', createRateLimiter(30, 15 * 60_000), requireVerifiedFirebaseUser, (req: AuthedRequest, res) => {
    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid media payload or unsupported file type' });
      return;
    }

    const { fileName, mimeType, base64Data } = parsed.data;
    const rawBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(rawBase64, 'base64');

    if (buffer.length === 0 || buffer.length > 12 * 1024 * 1024) {
      res.status(400).json({ error: 'File must be between 1 byte and 12MB' });
      return;
    }

    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    const safeExt = extMap[mimeType] || '.bin';
    const baseStem = path
      .basename(fileName, path.extname(fileName))
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 60) || 'asset';
    const uniqueName = `${baseStem}-${crypto.randomUUID().slice(0, 8)}${safeExt}`;
    const resolvedTarget = path.resolve(UPLOAD_DIR, uniqueName);

    if (!resolvedTarget.startsWith(UPLOAD_DIR + path.sep)) {
      res.status(400).json({ error: 'Invalid upload path' });
      return;
    }

    fs.writeFileSync(resolvedTarget, buffer);
    res.status(201).json({
      url: `/uploads/${uniqueName}`,
      fileName: uniqueName,
      sizeBytes: buffer.length,
      mimeType,
    });
  });

  app.post('/api/adsense/validate', requireVerifiedFirebaseUser, (req, res) => {
    const parsed = adsenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ valid: false, error: parsed.error.issues[0]?.message || 'Invalid AdSense identifiers' });
      return;
    }
    res.json({ valid: true, clientId: parsed.data.clientId, slotId: parsed.data.slotId });
  });

  app.post('/api/seo/sync', requireVerifiedFirebaseUser, (req, res) => {
    const parsed = seoSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid SEO payload' });
      return;
    }
    if (parsed.data.robotsTxt !== undefined) {
      cachedRobotsTxt = parsed.data.robotsTxt;
    }
    if (parsed.data.entries !== undefined) {
      cachedSitemapEntries = parsed.data.entries;
    }
    res.json({ ok: true });
  });

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(cachedRobotsTxt);
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const urlsXml = cachedSitemapEntries
      .map((entry) => {
        const cleanLoc = entry.loc.startsWith('/') ? `${baseUrl}${entry.loc}` : `${baseUrl}/${entry.loc}`;
        return [
          '  <url>',
          `    <loc>${escapeXml(cleanLoc)}</loc>`,
          `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
          `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`,
          `    <priority>${escapeXml(entry.priority)}</priority>`,
          '  </url>',
        ].join('\n');
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The Meridian Dispatch server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failure:', err);
  process.exit(1);
});
