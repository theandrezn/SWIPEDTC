import type { Collection, Funnel, Swipe, SwipeAnalysis, SwipeFeatures, Metrics } from "@/lib/types";


export const swipeTypes = [
  "Advertorial",
  "Quiz",
  "Pagina de Venda",
  "Landing Page",
  "Criativo",
  "Biblioteca de Anuncios",
  "Funil Completo",
  "VSL",
  "Upsell",
  "Downsell",
  "Thank You Page",
  "E-mail Copy",
  "Outro",
] as const;

export const niches = [
  "Emagrecimento",
  "Diabetes",
  "Saude masculina",
  "Saude feminina",
  "Skincare",
  "Suplementos",
  "Pets",
  "Financas",
  "Relacionamento",
  "Beleza",
  "Fitness",
  "Educacao",
  "Outro",
] as const;

export const trafficSources = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "YouTube",
  "Native Ads",
  "E-mail",
  "Influencer",
  "Organico",
  "Outro",
] as const;

export const geos = ["US", "BR", "LATAM", "ES", "MX", "CA", "UK", "AU"] as const;

export const emptyAnalysis: SwipeAnalysis = {
  headline: "",
  subheadline: "",
  lead: "",
  hook: "",
  bigIdea: "",
  promise: "",
  uniqueMechanism: "",
  problemMechanism: "",
  solutionMechanism: "",
  proof: "",
  story: "",
  authority: "",
  objections: "",
  offer: "",
  guarantee: "",
  cta: "",
  scarcity: "",
  urgency: "",
  trustElements: "",
  conversionElements: "",
  notes: "",
};

export const emptyFeatures: SwipeFeatures = {
  hasSocialProof: false,
  hasTestimonials: false,
  hasBeforeAfter: false,
  hasExpert: false,
  hasStudies: false,
  hasGuarantee: false,
  hasBonuses: false,
  hasFaq: false,
  hasComparison: false,
  hasPriceAnchor: false,
  hasLimitedOffer: false,
  hasRepeatedCta: false,
  hasStickyBar: false,
  hasVsl: false,
  hasQuiz: false,
  hasExternalCheckout: false,
  hasOrderBump: false,
  hasUpsell: false,
};

export const emptyMetrics: Metrics = {
  ctr: "",
  cpc: "",
  cpm: "",
  cpa: "",
  roas: "",
  conversionRate: "",
  epc: "",
  aov: "",
  estimatedRevenue: "",
  estimatedSpend: "",
  source: "",
  notes: "",
};


export const mockSwipes: Swipe[] = [];
export const mockCollections: Collection[] = [];
export const mockFunnels: Funnel[] = [];
