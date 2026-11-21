import {
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, handleFirestoreError, OperationType, storage } from './firebase';
import type {
  Advertisement,
  Category,
  CustomPage,
  DesignSettings,
  HomepageSection,
  MediaAsset,
  NavigationMenuItem,
  NewsArticle,
  PortalUser,
  Tag,
  UserRole,
  WebsiteSettings,
} from '../types/portal';

function makeId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}`;
}

export async function logActivity(
  user: PortalUser | null,
  action: string,
  entityType: string,
  entityId: string,
  details: string
): Promise<void> {
  if (!user) return;
  const id = makeId('log');
  try {
    await setDoc(doc(db, 'activityLogs', id), {
      userId: user.uid,
      userName: user.displayName,
      userRole: user.role,
      action: action.slice(0, 80),
      entityType: entityType.slice(0, 60),
      entityId: entityId.slice(0, 128),
      details: details.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Activity log skipped:', err);
  }
}

export async function trackPageView(path: string, newsId?: string): Promise<void> {
  try {
    let visitorId = '';
    try {
      visitorId = localStorage.getItem('meridian_vid') || '';
      if (!visitorId) {
        visitorId = makeId('v');
        localStorage.setItem('meridian_vid', visitorId);
      }
    } catch {
      visitorId = makeId('v');
    }
    const today = new Date().toISOString().slice(0, 10);
    const id = makeId('pv');
    await setDoc(doc(db, 'analytics', id), {
      dateKey: today,
      visitorId,
      newsId: newsId || '',
      path: path.slice(0, 300) || '/',
      createdAt: serverTimestamp(),
    });

    if (newsId) {
      await updateDoc(doc(db, 'news', newsId), {
        viewsCount: increment(1),
      });
    }
  } catch (err) {
    // Non-fatal analytics error should never crash reader experience
    console.warn('Analytics event skipped:', err);
  }
}

export async function saveArticle(
  payload: Omit<NewsArticle, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor: PortalUser
): Promise<string> {
  const isNew = !payload.id;
  const id = payload.id || makeId('art');
  const path = `news/${id}`;
  try {
    const cleanData: Record<string, unknown> = {
      title: payload.title.trim().slice(0, 240),
      slug: payload.slug.trim().slice(0, 200),
      excerpt: payload.excerpt.trim().slice(0, 600),
      contentHtml: payload.contentHtml.slice(0, 250000),
      featuredImage: (payload.featuredImage || '').slice(0, 2000),
      imageCaption: (payload.imageCaption || '').slice(0, 300),
      imageCredit: (payload.imageCredit || '').slice(0, 200),
      galleryImages: (payload.galleryImages || []).slice(0, 12),
      youtubeUrl: (payload.youtubeUrl || '').slice(0, 500),
      categoryId: payload.categoryId,
      categoryName: payload.categoryName.slice(0, 100),
      categorySlug: payload.categorySlug.slice(0, 100),
      tagNames: (payload.tagNames || []).slice(0, 10),
      authorId: isNew ? actor.uid : payload.authorId,
      authorName: (payload.authorName || actor.displayName).slice(0, 120),
      reporterName: (payload.reporterName || '').slice(0, 120),
      status: payload.status,
      isBreaking: Boolean(payload.isBreaking),
      isFeatured: Boolean(payload.isFeatured),
      isTrending: Boolean(payload.isTrending),
      isVideoNews: Boolean(payload.isVideoNews || payload.youtubeUrl),
      isPhotoGallery: Boolean(payload.isPhotoGallery || (payload.galleryImages && payload.galleryImages.length > 0)),
      viewsCount: isNew ? 0 : (payload.viewsCount ?? 0),
      readTimeMinutes: Math.max(1, Math.min(120, payload.readTimeMinutes || 4)),
      seoTitle: (payload.seoTitle || payload.title).slice(0, 160),
      seoDescription: (payload.seoDescription || payload.excerpt).slice(0, 320),
      seoKeywords: (payload.seoKeywords || '').slice(0, 300),
      ogImage: (payload.ogImage || payload.featuredImage || '').slice(0, 2000),
      canonicalUrl: (payload.canonicalUrl || '').slice(0, 1000),
      updatedAt: serverTimestamp(),
    };

    if (payload.status === 'published' && !payload.publishedAt) {
      cleanData.publishedAt = serverTimestamp();
    } else if (payload.publishedAt) {
      cleanData.publishedAt = payload.publishedAt;
    }

    if (isNew) {
      cleanData.createdAt = serverTimestamp();
      await setDoc(doc(db, 'news', id), cleanData);
      await logActivity(actor, 'CREATE_ARTICLE', 'news', id, `Created article "${cleanData.title}" (${cleanData.status})`);
    } else {
      await updateDoc(doc(db, 'news', id), cleanData);
      await logActivity(actor, 'UPDATE_ARTICLE', 'news', id, `Updated article "${cleanData.title}" (${cleanData.status})`);
    }
    return id;
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function removeArticle(id: string, title: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'news', id));
    await logActivity(actor, 'DELETE_ARTICLE', 'news', id, `Deleted article "${title}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `news/${id}`);
  }
}

export async function saveCategory(
  payload: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor: PortalUser
): Promise<string> {
  const isNew = !payload.id;
  const id = payload.id || makeId('cat');
  try {
    const data: Record<string, unknown> = {
      name: payload.name.trim().slice(0, 80),
      slug: payload.slug.trim().slice(0, 80),
      description: (payload.description || '').slice(0, 400),
      imageUrl: (payload.imageUrl || '').slice(0, 2000),
      parentId: (payload.parentId || '').slice(0, 128),
      order: Number(payload.order) || 0,
      isActive: Boolean(payload.isActive),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      data.createdAt = serverTimestamp();
      await setDoc(doc(db, 'categories', id), data);
      await logActivity(actor, 'CREATE_CATEGORY', 'categories', id, `Created category "${data.name}"`);
    } else {
      await updateDoc(doc(db, 'categories', id), data);
      await logActivity(actor, 'UPDATE_CATEGORY', 'categories', id, `Updated category "${data.name}"`);
    }
    return id;
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `categories/${id}`);
  }
}

export async function removeCategory(id: string, name: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', id));
    await logActivity(actor, 'DELETE_CATEGORY', 'categories', id, `Deleted category "${name}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
  }
}

export async function saveTag(
  payload: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor: PortalUser
): Promise<string> {
  const isNew = !payload.id;
  const id = payload.id || makeId('tag');
  try {
    const data: Record<string, unknown> = {
      name: payload.name.trim().slice(0, 60),
      slug: payload.slug.trim().slice(0, 60),
      description: (payload.description || '').slice(0, 250),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      data.createdAt = serverTimestamp();
      await setDoc(doc(db, 'tags', id), data);
    } else {
      await updateDoc(doc(db, 'tags', id), data);
    }
    await logActivity(actor, isNew ? 'CREATE_TAG' : 'UPDATE_TAG', 'tags', id, `Saved tag "${data.name}"`);
    return id;
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `tags/${id}`);
  }
}

export async function removeTag(id: string, name: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tags', id));
    await logActivity(actor, 'DELETE_TAG', 'tags', id, `Deleted tag "${name}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tags/${id}`);
  }
}

export async function uploadMediaFile(
  file: File,
  metadata: { title?: string; altText?: string; caption?: string },
  actor: PortalUser
): Promise<MediaAsset> {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
  ];
  if (!allowedMimes.includes(file.type)) {
    throw new Error('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM.');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('File exceeds the 12MB upload limit.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `media/${actor.uid}/${Date.now()}-${safeName}`;
  let downloadUrl = '';
  let resolvedStoragePath = '';

  // Attempt Firebase Storage upload first
  try {
    const storageRef = ref(storage, storagePath);
    const snap = await uploadBytes(storageRef, file, { contentType: file.type });
    downloadUrl = await getDownloadURL(snap.ref);
    resolvedStoragePath = storagePath;
  } catch {
    // Fallback to authenticated Express upload route if Firebase Storage bucket isn't activated yet
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error('Authentication token unavailable for upload.');
    }
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    const resp = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: safeName,
        mimeType: file.type,
        base64Data,
      }),
    });
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(
        'Cloud file upload requires enabling Firebase Storage in Firebase Console (Build > Storage). Alternatively, you can register any image by pasting its HTTPS URL.'
      );
    }
    if (!resp.ok) {
      const errBody = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error || 'Media upload failed');
    }
    const uploaded = (await resp.json()) as { url: string; fileName: string };
    downloadUrl = uploaded.url;
  }

  const id = makeId('media');
  const docData = {
    title: (metadata.title || file.name).slice(0, 160),
    fileName: safeName.slice(0, 200),
    url: downloadUrl.slice(0, 2000),
    storagePath: resolvedStoragePath.slice(0, 500),
    mimeType: file.type,
    sizeBytes: file.size,
    altText: (metadata.altText || metadata.title || file.name).slice(0, 300),
    caption: (metadata.caption || '').slice(0, 400),
    uploadedBy: actor.uid,
    uploaderName: actor.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'media', id), docData);
    await logActivity(actor, 'UPLOAD_MEDIA', 'media', id, `Uploaded media "${docData.title}"`);
    return { id, ...docData };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `media/${id}`);
  }
}

export async function updateMediaMetadata(
  id: string,
  updates: { title: string; altText: string; caption: string },
  actor: PortalUser
): Promise<void> {
  try {
    await updateDoc(doc(db, 'media', id), {
      title: updates.title.slice(0, 160),
      altText: updates.altText.slice(0, 300),
      caption: updates.caption.slice(0, 400),
      updatedAt: serverTimestamp(),
    });
    await logActivity(actor, 'UPDATE_MEDIA', 'media', id, `Updated media metadata "${updates.title}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `media/${id}`);
  }
}

export async function removeMedia(id: string, title: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'media', id));
    await logActivity(actor, 'DELETE_MEDIA', 'media', id, `Deleted media "${title}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `media/${id}`);
  }
}

export async function saveDesignDraft(settings: DesignSettings, actor: PortalUser): Promise<void> {
  try {
    await setDoc(doc(db, 'designSettings', 'draft'), {
      header: settings.header,
      theme: settings.theme,
      cards: settings.cards,
      sidebar: settings.sidebar,
      footer: settings.footer,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
    await logActivity(actor, 'SAVE_DESIGN_DRAFT', 'designSettings', 'draft', 'Saved design builder draft');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'designSettings/draft');
  }
}

export async function publishDesignChanges(
  draftSettings: DesignSettings,
  currentPublished: DesignSettings,
  draftSections: HomepageSection[],
  publishedSections: HomepageSection[],
  actor: PortalUser
): Promise<void> {
  try {
    const batch = writeBatch(db);
    // Save snapshot of current published as previous
    batch.set(doc(db, 'designSettings', 'previous'), {
      header: currentPublished.header,
      theme: currentPublished.theme,
      cards: currentPublished.cards,
      sidebar: currentPublished.sidebar,
      footer: currentPublished.footer,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
    // Publish draft
    batch.set(doc(db, 'designSettings', 'published'), {
      header: draftSettings.header,
      theme: draftSettings.theme,
      cards: draftSettings.cards,
      sidebar: draftSettings.sidebar,
      footer: draftSettings.footer,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });

    // Sync draft homepage sections to published scope
    const publishedIds = new Set(publishedSections.map((s) => s.id));
    const targetIds = new Set<string>();
    for (const sec of draftSections) {
      const pubId = sec.id.startsWith('draft-') ? sec.id.replace(/^draft-/, '') : sec.id;
      targetIds.add(pubId);
      batch.set(doc(db, 'homepageSections', pubId), {
        title: sec.title,
        sectionType: sec.sectionType,
        categorySlug: sec.categorySlug || '',
        layout: sec.layout,
        articleLimit: sec.articleLimit,
        backgroundColor: sec.backgroundColor || '',
        isVisible: sec.isVisible,
        order: sec.order,
        scope: 'published',
        updatedAt: serverTimestamp(),
      });
    }
    for (const existingPubId of publishedIds) {
      if (!targetIds.has(existingPubId)) {
        batch.delete(doc(db, 'homepageSections', existingPubId));
      }
    }

    await batch.commit();
    await logActivity(actor, 'PUBLISH_DESIGN', 'designSettings', 'published', 'Published website design & homepage layout');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'designSettings/published');
  }
}

export async function restorePreviousDesign(previousSettings: DesignSettings, actor: PortalUser): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'designSettings', 'published'), {
      header: previousSettings.header,
      theme: previousSettings.theme,
      cards: previousSettings.cards,
      sidebar: previousSettings.sidebar,
      footer: previousSettings.footer,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'designSettings', 'draft'), {
      header: previousSettings.header,
      theme: previousSettings.theme,
      cards: previousSettings.cards,
      sidebar: previousSettings.sidebar,
      footer: previousSettings.footer,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    await logActivity(actor, 'RESTORE_DESIGN', 'designSettings', 'published', 'Restored previous published design snapshot');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'designSettings/published');
  }
}

export async function saveHomepageSection(
  section: Omit<HomepageSection, 'id' | 'updatedAt'> & { id?: string },
  actor: PortalUser
): Promise<string> {
  const id = section.id || makeId('draft-sec');
  try {
    await setDoc(doc(db, 'homepageSections', id), {
      title: section.title.slice(0, 120),
      sectionType: section.sectionType,
      categorySlug: (section.categorySlug || '').slice(0, 100),
      layout: section.layout,
      articleLimit: Math.max(1, Math.min(24, Number(section.articleLimit) || 3)),
      backgroundColor: (section.backgroundColor || '').slice(0, 40),
      isVisible: Boolean(section.isVisible),
      order: Number(section.order) || 0,
      scope: section.scope,
      updatedAt: serverTimestamp(),
    });
    await logActivity(actor, 'SAVE_HOMEPAGE_SECTION', 'homepageSections', id, `Updated homepage section "${section.title}"`);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `homepageSections/${id}`);
  }
}

export async function reorderHomepageSections(sections: HomepageSection[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    sections.forEach((sec, idx) => {
      batch.update(doc(db, 'homepageSections', sec.id), {
        order: idx + 1,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'homepageSections');
  }
}

export async function removeHomepageSection(id: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'homepageSections', id));
    await logActivity(actor, 'DELETE_HOMEPAGE_SECTION', 'homepageSections', id, `Removed homepage section ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `homepageSections/${id}`);
  }
}

export async function saveWebsiteSettings(settings: WebsiteSettings, actor: PortalUser): Promise<void> {
  try {
    await setDoc(doc(db, 'websiteSettings', 'global'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
    await logActivity(actor, 'UPDATE_WEBSITE_SETTINGS', 'websiteSettings', 'global', 'Updated global site & SEO settings');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'websiteSettings/global');
  }
}

export async function saveNavMenuItem(
  item: Omit<NavigationMenuItem, 'id' | 'updatedAt'> & { id?: string },
  actor: PortalUser
): Promise<string> {
  const id = item.id || makeId('nav');
  try {
    await setDoc(doc(db, 'navigationMenus', id), {
      label: item.label.slice(0, 60),
      url: item.url.slice(0, 500),
      location: item.location,
      order: Number(item.order) || 0,
      openInNewTab: Boolean(item.openInNewTab),
      isActive: Boolean(item.isActive),
      updatedAt: serverTimestamp(),
    });
    await logActivity(actor, 'SAVE_MENU_ITEM', 'navigationMenus', id, `Saved menu link "${item.label}"`);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `navigationMenus/${id}`);
  }
}

export async function removeNavMenuItem(id: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'navigationMenus', id));
    await logActivity(actor, 'DELETE_MENU_ITEM', 'navigationMenus', id, `Removed menu link ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `navigationMenus/${id}`);
  }
}

export async function saveAdvertisement(
  ad: Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor: PortalUser
): Promise<string> {
  const isNew = !ad.id;
  const id = ad.id || makeId('ad');
  try {
    const data: Record<string, unknown> = {
      title: ad.title.trim().slice(0, 120),
      placement: ad.placement,
      adType: ad.adType,
      network: ad.network || (ad.adType === 'adsterra_direct' ? 'adsterra' : ad.adType === 'monetag_direct' ? 'monetag' : ad.adType === 'adsense' ? 'adsense' : 'custom'),
      imageUrl: (ad.imageUrl || '').trim().slice(0, 2000),
      targetUrl: (ad.targetUrl || '').trim().slice(0, 1000),
      ctaText: (ad.ctaText || '').trim().slice(0, 60),
      description: (ad.description || '').trim().slice(0, 240),
      scriptUrl: (ad.scriptUrl || '').trim().slice(0, 1000),
      adSize: ad.adSize || 'responsive',
      openInNewTab: ad.openInNewTab ?? true,
      adsenseClientId: (ad.adsenseClientId || '').trim().slice(0, 60),
      adsenseSlotId: (ad.adsenseSlotId || '').trim().slice(0, 60),
      startDate: (ad.startDate || '').slice(0, 40),
      endDate: (ad.endDate || '').slice(0, 40),
      isActive: Boolean(ad.isActive),
      clicks: Number(ad.clicks) || 0,
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      data.createdAt = serverTimestamp();
      await setDoc(doc(db, 'advertisements', id), data);
    } else {
      await updateDoc(doc(db, 'advertisements', id), data);
    }
    await logActivity(actor, isNew ? 'CREATE_AD' : 'UPDATE_AD', 'advertisements', id, `Saved advertisement "${ad.title}" (${ad.adType})`);
    return id;
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `advertisements/${id}`);
  }
}

export async function removeAdvertisement(id: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'advertisements', id));
    await logActivity(actor, 'DELETE_AD', 'advertisements', id, `Deleted advertisement ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `advertisements/${id}`);
  }
}

export async function recordAdClick(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'advertisements', id), { clicks: increment(1) });
  } catch {
    // non-fatal
  }
}

export async function saveCustomPage(
  page: Omit<CustomPage, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor: PortalUser
): Promise<string> {
  const isNew = !page.id;
  const id = page.id || makeId('page');
  try {
    const data: Record<string, unknown> = {
      title: page.title.slice(0, 160),
      slug: page.slug.slice(0, 120),
      contentHtml: page.contentHtml.slice(0, 200000),
      seoTitle: (page.seoTitle || page.title).slice(0, 160),
      seoDescription: (page.seoDescription || '').slice(0, 320),
      status: page.status,
      showInFooter: Boolean(page.showInFooter),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      data.createdAt = serverTimestamp();
      await setDoc(doc(db, 'pages', id), data);
    } else {
      await updateDoc(doc(db, 'pages', id), data);
    }
    await logActivity(actor, isNew ? 'CREATE_PAGE' : 'UPDATE_PAGE', 'pages', id, `Saved page "${page.title}"`);
    return id;
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `pages/${id}`);
  }
}

export async function removeCustomPage(id: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'pages', id));
    await logActivity(actor, 'DELETE_PAGE', 'pages', id, `Deleted page ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `pages/${id}`);
  }
}

export async function submitReaderComment(input: {
  newsId: string;
  newsTitle: string;
  authorName: string;
  userId?: string;
  content: string;
}): Promise<void> {
  const id = makeId('cmt');
  try {
    await setDoc(doc(db, 'comments', id), {
      newsId: input.newsId,
      newsTitle: input.newsTitle.slice(0, 240),
      authorName: input.authorName.trim().slice(0, 80),
      userId: input.userId || '',
      content: input.content.trim().slice(0, 2000),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `comments/${id}`);
  }
}

export async function moderateComment(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  actor: PortalUser
): Promise<void> {
  try {
    await updateDoc(doc(db, 'comments', id), { status, updatedAt: serverTimestamp() });
    await logActivity(actor, 'MODERATE_COMMENT', 'comments', id, `Marked comment ${status}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `comments/${id}`);
  }
}

export async function removeComment(id: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'comments', id));
    await logActivity(actor, 'DELETE_COMMENT', 'comments', id, `Deleted comment ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `comments/${id}`);
  }
}

export async function subscribeNewsletter(email: string, name?: string): Promise<void> {
  const id = makeId('sub');
  try {
    await setDoc(doc(db, 'newsletterSubscribers', id), {
      email: email.trim().toLowerCase().slice(0, 254),
      name: (name || '').trim().slice(0, 100),
      status: 'active',
      subscribedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `newsletterSubscribers/${id}`);
  }
}

export async function updateSubscriberStatus(
  id: string,
  status: 'active' | 'unsubscribed',
  actor: PortalUser
): Promise<void> {
  try {
    await updateDoc(doc(db, 'newsletterSubscribers', id), { status, updatedAt: serverTimestamp() });
    await logActivity(actor, 'UPDATE_SUBSCRIBER', 'newsletterSubscribers', id, `Changed subscriber status to ${status}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `newsletterSubscribers/${id}`);
  }
}

export async function removeSubscriber(id: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'newsletterSubscribers', id));
    await logActivity(actor, 'DELETE_SUBSCRIBER', 'newsletterSubscribers', id, `Removed subscriber ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `newsletterSubscribers/${id}`);
  }
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const id = makeId('msg');
  try {
    await setDoc(doc(db, 'contactMessages', id), {
      name: input.name.trim().slice(0, 120),
      email: input.email.trim().slice(0, 254),
      subject: input.subject.trim().slice(0, 200),
      message: input.message.trim().slice(0, 4000),
      status: 'new',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `contactMessages/${id}`);
  }
}

export async function updateUserRole(
  targetUid: string,
  role: UserRole,
  isActive: boolean,
  actor: PortalUser
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      role,
      isActive,
      updatedAt: serverTimestamp(),
    });
    await logActivity(actor, 'UPDATE_USER_ROLE', 'users', targetUid, `Assigned role "${role}" (active: ${isActive})`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

export async function inviteStaffMember(
  email: string,
  role: Exclude<UserRole, 'Super Admin' | 'Subscriber'>,
  actor: PortalUser
): Promise<void> {
  const id = makeId('inv');
  try {
    await setDoc(doc(db, 'staffInvites', id), {
      email: email.trim().toLowerCase().slice(0, 254),
      role,
      invitedBy: actor.uid,
      createdAt: serverTimestamp(),
    });
    await logActivity(actor, 'INVITE_STAFF', 'staffInvites', id, `Invited ${email} as ${role}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `staffInvites/${id}`);
  }
}

export async function removeStaffInvite(id: string, actor: PortalUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'staffInvites', id));
    await logActivity(actor, 'DELETE_INVITE', 'staffInvites', id, `Revoked staff invite ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `staffInvites/${id}`);
  }
}

export async function updateOwnProfile(
  uid: string,
  updates: { displayName: string; bio: string; title: string; photoURL: string }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: updates.displayName.trim().slice(0, 120),
      bio: updates.bio.trim().slice(0, 500),
      title: updates.title.trim().slice(0, 100),
      photoURL: updates.photoURL.trim().slice(0, 1000),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}
