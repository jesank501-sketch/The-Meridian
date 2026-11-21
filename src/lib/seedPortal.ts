import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CUSTOM_PAGES,
  DEFAULT_DESIGN_SETTINGS,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_NAV_MENUS,
  DEFAULT_SEED_ARTICLES,
  DEFAULT_TAGS,
  DEFAULT_WEBSITE_SETTINGS,
} from './defaults';

let inFlightSeedPromise: Promise<boolean> | null = null;

async function runPortalSeed(adminUid: string, adminName: string): Promise<boolean> {
  const safeAdminName = (adminName || 'Super Admin').trim().slice(0, 120) || 'Super Admin';

  let existingCatsEmpty = true;
  let existingNewsEmpty = true;
  let existingTagsEmpty = true;
  let existingNavEmpty = true;
  let existingSectionsEmpty = true;
  let existingPagesEmpty = true;
  let existingMediaEmpty = true;
  let existingAdsEmpty = true;
  let siteExists = false;
  let pubDesignExists = false;
  let draftDesignExists = false;
  const missingCategories: typeof DEFAULT_CATEGORIES = [];

  try {
    const [
      existingCats,
      existingNews,
      existingTags,
      existingNav,
      existingSections,
      existingPages,
      existingMedia,
      existingAds,
      siteSnap,
      pubDesignSnap,
      draftDesignSnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'categories'), limit(1))),
      getDocs(query(collection(db, 'news'), limit(1))),
      getDocs(query(collection(db, 'tags'), limit(1))),
      getDocs(query(collection(db, 'navigationMenus'), limit(1))),
      getDocs(query(collection(db, 'homepageSections'), limit(1))),
      getDocs(query(collection(db, 'pages'), limit(1))),
      getDocs(query(collection(db, 'media'), limit(1))),
      getDocs(query(collection(db, 'advertisements'), limit(1))),
      getDoc(doc(db, 'websiteSettings', 'global')),
      getDoc(doc(db, 'designSettings', 'published')),
      getDoc(doc(db, 'designSettings', 'draft')),
    ]);

    existingCatsEmpty = existingCats.empty;
    existingNewsEmpty = existingNews.empty;
    existingTagsEmpty = existingTags.empty;
    existingNavEmpty = existingNav.empty;
    existingSectionsEmpty = existingSections.empty;
    existingPagesEmpty = existingPages.empty;
    existingMediaEmpty = existingMedia.empty;
    existingAdsEmpty = existingAds.empty;
    siteExists = siteSnap.exists();
    pubDesignExists = pubDesignSnap.exists();
    draftDesignExists = draftDesignSnap.exists();

    // If categories already exist but news needs seeding, make sure every category referenced by
    // DEFAULT_SEED_ARTICLES exists before batch2 writes news (enforced by firestore.rules).
    if (!existingCatsEmpty && existingNewsEmpty) {
      const catChecks = await Promise.all(
        DEFAULT_CATEGORIES.map(async (cat) => ({
          cat,
          snap: await getDoc(doc(db, 'categories', cat.id)),
        }))
      );
      for (const item of catChecks) {
        if (!item.snap.exists()) {
          missingCategories.push(item.cat);
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'seedPortal/read');
  }

  const categoriesToSeed = existingCatsEmpty ? DEFAULT_CATEGORIES : missingCategories;

  // Batch 1: Foundation config, categories, tags, navigation, and homepage sections
  const batch1 = writeBatch(db);
  const batch1Steps: string[] = [];

  if (categoriesToSeed.length > 0) {
    batch1Steps.push('categories');
    for (const cat of categoriesToSeed) {
      batch1.set(doc(db, 'categories', cat.id), {
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        order: cat.order,
        isActive: cat.isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (existingTagsEmpty) {
    batch1Steps.push('tags');
    for (const tag of DEFAULT_TAGS) {
      batch1.set(doc(db, 'tags', tag.id), {
        name: tag.name,
        slug: tag.slug,
        description: tag.description || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (!siteExists) {
    batch1Steps.push('websiteSettings');
    batch1.set(doc(db, 'websiteSettings', 'global'), {
      ...DEFAULT_WEBSITE_SETTINGS,
      updatedAt: serverTimestamp(),
    });
  }

  if (!pubDesignExists) {
    batch1Steps.push('designSettings/published');
    batch1.set(doc(db, 'designSettings', 'published'), {
      ...DEFAULT_DESIGN_SETTINGS,
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  }

  if (!draftDesignExists) {
    batch1Steps.push('designSettings/draft');
    batch1.set(doc(db, 'designSettings', 'draft'), {
      ...DEFAULT_DESIGN_SETTINGS,
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  }

  if (existingNavEmpty) {
    batch1Steps.push('navigationMenus');
    for (const item of DEFAULT_NAV_MENUS) {
      batch1.set(doc(db, 'navigationMenus', item.id), {
        label: item.label,
        url: item.url,
        location: item.location,
        order: item.order,
        openInNewTab: false,
        isActive: item.isActive,
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (existingSectionsEmpty) {
    batch1Steps.push('homepageSections');
    for (const sec of DEFAULT_HOMEPAGE_SECTIONS) {
      batch1.set(doc(db, 'homepageSections', sec.id), {
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
      batch1.set(doc(db, 'homepageSections', `draft-${sec.id}`), {
        title: sec.title,
        sectionType: sec.sectionType,
        categorySlug: sec.categorySlug || '',
        layout: sec.layout,
        articleLimit: sec.articleLimit,
        backgroundColor: sec.backgroundColor || '',
        isVisible: sec.isVisible,
        order: sec.order,
        scope: 'draft',
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (batch1Steps.length > 0) {
    try {
      await batch1.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `seedPortal/batch1:${batch1Steps.join(',')}`);
    }
  }

  // Batch 2: Articles, pages, media, initial advertisement, and initialization audit entry
  const batch2 = writeBatch(db);
  const batch2Steps: string[] = [];

  if (existingNewsEmpty) {
    batch2Steps.push('news');
    for (const art of DEFAULT_SEED_ARTICLES) {
      batch2.set(doc(db, 'news', art.id), {
        title: art.title,
        slug: art.slug,
        excerpt: art.excerpt,
        contentHtml: art.contentHtml,
        featuredImage: art.featuredImage || '',
        imageCaption: art.imageCaption || '',
        imageCredit: art.imageCredit || '',
        galleryImages: art.galleryImages || [],
        youtubeUrl: art.youtubeUrl || '',
        categoryId: art.categoryId,
        categoryName: art.categoryName,
        categorySlug: art.categorySlug,
        tagNames: art.tagNames || [],
        authorId: adminUid,
        authorName: art.authorName,
        reporterName: art.reporterName || '',
        status: art.status,
        isBreaking: art.isBreaking,
        isFeatured: art.isFeatured,
        isTrending: art.isTrending,
        isVideoNews: Boolean(art.isVideoNews),
        isPhotoGallery: Boolean(art.isPhotoGallery),
        viewsCount: art.viewsCount,
        readTimeMinutes: art.readTimeMinutes || 4,
        seoTitle: art.seoTitle || art.title.slice(0, 150),
        seoDescription: art.seoDescription || art.excerpt.slice(0, 300),
        seoKeywords: (art.tagNames || []).join(', '),
        ogImage: art.featuredImage || '',
        publishedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (existingPagesEmpty) {
    batch2Steps.push('pages');
    for (const pg of DEFAULT_CUSTOM_PAGES) {
      batch2.set(doc(db, 'pages', pg.id), {
        title: pg.title,
        slug: pg.slug,
        contentHtml: pg.contentHtml,
        seoTitle: pg.seoTitle || pg.title,
        seoDescription: pg.seoDescription || '',
        status: pg.status,
        showInFooter: Boolean(pg.showInFooter),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (existingMediaEmpty) {
    batch2Steps.push('media');
    const seedMedia = [
      {
        id: 'media-geneva-summit',
        title: 'Geneva Diplomatic Summit Plenary',
        fileName: 'hero_summit_diplomacy_1795259618132.jpg',
        url: '/src/assets/images/hero_summit_diplomacy_1795259618132.jpg',
        altText: 'Delegates seated inside the Geneva summit hall',
        caption: 'Plenary session at the Palais des Nations, Geneva.',
      },
      {
        id: 'media-semiconductor-fab',
        title: '2nm Lithography Cleanroom',
        fileName: 'news_tech_semiconductor_1795259617254.jpg',
        url: '/src/assets/images/news_tech_semiconductor_1795259617254.jpg',
        altText: 'Robotic wafer inspection arm inside cleanroom',
        caption: 'Automated wafer metrology in Class-1 cleanroom.',
      },
      {
        id: 'media-financial-district',
        title: 'Financial District Dawn',
        fileName: 'news_business_markets_1795259616983.jpg',
        url: '/src/assets/images/news_business_markets_1795259616983.jpg',
        altText: 'Financial district glass towers at sunrise',
        caption: 'European financial district ahead of market open.',
      },
      {
        id: 'media-athletics-finals',
        title: 'Championship Sprint Start',
        fileName: 'news_sports_athletics_1795259617016.jpg',
        url: '/src/assets/images/news_sports_athletics_1795259617016.jpg',
        altText: 'Track and field sprinters leaving starting blocks',
        caption: 'Men’s 100m semifinal heat under stadium floodlights.',
      },
      {
        id: 'media-clinical-lab',
        title: 'Clinical Genomics Assay',
        fileName: 'news_health_research_1795259616936.jpg',
        url: '/src/assets/images/news_health_research_1795259616936.jpg',
        altText: 'Biomedical researcher pipetting diagnostic assays',
        caption: 'Point-of-care diagnostic validation trial.',
      },
      {
        id: 'media-civic-library',
        title: 'Civic Reading Hall Atrium',
        fileName: 'news_culture_architecture_1795259616505.jpg',
        url: '/src/assets/images/news_culture_architecture_1795259616505.jpg',
        altText: 'Sunlit oak and travertine municipal library atrium',
        caption: 'Newly inaugurated municipal reading hall.',
      },
    ];
    for (const m of seedMedia) {
      batch2.set(doc(db, 'media', m.id), {
        title: m.title,
        fileName: m.fileName,
        url: m.url,
        altText: m.altText,
        caption: m.caption,
        storagePath: '',
        mimeType: 'image/jpeg',
        sizeBytes: 245000,
        uploadedBy: adminUid,
        uploaderName: safeAdminName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (existingAdsEmpty) {
    batch2Steps.push('advertisements');
    batch2.set(doc(db, 'advertisements', 'ad-edition-banner'), {
      title: 'Meridian Annual Print & Digital Archive',
      placement: 'homepage_banner',
      adType: 'image',
      imageUrl: '/src/assets/images/news_culture_architecture_1795259616505.jpg',
      targetUrl: '/page/about',
      startDate: '2026-01-01',
      endDate: '2027-12-31',
      isActive: true,
      clicks: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const seededAnything = batch1Steps.length > 0 || batch2Steps.length > 0;
  if (!seededAnything) {
    return false;
  }

  if (batch2Steps.length > 0) {
    batch2Steps.push('activityLogs');
    batch2.set(doc(db, 'activityLogs', `seed-${Date.now()}`), {
      userId: adminUid,
      userName: safeAdminName,
      userRole: 'Super Admin',
      action: 'INITIALIZE_PORTAL',
      entityType: 'system',
      entityId: 'global',
      details: 'Initialized The Meridian Dispatch editorial database and visual builder configuration.',
      createdAt: serverTimestamp(),
    });

    try {
      await batch2.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `seedPortal/batch2:${batch2Steps.join(',')}`);
    }
  }

  return true;
}

export async function ensurePortalSeeded(adminUid: string, adminName: string): Promise<boolean> {
  if (inFlightSeedPromise) {
    return inFlightSeedPromise;
  }
  const promise = runPortalSeed(adminUid, adminName).finally(() => {
    if (inFlightSeedPromise === promise) {
      inFlightSeedPromise = null;
    }
  });
  inFlightSeedPromise = promise;
  return promise;
}
