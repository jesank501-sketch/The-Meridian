/**
 * Dirty Dozen Security Rules Verification Specification
 * Verifies that all 12 adversarial payloads fail against firestore.rules invariants.
 * Run with Firebase Emulator Suite when available: npx tsx firestore.rules.test.ts
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Self-Privilege Escalation on Signup',
    collection: 'users/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker_uid', email: 'attacker@example.com', displayName: 'Attacker', role: 'Super Admin', isActive: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Profile Role Tampering by Author',
    collection: 'users/author_uid',
    operation: 'update',
    auth: { uid: 'author_uid', email: 'author@example.com', email_verified: true },
    payload: { role: 'Super Admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof',
    collection: 'websiteSettings/global',
    operation: 'update',
    auth: { uid: 'spoof_uid', email: 'jesank501@gmail.com', email_verified: false },
    payload: { siteName: 'Compromised News' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Scraping on newsletterSubscribers',
    collection: 'newsletterSubscribers',
    operation: 'list',
    auth: { uid: 'reader_uid', email: 'reader@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'PII Scraping on users collection',
    collection: 'users/other_uid',
    operation: 'get',
    auth: { uid: 'reader_uid', email: 'reader@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Draft Article Leak via Public Query',
    collection: 'news/draft_article_1',
    operation: 'get',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Shadow Field Injection on Article Update',
    collection: 'news/article_1',
    operation: 'update',
    auth: { uid: 'author_uid', email: 'author@example.com', email_verified: true },
    payload: { title: 'Updated', isVerified: true, backdoorFlag: 1 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Author Spoofing on Article Create',
    collection: 'news/article_2',
    operation: 'create',
    auth: { uid: 'reporter_uid', email: 'reporter@example.com', email_verified: true },
    payload: { authorId: 'victim_editor_uid', title: 'Spoofed Byline' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Public Comment Auto-Approval Bypass',
    collection: 'comments/c1',
    operation: 'create',
    auth: null,
    payload: { newsId: 'article_1', authorName: 'Spammer', content: 'Buy now', status: 'approved' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Article Views Tampering with Title Change',
    collection: 'news/article_1',
    operation: 'update',
    auth: null,
    payload: { viewsCount: 999999, title: 'Defaced' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client Timestamp Forgery on Category Create',
    collection: 'categories/cat_1',
    operation: 'create',
    auth: { uid: 'editor_uid', email: 'editor@example.com', email_verified: true },
    payload: { name: 'World', slug: 'world', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Path Variable Poisoning (Oversized ID)',
    collection: `news/${'a'.repeat(500)}`,
    operation: 'create',
    auth: { uid: 'editor_uid', email: 'editor@example.com', email_verified: true },
    payload: { title: 'Oversized ID Attack' },
    expected: 'PERMISSION_DENIED',
  },
];
