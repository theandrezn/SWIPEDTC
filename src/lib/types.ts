export type SwipeType =
  | "Advertorial"
  | "Quiz"
  | "Pagina de Venda"
  | "Landing Page"
  | "Criativo"
  | "Biblioteca de Anuncios"
  | "Funil Completo"
  | "VSL"
  | "Upsell"
  | "Downsell"
  | "Thank You Page"
  | "E-mail Copy"
  | "Outro";

export type SwipeStatus = "Ativo" | "Arquivado" | "Quebrado" | "Para analisar";
export type ViewMode = "grid" | "lista" | "kanban";

export type SwipeAnalysis = {
  headline: string;
  subheadline: string;
  lead: string;
  hook: string;
  bigIdea: string;
  promise: string;
  uniqueMechanism: string;
  problemMechanism: string;
  solutionMechanism: string;
  proof: string;
  story: string;
  authority: string;
  objections: string;
  offer: string;
  guarantee: string;
  cta: string;
  scarcity: string;
  urgency: string;
  trustElements: string;
  conversionElements: string;
  notes: string;
};

export type SwipeFeatures = {
  hasSocialProof: boolean;
  hasTestimonials: boolean;
  hasBeforeAfter: boolean;
  hasExpert: boolean;
  hasStudies: boolean;
  hasGuarantee: boolean;
  hasBonuses: boolean;
  hasFaq: boolean;
  hasComparison: boolean;
  hasPriceAnchor: boolean;
  hasLimitedOffer: boolean;
  hasRepeatedCta: boolean;
  hasStickyBar: boolean;
  hasVsl: boolean;
  hasQuiz: boolean;
  hasExternalCheckout: boolean;
  hasOrderBump: boolean;
  hasUpsell: boolean;
};

export type Metrics = {
  ctr: string;
  cpc: string;
  cpm: string;
  cpa: string;
  roas: string;
  conversionRate: string;
  epc: string;
  aov: string;
  estimatedRevenue: string;
  estimatedSpend: string;
  source: string;
  notes: string;
};

export type Swipe = {
  id: string;
  title: string;
  url: string;
  type: SwipeType;
  niche: string;
  subniche: string;
  geo: string;
  language: string;
  trafficSource: string;
  platform: string;
  brand: string;
  product: string;
  price: string;
  status: SwipeStatus;
  rating: number;
  isFavorite: boolean;
  screenshotUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  adLibraryUrl: string;
  adLibrary: SwipeAdLibrary;
  creativeUrl: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  analysis: SwipeAnalysis;
  features: SwipeFeatures;
  metrics: Metrics;
};

export type SwipeAdLibrarySnapshot = {
  id: string;
  snapshotDate: string;
  adCount: number;
  source: string;
  createdAt: string;
};

export type SwipeAdLibrary = {
  currentAdCount: number;
  metaPageId: string;
  scrapeEnabled: boolean;
  lastScrapedAt: string;
  scrapeStatus: string;
  scrapeError: string;
  lastScreenshotUrl: string;
  snapshots: SwipeAdLibrarySnapshot[];
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  tags: string[];
  swipeIds: string[];
  createdAt: string;
};

export type FunnelStep = {
  id: string;
  swipeId: string;
  stepType: string;
  stepOrder: number;
  notes: string;
};

export type Funnel = {
  id: string;
  name: string;
  niche: string;
  product: string;
  brand: string;
  geo: string;
  language: string;
  trafficSource: string;
  ticket: string;
  objective: string;
  notes: string;
  steps: FunnelStep[];
  createdAt: string;
};

export type AdLibrarySnapshot = {
  id: string;
  adLibraryId: string;
  snapshotDate: string;
  adCount: number;
  source: string;
  createdAt: string;
};

export type AdLibrary = {
  id: string;
  platform: string;
  advertiserName: string;
  libraryUrl: string;
  niche: string;
  geo: string;
  status: string;
  currentAdCount: number;
  metaPageId: string;
  scrapeEnabled: boolean;
  lastScrapedAt: string;
  scrapeStatus: string;
  scrapeError: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  snapshots: AdLibrarySnapshot[];
};
