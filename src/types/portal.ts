export type UserRole =
  | 'Super Admin'
  | 'Administrator'
  | 'Editor'
  | 'Reporter'
  | 'Author'
  | 'Subscriber';

export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export type SectionType =
  | 'hero'
  | 'featured'
  | 'latest'
  | 'category'
  | 'gallery'
  | 'video'
  | 'popular'
  | 'trending'
  | 'newsletter'
  | 'ad_banner'
  | 'sponsored_ads';

export type SectionLayout = 'grid' | 'list' | 'magazine' | 'hero_split' | 'carousel';

export type AdPlacement =
  | 'header'
  | 'homepage_banner'
  | 'sponsored_section'
  | 'sidebar'
  | 'article'
  | 'footer';

export type AdType =
  | 'image'
  | 'adsense'
  | 'adsterra_direct'
  | 'monetag_direct'
  | 'ad_script';

export type AdNetwork = 'custom' | 'adsense' | 'adsterra' | 'monetag';
export type AdSize = 'responsive' | '728x90' | '300x250' | '320x50' | '160x600' | '468x60';

export interface PortalUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  bio?: string;
  title?: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StaffInvite {
  id: string;
  email: string;
  role: Exclude<UserRole, 'Super Admin' | 'Subscriber'>;
  invitedBy: string;
  createdAt?: unknown;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  featuredImage?: string;
  imageCaption?: string;
  imageCredit?: string;
  galleryImages?: string[];
  youtubeUrl?: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  tagNames?: string[];
  authorId: string;
  authorName: string;
  reporterName?: string;
  status: ArticleStatus;
  isBreaking: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isVideoNews?: boolean;
  isPhotoGallery?: boolean;
  viewsCount: number;
  readTimeMinutes?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  publishedAt?: unknown;
  scheduledFor?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  order: number;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MediaAsset {
  id: string;
  title: string;
  fileName: string;
  url: string;
  storagePath?: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string;
  caption?: string;
  uploadedBy: string;
  uploaderName?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WebsiteSettings {
  siteName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  editionLabel: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImage: string;
  canonicalBaseUrl: string;
  robotsTxt: string;
  socialLinks: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  updatedAt?: unknown;
}

export interface SidebarWidget {
  id: string;
  type: 'most_popular' | 'trending' | 'newsletter' | 'ad_sidebar' | 'categories' | 'weather_edition';
  title: string;
  enabled: boolean;
}

export interface DesignSettings {
  header: {
    logoUrl: string;
    logoText: string;
    logoWidth: number;
    logoHeight: number;
    headerBg: string;
    headerHeight: number;
    navPosition: 'left' | 'center' | 'below';
    enableTopBar: boolean;
    showSocialIcons: boolean;
    showBreakingTicker: boolean;
  };
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    headingFont: string;
    bodyFont: string;
    baseFontSize: number;
    buttonStyle: 'sharp' | 'rounded' | 'soft';
    borderStyle: 'hairline' | 'solid' | 'none';
  };
  cards: {
    defaultLayout: 'grid' | 'list' | 'magazine';
    imageAspectRatio: '16/9' | '4/3' | '3/2' | '1/1';
    imageHeightPx: number;
    titleFontSize: number;
    cardBackground: string;
    borderRadius: number;
    cardSpacing: number;
  };
  sidebar: {
    enabled: boolean;
    position: 'left' | 'right';
    widgets: SidebarWidget[];
  };
  footer: {
    design: 'editorial_columns' | 'minimal_centered' | 'classic_broadsheet';
    logoUrl: string;
    footerText: string;
    footerBg: string;
    showSocialLinks: boolean;
  };
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface HomepageSection {
  id: string;
  title: string;
  sectionType: SectionType;
  categorySlug?: string;
  layout: SectionLayout;
  articleLimit: number;
  backgroundColor?: string;
  isVisible: boolean;
  order: number;
  scope: 'published' | 'draft';
  updatedAt?: unknown;
}

export interface NavigationMenuItem {
  id: string;
  label: string;
  url: string;
  location: 'header' | 'footer_col1' | 'footer_col2' | 'topbar';
  order: number;
  openInNewTab?: boolean;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface Advertisement {
  id: string;
  title: string;
  placement: AdPlacement;
  adType: AdType;
  network?: AdNetwork;
  imageUrl?: string;
  targetUrl?: string;
  ctaText?: string;
  description?: string;
  scriptUrl?: string;
  adSize?: AdSize;
  openInNewTab?: boolean;
  adsenseClientId?: string;
  adsenseSlotId?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  clicks: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  seoTitle?: string;
  seoDescription?: string;
  status: 'published' | 'draft';
  showInFooter?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReaderComment {
  id: string;
  newsId: string;
  newsTitle?: string;
  authorName: string;
  userId?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed';
  subscribedAt?: unknown;
  updatedAt?: unknown;
}

export interface AnalyticsEvent {
  id: string;
  dateKey: string;
  visitorId: string;
  newsId?: string;
  path: string;
  createdAt?: unknown;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt?: unknown;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  createdAt?: unknown;
}
