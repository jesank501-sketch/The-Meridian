import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CUSTOM_PAGES,
  DEFAULT_DESIGN_SETTINGS,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_NAV_MENUS,
  DEFAULT_SEED_ARTICLES,
  DEFAULT_TAGS,
  DEFAULT_WEBSITE_SETTINGS,
} from '../lib/defaults';
import { ensurePortalSeeded } from '../lib/seedPortal';
import { toMillis } from '../lib/sanitize';
import type {
  ActivityLog,
  Advertisement,
  AnalyticsEvent,
  Category,
  ContactMessage,
  CustomPage,
  DesignSettings,
  HomepageSection,
  MediaAsset,
  NavigationMenuItem,
  NewsArticle,
  NewsletterSubscriber,
  PortalUser,
  ReaderComment,
  StaffInvite,
  Tag,
  WebsiteSettings,
} from '../types/portal';

export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'jesank501@gmail.com';

function formatAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const rawMessage = err instanceof Error ? err.message : String(err || '');

  switch (code) {
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups for this site or click "Open Login in New Tab" below.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in popup was closed before finishing. Please try again or open login in a new tab if your browser restricts popups inside this frame.';
    case 'auth/unauthorized-domain':
      return `Domain "${typeof window !== 'undefined' ? window.location.hostname : ''}" is not authorized in Firebase Authentication > Settings > Authorized domains.`;
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled in Firebase Authentication. Enable Google under Sign-in method in Firebase Console.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to Google authentication servers. Check your internet connection and try again.';
    default:
      return rawMessage || 'Unable to complete Google sign-in. Please allow popups and try again.';
  }
}

interface PortalContextValue {
  authReady: boolean;
  isSyncingProfile: boolean;
  authError: string | null;
  seedWarning: string | null;
  firebaseUser: FirebaseUser | null;
  currentUser: PortalUser | null;
  isOffline: boolean;
  isSeeding: boolean;
  // Permissions
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isEditorialStaff: boolean;
  // Public & Editorial Data
  articles: NewsArticle[];
  publishedArticles: NewsArticle[];
  categories: Category[];
  tags: Tag[];
  websiteSettings: WebsiteSettings;
  publishedDesign: DesignSettings;
  draftDesign: DesignSettings;
  previousDesign: DesignSettings | null;
  publishedSections: HomepageSection[];
  draftSections: HomepageSection[];
  navMenus: NavigationMenuItem[];
  advertisements: Advertisement[];
  pages: CustomPage[];
  comments: ReaderComment[];
  // Admin/Staff Data
  media: MediaAsset[];
  users: PortalUser[];
  staffInvites: StaffInvite[];
  subscribers: NewsletterSubscriber[];
  analyticsEvents: AnalyticsEvent[];
  activityLogs: ActivityLog[];
  contactMessages: ContactMessage[];
  // Preview Mode Override (for Live Website Preview in Admin)
  previewDesignOverride: DesignSettings | null;
  previewSectionsOverride: HomepageSection[] | null;
  setPreviewOverrides: (design: DesignSettings | null, sections: HomepageSection[] | null) => void;
  // Auth Actions
  loginWithGoogle: () => Promise<void>;
  switchGoogleAccount: () => Promise<void>;
  retryProfileSync: () => Promise<void>;
  clearAuthError: () => void;
  logout: () => Promise<void>;
  reseedIfEmpty: () => Promise<boolean>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [seedWarning, setSeedWarning] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const [rawArticles, setRawArticles] = useState<NewsArticle[]>([]);
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [rawTags, setRawTags] = useState<Tag[]>([]);
  const [rawWebsiteSettings, setRawWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [rawPublishedDesign, setRawPublishedDesign] = useState<DesignSettings | null>(null);
  const [rawDraftDesign, setRawDraftDesign] = useState<DesignSettings | null>(null);
  const [previousDesign, setPreviousDesign] = useState<DesignSettings | null>(null);
  const [rawSections, setRawSections] = useState<HomepageSection[]>([]);
  const [rawNavMenus, setRawNavMenus] = useState<NavigationMenuItem[]>([]);
  const [rawAds, setRawAds] = useState<Advertisement[]>([]);
  const [rawPages, setRawPages] = useState<CustomPage[]>([]);
  const [comments, setComments] = useState<ReaderComment[]>([]);

  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [staffInvites, setStaffInvites] = useState<StaffInvite[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);

  const [previewDesignOverride, setPreviewDesignOverride] = useState<DesignSettings | null>(null);
  const [previewSectionsOverride, setPreviewSectionsOverride] = useState<HomepageSection[] | null>(null);

  const isSuperAdmin = Boolean(
    currentUser?.isActive &&
      (currentUser.role === 'Super Admin' ||
        currentUser.email.toLowerCase() === BOOTSTRAP_SUPER_ADMIN_EMAIL)
  );
  const isAdmin = Boolean(
    isSuperAdmin || (currentUser?.isActive && currentUser?.role === 'Administrator')
  );
  const isEditor = Boolean(isAdmin || (currentUser?.isActive && currentUser?.role === 'Editor'));
  const isEditorialStaff = Boolean(
    isEditor ||
      (currentUser?.isActive &&
        (currentUser?.role === 'Reporter' || currentUser?.role === 'Author'))
  );

  // Check Firestore connectivity on boot
  useEffect(() => {
    testFirestoreConnection().then((res) => {
      if (res.offline) setIsOffline(true);
    });
  }, []);

  const inFlightSyncRef = useRef<{ uid: string; promise: Promise<void> } | null>(null);

  const syncUserProfile = useCallback((fbUser: FirebaseUser) => {
    if (inFlightSyncRef.current && inFlightSyncRef.current.uid === fbUser.uid) {
      return inFlightSyncRef.current.promise;
    }

    const syncPromise = (async () => {
      setIsSyncingProfile(true);
      setAuthError(null);
      setSeedWarning(null);

    try {
      if (!fbUser.email || !fbUser.emailVerified) {
        setCurrentUser(null);
        setAuthError(
          'Your Google account does not have a verified email address. Please sign in with a verified Google account.'
        );
        return;
      }

      // Non-blocking token verification with backend
      fbUser
        .getIdToken()
        .then((token) =>
          fetch('/api/auth/verify', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
        .catch(() => null);

      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);
      const isBootstrap = fbUser.email.toLowerCase() === BOOTSTRAP_SUPER_ADMIN_EMAIL;
      const safeDisplayName = (
        fbUser.displayName ||
        fbUser.email.split('@')[0] ||
        'Staff Member'
      )
        .trim()
        .slice(0, 120);
      const safePhotoUrl = (fbUser.photoURL || '').slice(0, 1000);

      let resolvedUser: PortalUser;

      if (!snap.exists()) {
        const newProfilePayload = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: safeDisplayName,
          photoURL: safePhotoUrl,
          role: isBootstrap ? ('Super Admin' as const) : ('Subscriber' as const),
          title: isBootstrap ? 'Editor-in-Chief' : 'Reader',
          bio: '',
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfilePayload);
        resolvedUser = {
          id: fbUser.uid,
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: safeDisplayName,
          photoURL: safePhotoUrl,
          role: newProfilePayload.role,
          title: newProfilePayload.title,
          bio: '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        const data = snap.data() as Omit<PortalUser, 'id'>;
        if (isBootstrap && (data.role !== 'Super Admin' || !data.isActive)) {
          await updateDoc(userRef, {
            role: 'Super Admin',
            isActive: true,
            updatedAt: serverTimestamp(),
          });
          resolvedUser = {
            id: snap.id,
            ...data,
            role: 'Super Admin',
            isActive: true,
          };
        } else {
          resolvedUser = { id: snap.id, ...data };
        }
      }

      setCurrentUser(resolvedUser);

      // Run initial portal seed safely without blocking login state
      if (
        isBootstrap ||
        resolvedUser.role === 'Super Admin' ||
        resolvedUser.role === 'Administrator'
      ) {
        setIsSeeding(true);
        ensurePortalSeeded(fbUser.uid, resolvedUser.displayName)
          .catch((seedErr) => {
            console.warn('Portal initial seed warning:', seedErr);
            setSeedWarning(
              seedErr instanceof Error
                ? seedErr.message
                : 'Initial database seeding encountered an error.'
            );
          })
          .finally(() => {
            setIsSeeding(false);
          });
      }
    } catch (err) {
      console.error('Auth profile sync error:', err);
      const detail = err instanceof Error ? err.message : String(err);
      setAuthError(
        `Signed in as ${fbUser.email || fbUser.uid}, but could not sync newsroom profile in Firestore: ${detail}`
      );
      setCurrentUser(null);
    } finally {
      setIsSyncingProfile(false);
      setAuthReady(true);
    }
    })();

    inFlightSyncRef.current = { uid: fbUser.uid, promise: syncPromise };
    return syncPromise.finally(() => {
      if (inFlightSyncRef.current?.promise === syncPromise) {
        inFlightSyncRef.current = null;
      }
    });
  }, []);

  // Auth State & Profile Sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setCurrentUser(null);
        setAuthError(null);
        setSeedWarning(null);
        setIsSyncingProfile(false);
        setAuthReady(true);
        return;
      }
      await syncUserProfile(fbUser);
    });
    return () => unsub();
  }, [syncUserProfile]);

  // Live subscription to user's own doc after initial sync completes
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !currentUser) return;
    const unsub = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setCurrentUser({ id: snap.id, ...(snap.data() as Omit<PortalUser, 'id'>) });
        }
      },
      (err) => {
        console.error('User doc listener error:', err);
        setAuthError(err instanceof Error ? err.message : 'Unable to listen to profile updates.');
      }
    );
    return () => unsub();
  }, [authReady, firebaseUser, Boolean(currentUser)]);

  // Public & Editorial Core Listeners
  useEffect(() => {
    if (!authReady) return;

    const newsQuery = isEditorialStaff
      ? collection(db, 'news')
      : query(collection(db, 'news'), where('status', '==', 'published'));
    const unsubNews = onSnapshot(
      newsQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NewsArticle, 'id'>) }));
        list.sort((a, b) => toMillis(b.publishedAt || b.createdAt) - toMillis(a.publishedAt || a.createdAt));
        setRawArticles(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'news')
    );

    const catQuery = isEditorialStaff
      ? collection(db, 'categories')
      : query(collection(db, 'categories'), where('isActive', '==', true));
    const unsubCats = onSnapshot(
      catQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
        list.sort((a, b) => a.order - b.order);
        setRawCategories(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    const unsubTags = onSnapshot(
      collection(db, 'tags'),
      (snap) => {
        setRawTags(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tag, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'tags')
    );

    const unsubSite = onSnapshot(
      doc(db, 'websiteSettings', 'global'),
      (snap) => {
        if (snap.exists()) setRawWebsiteSettings(snap.data() as WebsiteSettings);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'websiteSettings/global')
    );

    const unsubPubDesign = onSnapshot(
      doc(db, 'designSettings', 'published'),
      (snap) => {
        if (snap.exists()) setRawPublishedDesign(snap.data() as DesignSettings);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'designSettings/published')
    );

    const secQuery = isEditor
      ? collection(db, 'homepageSections')
      : query(collection(db, 'homepageSections'), where('scope', '==', 'published'));
    const unsubSections = onSnapshot(
      secQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HomepageSection, 'id'>) }));
        list.sort((a, b) => a.order - b.order);
        setRawSections(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'homepageSections')
    );

    const navQuery = isAdmin
      ? collection(db, 'navigationMenus')
      : query(collection(db, 'navigationMenus'), where('isActive', '==', true));
    const unsubNav = onSnapshot(
      navQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NavigationMenuItem, 'id'>) }));
        list.sort((a, b) => a.order - b.order);
        setRawNavMenus(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'navigationMenus')
    );

    const adQuery = isAdmin
      ? collection(db, 'advertisements')
      : query(collection(db, 'advertisements'), where('isActive', '==', true));
    const unsubAds = onSnapshot(
      adQuery,
      (snap) => {
        setRawAds(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Advertisement, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'advertisements')
    );

    const pagesQuery = isEditor
      ? collection(db, 'pages')
      : query(collection(db, 'pages'), where('status', '==', 'published'));
    const unsubPages = onSnapshot(
      pagesQuery,
      (snap) => {
        setRawPages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomPage, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'pages')
    );

    const commentsQuery = isEditor
      ? collection(db, 'comments')
      : query(collection(db, 'comments'), where('status', '==', 'approved'));
    const unsubComments = onSnapshot(
      commentsQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReaderComment, 'id'>) }));
        list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setComments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'comments')
    );

    return () => {
      unsubNews();
      unsubCats();
      unsubTags();
      unsubSite();
      unsubPubDesign();
      unsubSections();
      unsubNav();
      unsubAds();
      unsubPages();
      unsubComments();
    };
  }, [authReady, isEditorialStaff, isEditor, isAdmin]);

  // Editorial Staff Listeners (Media, Analytics, Activity Logs)
  useEffect(() => {
    if (!authReady || !isEditorialStaff) {
      setMedia([]);
      setAnalyticsEvents([]);
      setActivityLogs([]);
      return;
    }

    const unsubMedia = onSnapshot(
      collection(db, 'media'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MediaAsset, 'id'>) }));
        list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setMedia(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'media')
    );

    const unsubAnalytics = onSnapshot(
      collection(db, 'analytics'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AnalyticsEvent, 'id'>) }));
        list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setAnalyticsEvents(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'analytics')
    );

    const unsubLogs = onSnapshot(
      collection(db, 'activityLogs'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLog, 'id'>) }));
        list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setActivityLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'activityLogs')
    );

    return () => {
      unsubMedia();
      unsubAnalytics();
      unsubLogs();
    };
  }, [authReady, isEditorialStaff]);

  // Admin-Only Listeners (Users, Invites, Subscribers, Contact Messages, Draft/Previous Design)
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setUsers([]);
      setStaffInvites([]);
      setSubscribers([]);
      setContactMessages([]);
      setRawDraftDesign(null);
      setPreviousDesign(null);
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PortalUser, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubInvites = onSnapshot(
      collection(db, 'staffInvites'),
      (snap) => {
        setStaffInvites(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StaffInvite, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'staffInvites')
    );

    const unsubSubs = onSnapshot(
      collection(db, 'newsletterSubscribers'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NewsletterSubscriber, 'id'>) }));
        list.sort((a, b) => toMillis(b.subscribedAt) - toMillis(a.subscribedAt));
        setSubscribers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'newsletterSubscribers')
    );

    const unsubMsgs = onSnapshot(
      collection(db, 'contactMessages'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContactMessage, 'id'>) }));
        list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setContactMessages(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contactMessages')
    );

    const unsubDraftDesign = onSnapshot(
      doc(db, 'designSettings', 'draft'),
      (snap) => {
        if (snap.exists()) setRawDraftDesign(snap.data() as DesignSettings);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'designSettings/draft')
    );

    const unsubPrevDesign = onSnapshot(
      doc(db, 'designSettings', 'previous'),
      (snap) => {
        if (snap.exists()) setPreviousDesign(snap.data() as DesignSettings);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'designSettings/previous')
    );

    return () => {
      unsubUsers();
      unsubInvites();
      unsubSubs();
      unsubMsgs();
      unsubDraftDesign();
      unsubPrevDesign();
    };
  }, [authReady, isAdmin]);

  // Derived data with graceful cold-boot defaults before initial admin seed
  const articles = useMemo(
    () => (rawArticles.length > 0 ? rawArticles : DEFAULT_SEED_ARTICLES),
    [rawArticles]
  );

  const publishedArticles = useMemo(
    () => articles.filter((a) => a.status === 'published'),
    [articles]
  );

  const categories = useMemo(
    () => (rawCategories.length > 0 ? rawCategories : DEFAULT_CATEGORIES),
    [rawCategories]
  );

  const tags = useMemo(() => (rawTags.length > 0 ? rawTags : DEFAULT_TAGS), [rawTags]);

  const websiteSettings = useMemo(
    () => rawWebsiteSettings || DEFAULT_WEBSITE_SETTINGS,
    [rawWebsiteSettings]
  );

  const publishedDesign = useMemo(
    () => previewDesignOverride || rawPublishedDesign || DEFAULT_DESIGN_SETTINGS,
    [previewDesignOverride, rawPublishedDesign]
  );

  const draftDesign = useMemo(
    () => rawDraftDesign || rawPublishedDesign || DEFAULT_DESIGN_SETTINGS,
    [rawDraftDesign, rawPublishedDesign]
  );

  const publishedSections = useMemo(() => {
    if (previewSectionsOverride) return previewSectionsOverride;
    const fromDb = rawSections.filter((s) => s.scope === 'published');
    return fromDb.length > 0 ? fromDb : DEFAULT_HOMEPAGE_SECTIONS;
  }, [previewSectionsOverride, rawSections]);

  const draftSections = useMemo(() => {
    const fromDb = rawSections.filter((s) => s.scope === 'draft');
    if (fromDb.length > 0) return fromDb;
    return publishedSections.map((s) => ({
      ...s,
      id: s.id.startsWith('draft-') ? s.id : `draft-${s.id}`,
      scope: 'draft' as const,
    }));
  }, [rawSections, publishedSections]);

  const navMenus = useMemo(
    () => (rawNavMenus.length > 0 ? rawNavMenus : DEFAULT_NAV_MENUS),
    [rawNavMenus]
  );

  const pages = useMemo(
    () => (rawPages.length > 0 ? rawPages : DEFAULT_CUSTOM_PAGES),
    [rawPages]
  );

  // Sync theme CSS custom properties and light/dark mode to DOM
  useEffect(() => {
    const t = publishedDesign.theme;
    const root = document.documentElement;
    if (t.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.setProperty('--portal-primary', t.primaryColor);
    root.style.setProperty('--portal-secondary', t.secondaryColor);
    root.style.setProperty('--portal-bg', t.mode === 'dark' ? '#0c0a09' : t.backgroundColor);
    root.style.setProperty('--portal-text', t.mode === 'dark' ? '#f5f5f4' : t.textColor);
    root.style.setProperty('--portal-heading-font', t.headingFont);
    root.style.setProperty('--portal-body-font', t.bodyFont);
    root.style.fontSize = `${t.baseFontSize || 16}px`;
  }, [publishedDesign]);

  // Sync document SEO metadata
  useEffect(() => {
    if (websiteSettings.seoTitle) {
      document.title = websiteSettings.seoTitle;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && websiteSettings.seoDescription) {
      metaDesc.setAttribute('content', websiteSettings.seoDescription);
    }
  }, [websiteSettings]);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        await syncUserProfile(cred.user);
      }
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const switchGoogleAccount = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        await syncUserProfile(cred.user);
      }
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const retryProfileSync = async () => {
    if (auth.currentUser) {
      await syncUserProfile(auth.currentUser);
    }
  };

  const clearAuthError = () => setAuthError(null);

  const logout = async () => {
    setAuthError(null);
    setSeedWarning(null);
    await signOut(auth);
  };

  const reseedIfEmpty = async () => {
    if (!currentUser) return false;
    setIsSeeding(true);
    setSeedWarning(null);
    try {
      return await ensurePortalSeeded(currentUser.uid, currentUser.displayName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to seed database.';
      setSeedWarning(msg);
      return false;
    } finally {
      setIsSeeding(false);
    }
  };

  const setPreviewOverrides = (
    design: DesignSettings | null,
    sections: HomepageSection[] | null
  ) => {
    setPreviewDesignOverride(design);
    setPreviewSectionsOverride(sections);
  };

  return (
    <PortalContext.Provider
      value={{
        authReady,
        isSyncingProfile,
        authError,
        seedWarning,
        firebaseUser,
        currentUser,
        isOffline,
        isSeeding,
        isSuperAdmin,
        isAdmin,
        isEditor,
        isEditorialStaff,
        articles,
        publishedArticles,
        categories,
        tags,
        websiteSettings,
        publishedDesign,
        draftDesign,
        previousDesign,
        publishedSections,
        draftSections,
        navMenus,
        advertisements: rawAds,
        pages,
        comments,
        media,
        users,
        staffInvites,
        subscribers,
        analyticsEvents,
        activityLogs,
        contactMessages,
        previewDesignOverride,
        previewSectionsOverride,
        setPreviewOverrides,
        loginWithGoogle,
        switchGoogleAccount,
        retryProfileSync,
        clearAuthError,
        logout,
        reseedIfEmpty,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}
