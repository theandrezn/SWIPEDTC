"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import * as tus from "tus-js-client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  BookOpen,
  Boxes,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Folder,
  Gauge,
  Grid3X3,
  Heart,
  ImagePlus,
  KanbanSquare,
  Languages,
  LayoutDashboard,
  Link2,
  List,
  Loader2,
  LogOut,
  Menu,
  Moon,
  PenLine,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  emptyAnalysis,
  emptyFeatures,
  emptyMetrics,
  geos,
  niches,
  trafficSources,
} from "@/lib/mock-data";
import { configuredSupabaseUrl, isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Collection, Funnel, Swipe, SwipeStatus, SwipeType, ViewMode } from "@/lib/types";
import { cn, formatDate, safeUrl, uid } from "@/lib/utils";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "Advertorial", label: "Advertorials", icon: FileText },
  { id: "Quiz", label: "Quizzes", icon: Gauge },
  { id: "Pagina de Venda", label: "Páginas de Venda", icon: BookOpen },
  { id: "Criativo", label: "Criativos", icon: ImagePlus },
  { id: "collections", label: "Coleções por Nicho", icon: Folder },
];

const visibleLibrarySections = ["Advertorial", "Quiz", "Pagina de Venda", "Criativo"];
const visibleSwipeTypes = visibleLibrarySections as SwipeType[];


const statuses: SwipeStatus[] = ["Ativo", "Arquivado", "Quebrado", "Para analisar"];
const languages = ["PT-BR", "EN", "ES", "FR", "DE"];
const platforms = ["Meta Ads Library", "TikTok Creative Center", "Google Ads Transparency", "Native", "Outra"];
const featureLabels: Array<[keyof Swipe["features"], string]> = [
  ["hasSocialProof", "Prova social"],
  ["hasTestimonials", "Depoimentos"],
  ["hasBeforeAfter", "Antes e depois"],
  ["hasExpert", "Especialista"],
  ["hasStudies", "Estudos"],
  ["hasGuarantee", "Garantia"],
  ["hasBonuses", "Bônus"],
  ["hasFaq", "FAQ"],
  ["hasComparison", "Comparação"],
  ["hasPriceAnchor", "Ancoragem de preço"],
  ["hasLimitedOffer", "Oferta limitada"],
  ["hasRepeatedCta", "CTA repetido"],
  ["hasStickyBar", "Sticky bar"],
  ["hasVsl", "Vídeo/VSL"],
  ["hasQuiz", "Quiz"],
  ["hasExternalCheckout", "Checkout externo"],
  ["hasOrderBump", "Order bump"],
  ["hasUpsell", "Upsell"],
];

type Filters = {
  type: string;
  niche: string;
  geo: string;
  language: string;
  trafficSource: string;
  status: string;
  rating: string;
  favorites: boolean;
  hasScreenshot: boolean;
  hasAnalysis: boolean;
};

const defaultFilters: Filters = {
  type: "",
  niche: "",
  geo: "",
  language: "",
  trafficSource: "",
  status: "",
  rating: "",
  favorites: false,
  hasScreenshot: false,
  hasAnalysis: false,
};

const storageVersion = "dtc-swipe-hub-empty-account-v1";

type SwipeRow = {
  id: string;
  title: string;
  url: string;
  type: string;
  niche: string | null;
  subniche: string | null;
  geo: string | null;
  language: string | null;
  traffic_source: string | null;
  platform: string | null;
  brand: string | null;
  product: string | null;
  price: string | null;
  status: string;
  rating: number;
  is_favorite: boolean;
  screenshot_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  ad_library_url: string | null;
  creative_url: string | null;
  notes: string | null;
  payload: Partial<Swipe> | null;
  created_at: string;
  updated_at: string;
};

type CollectionRow = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  payload: Partial<Collection> | null;
  created_at: string;
};

type AdLibrarySnapshotRow = {
  id: string;
  ad_library_id: string;
  swipe_id: string | null;
  snapshot_date: string;
  ad_count: number;
  source: string;
  created_at: string;
};

function createRecordId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : uid(prefix);
}

function emptySwipeAdLibrary() {
  return {
    currentAdCount: 0,
    metaPageId: "",
    scrapeEnabled: true,
    lastScrapedAt: "",
    scrapeStatus: "manual",
    scrapeError: "",
    lastScreenshotUrl: "",
    snapshots: [],
  };
}

function swipeFromRow(row: SwipeRow, adSnapshots: AdLibrarySnapshotRow[] = []): Swipe {
  const payload = row.payload ?? {};
  const payloadAdLibrary = payload.adLibrary ?? {};
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    type: row.type as SwipeType,
    niche: row.niche ?? "",
    subniche: row.subniche ?? "",
    geo: row.geo ?? "",
    language: row.language ?? "",
    trafficSource: row.traffic_source ?? "",
    platform: row.platform ?? "",
    brand: row.brand ?? "",
    product: row.product ?? "",
    price: row.price ?? "",
    status: row.status as SwipeStatus,
    rating: row.rating,
    isFavorite: row.is_favorite,
    screenshotUrl: row.screenshot_url ?? "",
    ogTitle: row.og_title ?? "",
    ogDescription: row.og_description ?? "",
    ogImage: row.og_image ?? "",
    adLibraryUrl: row.ad_library_url ?? "",
    adLibrary: {
      ...emptySwipeAdLibrary(),
      ...payloadAdLibrary,
      snapshots: adSnapshots
        .filter((snapshot) => snapshot.swipe_id === row.id)
        .map((snapshot) => ({
          id: snapshot.id,
          snapshotDate: snapshot.snapshot_date,
          adCount: snapshot.ad_count,
          source: snapshot.source,
          createdAt: snapshot.created_at,
        })),
    },
    creativeUrl: row.creative_url ?? "",
    creativeMediaType: payload.creativeMediaType,
    creativeFileName: payload.creativeFileName,
    notes: row.notes ?? "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    createdAt: payload.createdAt ?? row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: payload.lastSeenAt ?? row.updated_at ?? row.created_at,
    analysis: { ...emptyAnalysis, ...(payload.analysis ?? {}) },
    features: { ...emptyFeatures, ...(payload.features ?? {}) },
    metrics: { ...emptyMetrics, ...(payload.metrics ?? {}) },
  };
}

function collectionFromRow(row: CollectionRow): Collection {
  const payload = row.payload ?? {};
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    coverUrl: row.cover_url ?? "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    swipeIds: Array.isArray(payload.swipeIds) ? payload.swipeIds : [],
    createdAt: payload.createdAt ?? row.created_at,
  };
}

function swipeToRow(swipe: Swipe, userId: string) {
  return {
    id: swipe.id,
    user_id: userId,
    title: swipe.title,
    url: swipe.url,
    type: swipe.type,
    niche: swipe.niche || null,
    subniche: swipe.subniche || null,
    geo: swipe.geo || null,
    language: swipe.language || null,
    traffic_source: swipe.trafficSource || null,
    platform: swipe.platform || null,
    brand: swipe.brand || null,
    product: swipe.product || null,
    price: swipe.price || null,
    status: swipe.status,
    rating: swipe.rating,
    is_favorite: swipe.isFavorite,
    screenshot_url: swipe.screenshotUrl || null,
    og_title: swipe.ogTitle || null,
    og_description: swipe.ogDescription || null,
    og_image: swipe.ogImage || null,
    ad_library_url: swipe.adLibraryUrl || null,
    creative_url: swipe.creativeUrl || null,
    notes: swipe.notes || null,
    payload: swipe,
    created_at: swipe.createdAt,
    updated_at: swipe.updatedAt,
  };
}

function collectionToRow(collection: Collection, userId: string) {
  return {
    id: collection.id,
    user_id: userId,
    name: collection.name,
    description: collection.description || null,
    cover_url: collection.coverUrl || null,
    payload: collection,
    created_at: collection.createdAt,
  };
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthHydrated, setIsAuthHydrated] = useState(!isSupabaseConfigured);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mode, setMode] = useState<"informacoes" | "metricas">("informacoes");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedSwipeId, setSelectedSwipeId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  async function ensureUserProfile(user: User) {
    if (!supabase) return;
    await supabase.from("users").upsert({
      id: user.id,
      email: user.email ?? "",
      name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Usuário",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });
  }

  async function loadRemoteState(user: User) {
    if (!supabase) return;
    await ensureUserProfile(user);

    const [swipeResult, collectionResult, adSnapshotResult] = await Promise.all([
      supabase.from("swipes").select("*").order("created_at", { ascending: false }),
      supabase.from("collections").select("*").order("created_at", { ascending: false }),
      supabase.from("ad_library_snapshots").select("*").order("snapshot_date", { ascending: true }),
    ]);

    if (swipeResult.error || collectionResult.error || adSnapshotResult.error) {
      console.error("Supabase sync error", swipeResult.error ?? collectionResult.error ?? adSnapshotResult.error);
      showToast("Não foi possível carregar seus dados do Supabase.");
      return;
    }

    const remoteCollections = ((collectionResult.data ?? []) as CollectionRow[]).map(collectionFromRow);
    const remoteSnapshots = (adSnapshotResult.data ?? []) as AdLibrarySnapshotRow[];
    const remoteSwipes = ((swipeResult.data ?? []) as SwipeRow[]).map((swipe) => swipeFromRow(swipe, remoteSnapshots));
    setSwipes(remoteSwipes);
    setCollections(remoteCollections);
    setFunnels([]);
    setSelectedSwipeId(null);
  }

  function syncSwipe(swipe: Swipe) {
    if (!supabase || !currentUserId) return;
    void supabase
      .from("swipes")
      .upsert(swipeToRow(swipe, currentUserId))
      .then(({ error }) => {
        if (error) {
          console.error("Swipe sync error", error);
          showToast("Não foi possível sincronizar o swipe.");
        }
      });
  }

  function removeRemoteSwipe(id: string) {
    if (!supabase || !currentUserId) return;
    void supabase
      .from("swipes")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Swipe delete error", error);
          showToast("Não foi possível remover o swipe no Supabase.");
        }
      });
  }

  function syncCollection(collection: Collection) {
    if (!supabase || !currentUserId) return;
    void supabase
      .from("collections")
      .upsert(collectionToRow(collection, currentUserId))
      .then(({ error }) => {
        if (error) {
          console.error("Collection sync error", error);
          showToast("Não foi possível sincronizar a coleção.");
        }
      });
  }

  function syncSwipeAdLibrarySnapshot(swipe: Swipe, adCount: number, source = "manual") {
    if (!supabase || !currentUserId) return;
    const snapshotDate = new Date().toISOString().slice(0, 10);
    void supabase
      .from("ad_library_snapshots")
      .upsert(
        {
          swipe_id: swipe.id,
          user_id: currentUserId,
          snapshot_date: snapshotDate,
          ad_count: adCount,
          source,
        },
        { onConflict: "swipe_id,snapshot_date" },
      )
      .then(({ error }) => {
        if (error) {
          console.error("Swipe ad library snapshot sync error", error);
          showToast("Não foi possível salvar o ponto do gráfico.");
        }
      });
  }

  useEffect(() => {
    let isMounted = true;

    function hydrateLocalState() {
      const savedVersion = window.localStorage.getItem("dtc-swipe-hub-state-version");
      const isCurrentState = savedVersion === storageVersion;
      const saved = isCurrentState ? window.localStorage.getItem("dtc-swipe-hub-state") : null;
      const auth = window.localStorage.getItem("dtc-swipe-hub-auth");
      if (!isCurrentState) {
        window.localStorage.removeItem("dtc-swipe-hub-state");
        window.localStorage.setItem("dtc-swipe-hub-state-version", storageVersion);
      }
      if (saved) {
        const parsed = JSON.parse(saved) as { swipes: Swipe[]; collections: Collection[]; funnels: Funnel[] };
        setSwipes(parsed.swipes.map((swipe) => ({ ...swipe, adLibrary: { ...emptySwipeAdLibrary(), ...(swipe.adLibrary ?? {}) } })));
        setCollections(parsed.collections);
        setFunnels(parsed.funnels);
        setSelectedSwipeId(null);
      }
      setIsAuthenticated(auth === "true");
      setIsAuthHydrated(true);
    }

    if (!supabase) {
      hydrateLocalState();
      return;
    }

    async function hydrateRemoteUser(user: User | null) {
      if (!isMounted) return;
      if (!user) {
        window.localStorage.removeItem("dtc-swipe-hub-auth");
        setCurrentUserId(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setSwipes([]);
        setCollections([]);
        setFunnels([]);
        setSelectedSwipeId(null);
        setIsAuthHydrated(true);
        return;
      }

      setCurrentUserId(user.id);
      setCurrentUser(user);
      window.localStorage.setItem("dtc-swipe-hub-auth", "true");
      await loadRemoteState(user);
      if (isMounted) {
        setIsAuthenticated(true);
        setIsAuthHydrated(true);
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => hydrateRemoteUser(data.session?.user ?? null))
      .catch(() => {
        if (isMounted) setIsAuthHydrated(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateRemoteUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
    // loadRemoteState is intentionally called only during auth bootstrapping/listener events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dtc-swipe-hub-state-version", storageVersion);
    window.localStorage.setItem("dtc-swipe-hub-state", JSON.stringify({ swipes, collections, funnels }));
  }, [swipes, collections, funnels]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    const next = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, "", next);
  }, [query, filters]);

  const selectedSwipe = selectedSwipeId ? swipes.find((swipe) => swipe.id === selectedSwipeId) : undefined;

  const filteredSwipes = useMemo(() => {
    const sectionType = visibleLibrarySections.includes(activeSection) ? activeSection : "";
    return swipes.filter((swipe) => {
      const haystack = [
        swipe.title,
        swipe.product,
        swipe.brand,
        swipe.url,
        swipe.niche,
        swipe.subniche,
        swipe.geo,
        swipe.language,
        swipe.trafficSource,
        swipe.platform,
        swipe.notes,
        swipe.analysis.hook,
        swipe.analysis.bigIdea,
        swipe.analysis.promise,
        swipe.analysis.uniqueMechanism,
        swipe.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const filledAnalysis = Object.values(swipe.analysis).some(Boolean);
      return (
        (!query || haystack.includes(query.toLowerCase())) &&
        (!sectionType || swipe.type === sectionType) &&
        (activeSection !== "favorites" || swipe.isFavorite) &&
        (!filters.type || swipe.type === filters.type) &&
        (!filters.niche || swipe.niche === filters.niche) &&
        (!filters.geo || swipe.geo === filters.geo) &&
        (!filters.language || swipe.language === filters.language) &&
        (!filters.trafficSource || swipe.trafficSource === filters.trafficSource) &&
        (!filters.status || swipe.status === filters.status) &&
        (!filters.rating || swipe.rating >= Number(filters.rating)) &&
        (!filters.favorites || swipe.isFavorite) &&
        (!filters.hasScreenshot || Boolean(swipe.screenshotUrl)) &&
        (!filters.hasAnalysis || filledAnalysis)
      );
    });
  }, [activeSection, filters, query, swipes]);

  const stats = useMemo(() => {
    const byType = (type: SwipeType) => swipes.filter((swipe) => swipe.type === type).length;
    return [
      { label: "Total", value: swipes.length, icon: Boxes, tone: "from-blue-500 to-cyan-400", section: "dashboard" },
      { label: "Páginas de Venda", value: byType("Pagina de Venda"), icon: BookOpen, tone: "from-sky-500 to-blue-400", section: "Pagina de Venda" },
      { label: "Quizzes", value: byType("Quiz"), icon: Gauge, tone: "from-emerald-500 to-teal-400", section: "Quiz" },
      { label: "Criativos", value: byType("Criativo"), icon: ImagePlus, tone: "from-amber-500 to-orange-400", section: "Criativo" },
      { label: "Advertorials", value: byType("Advertorial"), icon: FileText, tone: "from-violet-500 to-fuchsia-400", section: "Advertorial" },
      { label: "Coleções", value: collections.length, icon: Folder, tone: "from-indigo-500 to-violet-400", section: "collections" },
    ];
  }, [collections.length, swipes]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function upsertSwipe(next: Swipe, options?: { silent?: boolean }) {
    const updated = { ...next, updatedAt: new Date().toISOString() };
    setSwipes((current) => current.map((swipe) => (swipe.id === updated.id ? updated : swipe)));
    syncSwipe(updated);
    const latest = updated.adLibrary.snapshots.at(-1);
    if (latest) syncSwipeAdLibrarySnapshot(updated, latest.adCount, latest.source);
    if (!options?.silent) showToast("Análise atualizada.");
  }

  function createSwipe(swipe: Swipe) {
    setSwipes((current) => [swipe, ...current]);
    setSelectedSwipeId(swipe.id);
    setAddOpen(false);
    syncSwipe(swipe);
    showToast("Swipe salvo com sucesso.");
  }

  function toggleFavorite(id: string) {
    setSwipes((current) => {
      let changed: Swipe | null = null;
      const next = current.map((swipe) => {
        if (swipe.id !== id) return swipe;
        changed = { ...swipe, isFavorite: !swipe.isFavorite, updatedAt: new Date().toISOString() };
        return changed;
      });
      if (changed) syncSwipe(changed);
      return next;
    });
  }

  function deleteSwipe(id: string) {
    if (!window.confirm("Excluir este swipe? Esta ação não pode ser desfeita.")) return;
    setSwipes((current) => current.filter((swipe) => swipe.id !== id));
    removeRemoteSwipe(id);
    setSelectedSwipeId(null);
    showToast("Swipe excluído.");
  }

  if (!isAuthHydrated) {
    return (
      <main className="app-gradient flex min-h-screen items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-lg border border-[#1a2d55] bg-[#081327] px-5 py-4 text-sm text-slate-200 shadow-[0_0_40px_rgba(37,99,255,0.12)]">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
          Restaurando sua sessão...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={() => {
          window.localStorage.setItem("dtc-swipe-hub-auth", "true");
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="app-gradient min-h-screen text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelect={(section) => {
          setActiveSection(section);
          setSelectedSwipeId(null);
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={currentUser}
        onLogout={() => {
          window.localStorage.removeItem("dtc-swipe-hub-auth");
          void supabase?.auth.signOut();
          setCurrentUserId(null);
          setCurrentUser(null);
          setSwipes([]);
          setCollections([]);
          setFunnels([]);
          setSelectedSwipeId(null);
          setIsAuthenticated(false);
        }}
      />
      <main className="min-h-screen lg:pl-[232px]">
        <TopBar
          query={query}
          setQuery={setQuery}
          mode={mode}
          setMode={setMode}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onAdd={() => setAddOpen(true)}
          onFunnel={() => setActiveSection("collections")}
          onMenu={() => setSidebarOpen(true)}
        />
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 2xl:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6"
            >
              {activeSection === "dashboard" && (
                <Dashboard
                  stats={stats}
                  swipes={swipes}
                  onAdd={() => setAddOpen(true)}
                  onFunnel={() => setActiveSection("collections")}
                  onSelectSwipe={(id) => {
                    const swipe = swipes.find((item) => item.id === id);
                    setSelectedSwipeId(id);
                    setActiveSection(swipe && visibleLibrarySections.includes(swipe.type) ? swipe.type : "Pagina de Venda");
                  }}
                  onFavorite={toggleFavorite}
                  onDelete={deleteSwipe}
                  onSection={(section) => {
                    setSelectedSwipeId(null);
                    setActiveSection(section);
                  }}
                />
              )}

              {visibleLibrarySections.includes(activeSection) && (
                <LibraryView
                  title={sectionTitle(activeSection)}
                  description={sectionDescription(activeSection)}
                  swipes={filteredSwipes}
                  total={filteredSwipes.length}
                  viewMode={viewMode}
                  filters={filters}
                  setFilters={setFilters}
                  selectedSwipeId={selectedSwipe?.id}
                  onSelectSwipe={setSelectedSwipeId}
                  onFavorite={toggleFavorite}
                  onDelete={deleteSwipe}
                  onAdd={() => setAddOpen(true)}
                />
              )}

              {activeSection === "collections" && (
                <CollectionsView collections={collections} swipes={swipes} onCreate={() => setCollectionOpen(true)} />
              )}

              {selectedSwipe && visibleLibrarySections.includes(activeSection) && (
                <SwipeDetail
                  key={`${selectedSwipe.id}-${mode}`}
                  swipe={selectedSwipe}
                  swipes={swipes}
                  onSave={upsertSwipe}
                  onFavorite={toggleFavorite}
                  onDelete={deleteSwipe}
                  mode={mode}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <AddSwipeModal open={addOpen} onClose={() => setAddOpen(false)} onSave={createSwipe} />
      <CollectionModal
        open={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        swipes={swipes}
        onSave={(collection) => {
          setCollections((current) => [collection, ...current]);
          setCollectionOpen(false);
          syncCollection(collection);
          showToast("Coleção criada.");
        }}
      />
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="fixed bottom-5 right-5 z-50 rounded-lg border border-white/10 bg-[#1c2230] px-4 py-3 text-sm shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  function authErrorMessage(message: string) {
    const normalized = message.toLowerCase();
    if (normalized.includes("invalid")) {
      return "Use um e-mail real e válido. O Supabase pode recusar domínios falsos ou sem validação.";
    }
    if (normalized.includes("rate limit")) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    }
    if (normalized.includes("already registered") || normalized.includes("already exists")) {
      return "Esse e-mail já tem conta. Use a aba Entrar para acessar.";
    }
    if (normalized.includes("invalid login credentials")) {
      return "E-mail ou senha incorretos.";
    }
    return message;
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");

    if (!isSupabaseConfigured || !supabase) {
      onLogin();
      return;
    }

    setAuthLoading(true);
    try {
      const result =
        authMode === "signup"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        const message = authErrorMessage(result.error.message);
        setAuthMessage(
          authMode === "signup" && result.error.message.toLowerCase().includes("rate limit")
            ? `${message} Para remover esse limite, configure SUPABASE_SERVICE_ROLE_KEY no servidor.`
            : message,
        );
        return;
      }

      if (authMode === "signup" && !result.data.session) {
        setAuthMessage("Conta criada. Verifique seu e-mail para confirmar o acesso.");
        return;
      }

      onLogin();
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <main className="app-gradient grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between overflow-hidden border-r border-white/10 p-8 lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">DTC Swipe Hub</span>
        </div>
        <div className="max-w-3xl py-16">
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Centralize seus melhores swipes DTC em um só lugar
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Organize advertorials, quizzes, páginas de venda, criativos, bibliotecas de anúncios e funis completos com análise estratégica.
          </p>
          <div className="mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
            {["Captura por URL", "Copy analysis", "Nichos organizados"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
                <Check className="mb-3 h-4 w-4 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">MVP local com estrutura pronta para Supabase Auth, RLS e Storage.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form className="w-full max-w-md rounded-xl border border-white/10 bg-[#111827]/90 p-6 shadow-2xl" onSubmit={handleAuth}>
          <h2 className="text-2xl font-semibold text-white">{authMode === "signin" ? "Entrar" : "Criar conta"}</h2>
          <p className="mt-2 text-sm text-slate-400">
            {isSupabaseConfigured
              ? "Acesse sua biblioteca com Supabase Auth."
              : "Modo demo local ativo enquanto as variáveis do Supabase não estão configuradas."}
          </p>
          <div className="mt-5 grid grid-cols-2 rounded-lg border border-[#1a2d55] bg-[#050b1d] p-1">
            <button
              type="button"
              aria-label="Alternar para entrar"
              onClick={() => {
                setAuthMode("signin");
                setAuthMessage("");
              }}
              className={cn("h-9 rounded-md text-sm font-semibold transition", authMode === "signin" ? "bg-[#2563ff] text-white" : "text-slate-400 hover:text-white")}
            >
              Entrar
            </button>
            <button
              type="button"
              aria-label="Alternar para criar conta"
              onClick={() => {
                setAuthMode("signup");
                setAuthMessage("");
              }}
              className={cn("h-9 rounded-md text-sm font-semibold transition", authMode === "signup" ? "bg-[#2563ff] text-white" : "text-slate-400 hover:text-white")}
            >
              Criar conta
            </button>
          </div>
          <label className="mt-6 block text-sm text-slate-300">
            E-mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@gmail.com"
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0b0f17] px-3 text-sm outline-none ring-blue-500/0 transition focus:ring-2"
            />
            {authMode === "signup" && (
              <span className="mt-1 block text-xs text-slate-500">Use um e-mail real. Domínios falsos podem ser recusados pelo Supabase.</span>
            )}
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Senha
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0b0f17] px-3 text-sm outline-none ring-blue-500/0 transition focus:ring-2"
            />
          </label>
          <button
            disabled={authLoading}
            aria-label={authMode === "signin" ? "Entrar no Hub" : "Criar minha conta"}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {authLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {authMode === "signin" ? "Entrar no Hub" : "Criar minha conta"}
          </button>
          <div
            className={cn(
              "mt-5 rounded-lg border p-3 text-xs leading-5",
              isSupabaseConfigured
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "border-amber-400/25 bg-amber-400/10 text-amber-100",
            )}
          >
            {authMessage ||
              (isSupabaseConfigured
                ? "Supabase Auth conectado. Você pode entrar ou criar conta."
                : "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar cadastro real.")}
          </div>
        </form>
      </section>
    </main>
  );
}

function Sidebar({
  activeSection,
  onSelect,
  open,
  onClose,
  user,
  onLogout,
}: {
  activeSection: string;
  onSelect: (section: string) => void;
  open: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}) {
  const userEmail = user?.email ?? "conta conectada";
  const userName = user?.user_metadata?.name ?? userEmail.split("@")[0] ?? "Usuário";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";

  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-black/60 lg:hidden", open ? "block" : "hidden")} onClick={onClose} />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col border-r border-[#1a2d55] bg-[#050b1d]/95 shadow-[0_0_80px_rgba(37,99,255,0.08)] backdrop-blur-xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">DTC Swipe Hub</p>
              <p className="text-xs text-slate-500">Swipe file premium</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={onClose} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white",
                  active && "bg-gradient-to-r from-blue-500/20 to-violet-500/10 text-white ring-1 ring-white/10",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-[#16243a] p-4">
          <div className="rounded-lg border border-[#16243a] bg-[#07111f] p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Crown className="h-4 w-4 text-[#facc15]" />
              Plano Pro
            </div>
            <p className="mt-2 text-xs text-slate-400">Renova em 23 dias</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[34%] rounded-full bg-gradient-to-r from-[#1769ff] to-[#6d35ff]" />
            </div>
            <p className="mt-2 text-right text-xs text-slate-400">68 / 100K swipes</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-sm font-semibold">{userInitial}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-slate-500">{userEmail}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <IconButton label="Idioma" icon={Languages} />
            <IconButton label="Tema" icon={Moon} />
            <IconButton label="Sair" icon={LogOut} onClick={onLogout} />
          </div>
        </div>
      </aside>
    </>
  );
}

function TopBar({
  query,
  setQuery,
  mode,
  setMode,
  viewMode,
  setViewMode,
  onAdd,
  onFunnel,
  onMenu,
}: {
  query: string;
  setQuery: (value: string) => void;
  mode: "informacoes" | "metricas";
  setMode: (value: "informacoes" | "metricas") => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  onAdd: () => void;
  onFunnel: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#1a2d55] bg-[#030716]/88 shadow-[0_12px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="flex h-[72px] w-full items-center gap-3 px-4 sm:px-6 lg:px-8 2xl:px-10">
        <button className="rounded-lg border border-white/10 p-2 lg:hidden" onClick={onMenu} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative min-w-0 flex-1 xl:max-w-[520px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar páginas, quizzes, criativos, advertorials..."
            className="h-11 w-full rounded-lg border border-[#1a2d55] bg-[#081327] pl-10 pr-14 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#2563ff]/70 focus:shadow-[0_0_0_3px_rgba(37,99,255,0.22)]"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 hidden h-6 -translate-y-1/2 items-center rounded-md bg-white/[0.04] px-2 text-[11px] text-slate-400 sm:flex">
            Ctrl K
          </span>
        </div>
        <div className="hidden">
          <button
            className={cn("h-8 rounded-md px-3 text-xs", mode === "informacoes" && "bg-white/10 text-white")}
            onClick={() => setMode("informacoes")}
          >
            Informações
          </button>
          <button
            className={cn("h-8 rounded-md px-3 text-xs", mode === "metricas" && "bg-white/10 text-white")}
            onClick={() => setMode("metricas")}
          >
            Métricas
          </button>
        </div>
        <div className="hidden gap-1 rounded-lg border border-[#1a2d55] bg-[#081327] p-1 sm:flex">
          {[
            ["grid", Grid3X3],
            ["lista", List],
            ["kanban", KanbanSquare],
          ].map(([id, Icon]) => (
            <button
              key={id as string}
              onClick={() => setViewMode(id as ViewMode)}
              className={cn("rounded-md p-2.5 text-slate-400 hover:text-white", viewMode === id && "bg-white/10 text-white")}
              aria-label={`Visualizar em ${id}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <button
          onClick={onFunnel}
          className="hidden h-11 items-center gap-2 rounded-lg border border-[#1a2d55] bg-[#081327] px-4 text-sm font-medium text-white hover:border-[#8b5cff]/60 hover:bg-[#0b1730] md:flex"
        >
          <Link2 className="h-4 w-4" />
          Importar Link
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
        <button
          onClick={onAdd}
          className="flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#2563ff] to-[#6d3bff] px-4 text-sm font-semibold text-white shadow-[0_0_34px_rgba(109,59,255,0.32)]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Adicionar Swipe</span>
        </button>
        <button className="relative hidden h-11 w-11 items-center justify-center rounded-lg border border-[#1a2d55] bg-[#081327] text-slate-300 hover:border-[#8b5cff]/60 hover:text-white md:flex" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-2 -top-2 rounded-full bg-[#5048ff] px-1.5 py-0.5 text-[10px] font-bold text-white">12</span>
        </button>
      </div>
    </header>
  );
}

function Dashboard({
  stats,
  swipes,
  onAdd,
  onFunnel,
  onSelectSwipe,
  onFavorite,
  onDelete,
  onSection,
}: {
  stats: Array<{ label: string; value: number; icon: typeof Boxes; tone: string; section: string }>;
  swipes: Swipe[];
  onAdd: () => void;
  onFunnel: () => void;
  onSelectSwipe: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onSection: (section: string) => void;
}) {
  const recent = [...swipes].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-[rgba(139,92,255,0.35)] bg-[#081327]/88 shadow-[0_0_40px_rgba(109,59,255,0.25),0_0_80px_rgba(37,99,255,0.18)]">
        <div className="grid min-h-[288px] gap-6 bg-[radial-gradient(circle_at_70%_20%,rgba(109,59,255,0.28),transparent_35%),radial-gradient(circle_at_45%_90%,rgba(37,99,255,0.22),transparent_40%),linear-gradient(135deg,#030716_0%,#050B1D_45%,#090B2A_100%)] p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-9">
          <div className="max-w-3xl">
            <h1 className="max-w-2xl text-[30px] font-semibold leading-[1.18] text-white sm:text-[36px]">
              Centralize seus melhores swipes DTC em um só lugar
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-normal leading-7 text-slate-300 sm:text-[15px]">
              Organize advertorials, quizzes, páginas de venda, criativos, bibliotecas de anúncios e funis completos com análise estratégica.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={onAdd} className="h-11 rounded-lg bg-gradient-to-r from-[#2563ff] to-[#6d3bff] px-4 text-sm font-semibold shadow-[0_0_36px_rgba(109,59,255,0.28)]">
                Começar agora
              </button>
              <button onClick={onFunnel} className="h-11 rounded-lg border border-[#1a2d55] bg-[#081327]/70 px-4 text-sm text-slate-200 hover:border-[#8b5cff]/50 hover:bg-[#0b1730]">
                Organizar nichos
              </button>
            </div>
          </div>
          <div className="relative hidden min-h-56 overflow-visible lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mockups/hero-dashboard-clean.png" alt="" className="absolute -inset-x-10 -inset-y-8 h-[calc(100%+72px)] w-[calc(100%+80px)] object-contain object-center opacity-100 drop-shadow-[0_0_46px_rgba(109,59,255,0.36)]" />
          </div>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={() => onSection(stat.section)}
              className="rounded-lg border border-[rgba(139,92,255,0.24)] bg-[#081327] p-4 text-left shadow-[0_14px_42px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-[rgba(139,92,255,0.55)] hover:shadow-[0_0_34px_rgba(109,59,255,0.18)]"
            >
              <div className={cn("mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br", stat.tone)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{stat.value === 0 ? "Conta nova" : "Atualizado"}</p>
            </button>
          );
        })}
      </div>
      <DashboardFilterToolbar />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_248px] 2xl:grid-cols-[minmax(0,1fr)_272px]">
        <Panel title="Adicionados recentemente" action="Ver páginas" onAction={() => onSection("Pagina de Venda")}>
          {recent.length > 0 ? (
            <SwipeGrid swipes={recent} onSelect={onSelectSwipe} onFavorite={onFavorite} onDelete={onDelete} compact />
          ) : (
            <DashboardEmptyLibrary onAdd={onAdd} />
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Nichos principais">
            <TopNichesList swipes={swipes} />
          </Panel>
          <Panel title="Coleções por Nicho" action="Ver coleções" onAction={() => onSection("collections")}>
            <CollectionNicheSummary swipes={swipes} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DashboardFilterToolbar() {
  const items = [
    ["Todos", null],
    ["Tipo", ChevronDown],
    ["Categoria", ChevronDown],
    ["GEO", ChevronDown],
    ["Fonte de Tráfego", ChevronDown],
    ["Status", ChevronDown],
    ["Data adicionada", Calendar],
    ["Filtros", SlidersHorizontal],
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(([label, Icon], index) => (
        <button
          key={label}
          className={cn(
            "flex h-10 items-center gap-2 rounded-lg border border-[#1a2d55] bg-[#081327] px-3 text-sm text-slate-200 hover:border-[#8b5cff]/60 hover:bg-[#0b1730] hover:text-white",
            index === 0 && "border-[#2563ff] bg-[#2563ff]/18 text-white shadow-[0_0_22px_rgba(37,99,255,0.24)]",
          )}
        >
          {label}
          {Icon && <Icon className="h-4 w-4 text-slate-500" />}
        </button>
      ))}
      <button className="ml-auto h-10 px-2 text-sm font-medium text-[#4d91ff] hover:text-white">Limpar</button>
    </div>
  );
}

function DashboardEmptyLibrary({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-[#1a2d55] bg-[#050b1d]/58 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#8b5cff]/35 bg-[#2563ff]/15 text-[#8b5cff] shadow-[0_0_28px_rgba(109,59,255,0.18)]">
        <Plus className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">Nenhum swipe adicionado ainda.</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        Comece colando uma URL de advertorial, quiz, pagina de vendas ou biblioteca de anuncios.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 rounded-lg bg-gradient-to-r from-[#2563ff] to-[#6d3bff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(109,59,255,0.24)]"
      >
        Adicionar Swipe
      </button>
    </div>
  );
}

function TopNichesList({ swipes }: { swipes: Swipe[] }) {
  const topNiches = countBy(swipes, "niche").slice(0, 5);

  if (topNiches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#1a2d55] bg-[#050b1d]/60 px-4 py-6 text-center">
        <p className="text-sm font-medium text-white">Nenhum nicho ainda.</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Os nichos aparecem quando você salvar páginas, quizzes, criativos ou advertorials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topNiches.map((item) => (
        <div key={item.label} className="flex items-center justify-between rounded-lg border border-[#1a2d55] bg-[#0b1730] px-3 py-3">
          <p className="text-sm text-white">{item.label}</p>
          <p className="text-sm text-slate-500">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function CollectionNicheSummary({ swipes }: { swipes: Swipe[] }) {
  const uniqueNiches = new Set(swipes.map((swipe) => swipe.niche).filter(Boolean)).size;
  return (
    <div className="rounded-lg border border-[#1a2d55] bg-[#0b1730] p-4">
      <p className="text-xs text-slate-400">Use coleções para separar sua biblioteca por nichos.</p>
      <p className="mt-3 text-3xl font-semibold text-white">{uniqueNiches}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{uniqueNiches === 1 ? "nicho mapeado" : "nichos mapeados"}</p>
    </div>
  );
}
function LibraryView({
  title,
  description,
  swipes,
  total,
  viewMode,
  filters,
  setFilters,
  selectedSwipeId,
  onSelectSwipe,
  onFavorite,
  onDelete,
  onAdd,
}: {
  title: string;
  description: string;
  swipes: Swipe[];
  total: number;
  viewMode: ViewMode;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  selectedSwipeId?: string;
  onSelectSwipe: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <p className="text-sm text-slate-400">{total} itens encontrados</p>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} />
      {swipes.length === 0 ? (
        <EmptyState onAdd={onAdd} />
      ) : viewMode === "lista" ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
          {swipes.map((swipe) => (
            <ListRow key={swipe.id} swipe={swipe} onSelect={onSelectSwipe} onFavorite={onFavorite} onDelete={onDelete} />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanView swipes={swipes} onSelect={onSelectSwipe} />
      ) : (
        <SwipeGrid
          swipes={swipes}
          selectedSwipeId={selectedSwipeId}
          onSelect={onSelectSwipe}
          onFavorite={onFavorite}
          onDelete={onDelete}
        />
      )}
    </section>
  );
}

function FilterBar({ filters, setFilters }: { filters: Filters; setFilters: (filters: Filters) => void }) {
  const [open, setOpen] = useState(false);
  const update = (key: keyof Filters, value: string | boolean) => setFilters({ ...filters, [key]: value });
  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 text-sm font-medium text-white"
      >
        <Filter className="h-4 w-4 text-blue-300" />
        Filtros avançados
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={filters.type} onChange={(value) => update("type", value)} options={["", ...visibleSwipeTypes]} placeholder="Tipo de swipe" />
              <Select value={filters.niche} onChange={(value) => update("niche", value)} options={["", ...niches]} placeholder="Nicho" />
              <Select value={filters.geo} onChange={(value) => update("geo", value)} options={["", ...geos]} placeholder="GEO" />
              <Select value={filters.language} onChange={(value) => update("language", value)} options={["", ...languages]} placeholder="Idioma" />
              <Select
                value={filters.trafficSource}
                onChange={(value) => update("trafficSource", value)}
                options={["", ...trafficSources]}
                placeholder="Fonte"
              />
              <Select value={filters.status} onChange={(value) => update("status", value)} options={["", ...statuses]} placeholder="Status" />
              <Select value={filters.rating} onChange={(value) => update("rating", value)} options={["", "1", "2", "3", "4", "5"]} placeholder="Nota mínima" />
              <Toggle checked={filters.favorites} onChange={(value) => update("favorites", value)} label="Favoritos" />
              <Toggle checked={filters.hasScreenshot} onChange={(value) => update("hasScreenshot", value)} label="Tem screenshot" />
              <Toggle checked={filters.hasAnalysis} onChange={(value) => update("hasAnalysis", value)} label="Tem análise" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SwipeGrid({
  swipes,
  selectedSwipeId,
  onSelect,
  onFavorite,
  onDelete,
  compact = false,
}: {
  swipes: Swipe[];
  selectedSwipeId?: string;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-4", compact ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 2xl:grid-cols-4 xl:grid-cols-3")}>
      {swipes.map((swipe) => (
        <SwipeCard
          key={swipe.id}
          swipe={swipe}
          selected={selectedSwipeId === swipe.id}
          onSelect={() => onSelect(swipe.id)}
          onFavorite={() => onFavorite(swipe.id)}
          onDelete={onDelete ? () => onDelete(swipe.id) : undefined}
        />
      ))}
    </div>
  );
}

async function copySwipeUrl(url: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }
  window.prompt("Copie a URL do swipe:", url);
}

function SwipeCard({
  swipe,
  selected,
  onSelect,
  onFavorite,
  onDelete,
}: {
  swipe: Swipe;
  selected?: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onDelete?: () => void;
}) {
  const domain = getDomain(swipe.url);

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-[10px] border bg-[#081327] shadow-[0_18px_52px_rgba(0,0,0,0.26)] transition hover:-translate-y-1 hover:border-[rgba(139,92,255,0.62)] hover:shadow-[0_0_40px_rgba(109,59,255,0.25),0_0_80px_rgba(37,99,255,0.18)]",
        selected ? "border-[#8b5cff]" : "border-[#1a2d55]",
      )}
    >
      <button onClick={onSelect} className="block w-full text-left">
        <div className="relative aspect-[16/9] overflow-hidden bg-[#050b1d]">
          <SwipeMedia swipe={swipe} className="transition duration-500 group-hover:scale-105" />
          <div className="absolute left-3 top-3 flex gap-2">
            <CategoryBadge label={swipe.type} />
            <StatusBadge status={swipe.status} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#081327] to-transparent" />
        </div>
        <div className="space-y-2.5 p-3.5">
          <div>
            <h3 className="line-clamp-2 min-h-10 text-[13px] font-semibold leading-5 text-white">{swipe.title}</h3>
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{domain}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <MetaChip label={swipe.geo} />
            <MetaChip label={swipe.trafficSource.replace(" Ads", "")} />
            <MetaChip label={swipe.niche} />
          </div>
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <RatingStars rating={swipe.rating} />
            <span>{formatDate(swipe.createdAt)}</span>
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-[#1a2d55]/80 bg-[#0b1730]/72 px-3 py-2">
        <div className="flex gap-1">
          <IconButton label="Ver análise" icon={Eye} onClick={onSelect} />
          <IconButton label="Editar" icon={PenLine} onClick={onSelect} />
          <IconButton label="Copiar URL" icon={Copy} onClick={() => void copySwipeUrl(swipe.url)} />
          <a className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white" href={swipe.url} target="_blank" rel="noreferrer" title="Abrir link">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div className="flex gap-1">
          <IconButton label="Favoritar" icon={Heart} active={swipe.isFavorite} onClick={onFavorite} />
          {onDelete && <IconButton label="Excluir" icon={Trash2} onClick={onDelete} />}
        </div>
      </div>
    </article>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#1a2d55] bg-[#050b1d]/72 px-2 py-1 text-[10px] font-medium text-slate-300">
      {label}
    </span>
  );
}
function SwipeDetail({
  swipe,
  swipes,
  onSave,
  onFavorite,
  onDelete,
  mode,
}: {
  swipe: Swipe;
  swipes: Swipe[];
  onSave: (swipe: Swipe, options?: { silent?: boolean }) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  mode: "informacoes" | "metricas";
}) {
  const [draft, setDraft] = useState(swipe);
  const [tab, setTab] = useState<"resumo" | "copy" | "metricas" | "funil">(mode === "metricas" ? "metricas" : "resumo");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const draftRef = useRef(swipe);
  const savedFingerprintRef = useRef(JSON.stringify(swipe));
  const saveTimerRef = useRef<number | undefined>(undefined);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const flushDraft = useCallback((value = draftRef.current) => {
    const fingerprint = JSON.stringify(value);
    if (fingerprint === savedFingerprintRef.current) return;

    const persisted = { ...value, updatedAt: new Date().toISOString() };
    savedFingerprintRef.current = JSON.stringify(persisted);
    draftRef.current = persisted;
    onSaveRef.current(persisted, { silent: true });
  }, []);

  useEffect(() => {
    draftRef.current = draft;
    const fingerprint = JSON.stringify(draft);
    if (fingerprint === savedFingerprintRef.current) return;

    setSaveState("saving");
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      flushDraft(draft);
      setSaveState("saved");
    }, 700);

    return () => window.clearTimeout(saveTimerRef.current);
  }, [draft, flushDraft]);

  useEffect(() => {
    const saveBeforeExit = () => flushDraft();
    window.addEventListener("pagehide", saveBeforeExit);

    return () => {
      window.clearTimeout(saveTimerRef.current);
      flushDraft();
      window.removeEventListener("pagehide", saveBeforeExit);
    };
  }, [flushDraft]);

  const relatedSteps = ["Anúncio", "Advertorial", "Quiz", "Página de vendas", "Checkout", "Upsell"];
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
      <div className="grid gap-0 lg:grid-cols-[420px_1fr]">
        <div className="border-b border-white/10 lg:border-b-0 lg:border-r">
          <div className="aspect-[16/11] bg-slate-900">
            <SwipeMedia swipe={draft} />
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-lg font-semibold text-white">{draft.title}</h2>
                <a className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-blue-300" href={draft.url} target="_blank" rel="noreferrer">
                  {draft.url}
                </a>
              </div>
              <button onClick={() => onFavorite(draft.id)} className="rounded-lg border border-white/10 p-2">
                <Heart className={cn("h-4 w-4", draft.isFavorite && "fill-rose-400 text-rose-400")} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Info label="Tipo" value={draft.type} />
              <Info label="Nicho" value={draft.niche} />
              <Info label="GEO" value={draft.geo} />
              <Info label="Idioma" value={draft.language} />
              <Info label="Fonte" value={draft.trafficSource} />
              <Info label="Status" value={draft.status} />
              <Info label="Marca" value={draft.brand} />
              <Info label="Produto" value={draft.product} />
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/[0.06]" href={draft.url} target="_blank" rel="noreferrer">
                Abrir Página
              </a>
              <span
                className={cn(
                  "px-1 py-2 text-xs",
                  saveState === "saving" ? "text-cyan-200" : saveState === "saved" ? "text-emerald-300" : "text-slate-500",
                )}
              >
                {saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo" : "Autosave ativo"}
              </span>
              <button
                onClick={() => {
                  window.clearTimeout(saveTimerRef.current);
                  savedFingerprintRef.current = JSON.stringify(draftRef.current);
                  onDelete(draft.id);
                }}
                className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-3">
            {[
              ["resumo", "Informações"],
              ["copy", "Análise de Copy"],
              ["metricas", "Métricas"],
              ["funil", "Funil"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id as typeof tab)}
                className={cn("h-9 rounded-lg px-3 text-sm text-slate-400", tab === id && "bg-white/10 text-white")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === "resumo" && (
              <div className="space-y-5">
                <div className="grid gap-4 xl:grid-cols-2">
                  <Field label="Nome da oferta" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} />
                  <Field label="Produto" value={draft.product} onChange={(value) => setDraft({ ...draft, product: value })} />
                  <Field label="Marca/anunciante" value={draft.brand} onChange={(value) => setDraft({ ...draft, brand: value })} />
                  <Field label="Preço" value={draft.price} onChange={(value) => setDraft({ ...draft, price: value })} />
                  <Field label="Subnicho" value={draft.subniche} onChange={(value) => setDraft({ ...draft, subniche: value })} />
                  <Field label="Plataforma" value={draft.platform} onChange={(value) => setDraft({ ...draft, platform: value })} />
                  <TextArea label="Observações pessoais" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} />
                  <TextArea label="Tags" value={draft.tags.join(", ")} onChange={(value) => setDraft({ ...draft, tags: splitTags(value) })} />
                </div>
                <ProductAdLibraryPanel draft={draft} setDraft={setDraft} onSave={onSave} />
              </div>
            )}
            {tab === "copy" && <CopyAnalysisForm draft={draft} setDraft={setDraft} />}
            {tab === "metricas" && <MetricsForm draft={draft} setDraft={setDraft} />}
            {tab === "funil" && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">Relacione este swipe com etapas de um funil completo.</p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {relatedSteps.map((step, index) => (
                    <div key={step} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-sm text-blue-200">{index + 1}</div>
                      <p className="text-sm font-medium text-white">{step}</p>
                      <Select value={index === 1 ? swipe.id : ""} onChange={() => undefined} options={["", ...swipes.map((item) => item.id)]} placeholder="Selecionar swipe" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductAdLibraryPanel({
  draft,
  setDraft,
  onSave,
}: {
  draft: Swipe;
  setDraft: (swipe: Swipe) => void;
  onSave: (swipe: Swipe) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const snapshots = draft.adLibrary.snapshots;
  const total = draft.adLibrary.currentAdCount;
  const chartData = snapshots.length
    ? snapshots.map((snapshot) => ({ date: snapshot.snapshotDate, ads: snapshot.adCount }))
    : [{ date: new Date().toISOString().slice(0, 10), ads: total }];

  async function syncMetaNow() {
    const url = safeUrl(draft.adLibraryUrl);
    if (!url || !url.includes("facebook.com/ads/library")) {
      setDraft({
        ...draft,
        adLibrary: {
          ...draft.adLibrary,
          scrapeStatus: "unsupported",
          scrapeError: "Cole um link público da Meta Ads Library para ativar o gráfico automático.",
        },
      });
      return;
    }

    setSyncing(true);
    let timeout: number | undefined;
    try {
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 70000);
      const response = await fetch("/api/meta-ad-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const responseText = await response.text();
      let result: {
        adCount?: number | null;
        status?: string;
        source?: string;
        pageId?: string;
        screenshotUrl?: string;
        error?: string;
      } = {};
      try {
        result = JSON.parse(responseText || "{}") as typeof result;
      } catch {
        result.error = responseText ? `A Meta retornou um erro ${response.status}: ${responseText.slice(0, 160)}` : "A Meta retornou uma resposta inválida.";
      }
      const now = new Date().toISOString();

      if (!response.ok || result.adCount == null) {
        const next = {
          ...draft,
          adLibrary: {
            ...draft.adLibrary,
            lastScrapedAt: now,
            metaPageId: result.pageId ?? draft.adLibrary.metaPageId,
            scrapeEnabled: true,
            scrapeStatus: result.status ?? "error",
            lastScreenshotUrl: result.screenshotUrl || draft.adLibrary.lastScreenshotUrl,
            scrapeError:
              result.error ??
              (responseText ? `A Meta retornou um erro ${response.status}: ${responseText.slice(0, 160)}` : `A Meta retornou erro ${response.status}.`),
          },
        };
        setDraft(next);
        onSave(next);
        return;
      }

      const next = {
        ...draft,
        adLibrary: {
          ...draft.adLibrary,
          currentAdCount: result.adCount,
          metaPageId: result.pageId ?? draft.adLibrary.metaPageId,
          scrapeEnabled: true,
          lastScrapedAt: now,
          scrapeStatus: "success",
          lastScreenshotUrl: result.screenshotUrl || draft.adLibrary.lastScreenshotUrl,
          scrapeError: "",
          snapshots: [
            ...draft.adLibrary.snapshots.filter((snapshot) => snapshot.snapshotDate !== now.slice(0, 10)),
            {
              id: createRecordId("ad-library-snapshot"),
              snapshotDate: now.slice(0, 10),
              adCount: result.adCount,
              source: result.source ?? "meta_browser",
              createdAt: now,
            },
          ],
        },
      };
      setDraft(next);
      onSave(next);
    } catch (error) {
      const now = new Date().toISOString();
      const next = {
        ...draft,
        adLibrary: {
          ...draft.adLibrary,
          lastScrapedAt: now,
          scrapeEnabled: true,
          scrapeStatus: "error",
          scrapeError: error instanceof Error && error.name === "AbortError" ? "A sincronização demorou demais. Tente novamente." : "Falha ao sincronizar com a Meta Ads Library.",
        },
      };
      setDraft(next);
      onSave(next);
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#1a2d55] bg-[#081327] p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-200">Biblioteca de anúncios do produto</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Evolução diária de anúncios</h3>
          <p className="mt-1 text-sm text-slate-400">O gráfico usa o link da Meta Ads Library cadastrado neste produto.</p>
        </div>
        <button
          onClick={syncMetaNow}
          disabled={syncing}
          className="h-10 rounded-lg border border-[#22d3ee]/30 bg-[#22d3ee]/10 px-4 text-xs font-semibold text-cyan-100 hover:bg-[#22d3ee]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing ? "Sincronizando..." : "Sincronizar Meta agora"}
        </button>
      </div>
      <Field
        label="Link da Meta Ads Library"
        value={draft.adLibraryUrl}
        onChange={(value) => setDraft({ ...draft, adLibraryUrl: value })}
        placeholder="https://www.facebook.com/ads/library/..."
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricTile label="Anúncios atuais" value={total} />
        <MetricTile label="Pontos no gráfico" value={snapshots.length} />
        <MetricTile label="Atualiza a cada" value={draft.adLibrary.scrapeEnabled ? 6 : 0} suffix="h" />
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`productAdGradient-${draft.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#2563FF" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1A2D55" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#081327", border: "1px solid #1A2D55", borderRadius: 8, color: "#fff" }} />
            <Area type="monotone" dataKey="ads" stroke="#22D3EE" strokeWidth={2} fill={`url(#productAdGradient-${draft.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
        {draft.adLibrary.lastScrapedAt && (
          <span className="rounded-full border border-[#1a2d55] bg-[#050b1d] px-2 py-1 text-slate-400">
            Último scraping: {formatDate(draft.adLibrary.lastScrapedAt)}
          </span>
        )}
        <span className="rounded-full border border-[#1a2d55] bg-[#050b1d] px-2 py-1 text-slate-400">
          Status: {draft.adLibrary.scrapeStatus || "manual"}
        </span>
      </div>
      {draft.adLibrary.scrapeError && <p className="mt-3 text-xs leading-5 text-amber-200">{draft.adLibrary.scrapeError}</p>}
      {isViewableCaptureUrl(draft.adLibrary.lastScreenshotUrl) && (
        <a className="mt-3 block text-xs text-blue-300 hover:text-blue-200" href={draft.adLibrary.lastScreenshotUrl} target="_blank" rel="noreferrer">
          Ver print da última leitura
        </a>
      )}
    </div>
  );
}

function MetricTile({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-[#1a2d55] bg-[#0b1730] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">
        {value.toLocaleString("pt-BR")}
        {suffix}
      </p>
    </div>
  );
}

function isViewableCaptureUrl(value: string) {
  return value.startsWith("/captures/") || value.startsWith("https://") || value.startsWith("http://");
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-5xl rounded-xl border border-white/10 bg-[#111827] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function CopyAnalysisForm({ draft, setDraft }: { draft: Swipe; setDraft: (swipe: Swipe) => void }) {
  const update = (key: keyof Swipe["analysis"], value: string) =>
    setDraft({ ...draft, analysis: { ...draft.analysis, [key]: value } });
  const updateFeature = (key: keyof Swipe["features"], value: boolean) =>
    setDraft({ ...draft, features: { ...draft.features, [key]: value } });
  const fields: Array<[keyof Swipe["analysis"], string]> = [
    ["headline", "Headline principal"],
    ["subheadline", "Subheadline"],
    ["lead", "Lead"],
    ["hook", "Hook"],
    ["bigIdea", "Big Idea"],
    ["promise", "Promessa"],
    ["uniqueMechanism", "Mecanismo único"],
    ["problemMechanism", "Mecanismo do problema"],
    ["solutionMechanism", "Mecanismo da solução"],
    ["proof", "Prova"],
    ["story", "História"],
    ["authority", "Autoridade"],
    ["objections", "Objeções"],
    ["offer", "Oferta"],
    ["guarantee", "Garantia"],
    ["cta", "CTA"],
    ["scarcity", "Escassez"],
    ["urgency", "Urgência"],
    ["trustElements", "Elementos de confiança"],
    ["conversionElements", "Elementos de conversão"],
    ["notes", "Observações do usuário"],
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-2">
        {fields.map(([key, label]) => (
          <TextArea key={key} label={label} value={draft.analysis[key]} onChange={(value) => update(key, value)} />
        ))}
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-white">Elementos presentes na página</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {featureLabels.map(([key, label]) => (
            <Toggle key={key} checked={draft.features[key]} onChange={(value) => updateFeature(key, value)} label={label} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricsForm({ draft, setDraft }: { draft: Swipe; setDraft: (swipe: Swipe) => void }) {
  const update = (key: keyof Swipe["metrics"], value: string) =>
    setDraft({ ...draft, metrics: { ...draft.metrics, [key]: value } });
  const fields: Array<[keyof Swipe["metrics"], string]> = [
    ["ctr", "CTR"],
    ["cpc", "CPC"],
    ["cpm", "CPM"],
    ["cpa", "CPA"],
    ["roas", "ROAS"],
    ["conversionRate", "Conversão da página"],
    ["epc", "EPC"],
    ["aov", "AOV"],
    ["estimatedRevenue", "Receita estimada"],
    ["estimatedSpend", "Spend estimado"],
    ["source", "Fonte da métrica"],
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {fields.map(([key, label]) => (
        <Field key={key} label={label} value={draft.metrics[key]} onChange={(value) => update(key, value)} />
      ))}
      <TextArea label="Observações" value={draft.metrics.notes} onChange={(value) => update("notes", value)} />
    </div>
  );
}

const maxCreativeAssetBytes = 50 * 1024 * 1024;
const maxStandardUploadBytes = 6 * 1024 * 1024;

function getCreativeMediaType(file: File) {
  if (["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) return "image" as const;
  if (file.type === "video/mp4") return "video" as const;
  return null;
}

function getCreativeMediaTypeFromUrl(value: string) {
  return /\.mp4(?:$|[?#])/i.test(value) ? ("video" as const) : ("image" as const);
}

async function uploadCreativeAsset(file: File, onProgress: (progress: number) => void) {
  const mediaType = getCreativeMediaType(file);
  if (!mediaType) throw new Error("Envie uma imagem PNG, JPG, WEBP, GIF ou um vídeo MP4.");
  if (file.size > maxCreativeAssetBytes) throw new Error("O arquivo ultrapassa o limite de 50 MB.");
  if (!supabase) throw new Error("O Supabase Storage não está configurado.");

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("Entre novamente para enviar o arquivo.");

  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || (mediaType === "video" ? "mp4" : "jpg");
  const filePath = `${session.user.id}/creatives/${createRecordId("creative")}.${extension}`;

  if (file.size <= maxStandardUploadBytes) {
    const { error } = await supabase.storage.from("swipe-screenshots").upload(filePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
  } else {
    const url = new URL(configuredSupabaseUrl);
    const storageHost = url.hostname.endsWith(".supabase.co") ? url.hostname.replace(".supabase.co", ".storage.supabase.co") : url.hostname;
    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${url.protocol}//${storageHost}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "x-upsert": "false",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: maxStandardUploadBytes,
        metadata: {
          bucketName: "swipe-screenshots",
          objectName: filePath,
          contentType: file.type,
          cacheControl: "3600",
        },
        onError: (error) => reject(error),
        onProgress: (uploaded, total) => onProgress(Math.round((uploaded / total) * 100)),
        onSuccess: () => resolve(),
      });
      void upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads[0]) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      }, reject);
    });
  }

  const { data } = supabase.storage.from("swipe-screenshots").getPublicUrl(filePath);
  return { url: data.publicUrl, mediaType, fileName: file.name };
}

function AddSwipeModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (swipe: Swipe) => void }) {
  const [form, setForm] = useState({
    url: "",
    type: "Advertorial" as SwipeType,
    title: "",
    product: "",
    brand: "",
    niche: "Diabetes",
    subniche: "",
    geo: "US",
    language: "EN",
    trafficSource: "Meta Ads",
    platform: "Meta Ads Library",
    adLibraryUrl: "",
    creativeUrl: "",
    creativeMediaType: "" as "" | "image" | "video",
    creativeFileName: "",
    screenshotUrl: "",
    tags: "",
    notes: "",
    status: "Para analisar" as SwipeStatus,
    rating: 3,
    isFavorite: false,
  });
  const [preview, setPreview] = useState<{ title?: string; description?: string; image?: string; screenshotUrl?: string; screenshotError?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetProgress, setAssetProgress] = useState(0);
  const [assetError, setAssetError] = useState("");

  if (!open) return null;

  function capturePreview() {
    const url = safeUrl(form.url);
    if (!url) {
      setPreview({ error: "URL inválida. Use http:// ou https://." });
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Falha na captura.");
        setPreview(data);
        setForm((current) => ({
          ...current,
          title: current.title || data.title || "",
          screenshotUrl: data.screenshotUrl || data.image || current.screenshotUrl,
        }));
      } catch {
        setPreview({ error: "Não foi possível capturar automaticamente. Você pode salvar mesmo assim e adicionar um screenshot manualmente." });
      }
    });
  }

  async function handleCreativeAsset(file: File | null) {
    if (!file) return;
    setAssetError("");
    setAssetProgress(0);
    setAssetUploading(true);
    try {
      const asset = await uploadCreativeAsset(file, setAssetProgress);
      setForm((current) => ({
        ...current,
        creativeUrl: asset.url,
        creativeMediaType: asset.mediaType,
        creativeFileName: asset.fileName,
        screenshotUrl: asset.mediaType === "image" ? asset.url : "",
        title: current.title || file.name.replace(/\.[^.]+$/, ""),
      }));
      setAssetProgress(100);
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Não foi possível enviar o criativo.");
    } finally {
      setAssetUploading(false);
    }
  }

  function submit() {
    const isCreative = form.type === "Criativo";
    const destinationUrl = safeUrl(form.url);
    const creativeUrl = safeUrl(form.creativeUrl);
    if (!isCreative && !destinationUrl) {
      setPreview({ error: "URL inválida. Use http:// ou https://." });
      return;
    }
    if (isCreative && !creativeUrl) {
      setAssetError("Envie um arquivo ou informe a URL pública do criativo antes de salvar.");
      return;
    }
    const url = destinationUrl || creativeUrl || "";
    const now = new Date().toISOString();
    onSave({
      id: createRecordId("swipe"),
      title: form.title || form.creativeFileName || preview?.title || "Novo Swipe",
      url,
      type: form.type,
      niche: form.niche,
      subniche: form.subniche,
      geo: form.geo,
      language: form.language,
      trafficSource: form.trafficSource,
      platform: form.platform,
      brand: form.brand,
      product: form.product,
      price: "",
      status: form.status,
      rating: Number(form.rating),
      isFavorite: form.isFavorite,
      screenshotUrl: isCreative ? form.screenshotUrl : form.screenshotUrl || preview?.screenshotUrl || preview?.image || "",
      ogTitle: preview?.title ?? "",
      ogDescription: preview?.description ?? "",
      ogImage: preview?.image ?? "",
      adLibraryUrl: form.adLibraryUrl,
      creativeUrl: form.creativeUrl,
      creativeMediaType: form.creativeMediaType || (isCreative ? getCreativeMediaTypeFromUrl(form.creativeUrl) : undefined),
      creativeFileName: form.creativeFileName || undefined,
      notes: form.notes,
      tags: splitTags(form.tags),
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      adLibrary: {
        ...emptySwipeAdLibrary(),
        scrapeEnabled: Boolean(form.adLibraryUrl.includes("facebook.com/ads/library")),
      },
      analysis: emptyAnalysis,
      features: emptyFeatures,
      metrics: emptyMetrics,
    });
  }

  return (
    <Modal title="Adicionar Novo Swipe" onClose={onClose}>
      <div className="grid max-h-[78vh] gap-5 overflow-y-auto pr-1 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Tipo de swipe" value={form.type} onChange={(value) => setForm({ ...form, type: value as SwipeType })} options={visibleSwipeTypes} />
          <Field label="Nome da oferta" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          {form.type === "Criativo" ? (
            <div className="sm:col-span-2">
              <CreativeAssetUpload uploading={assetUploading} progress={assetProgress} error={assetError} fileName={form.creativeFileName} onFile={(file) => void handleCreativeAsset(file)} />
              <Field label="URL de destino (opcional)" value={form.url} onChange={(value) => setForm({ ...form, url: value })} placeholder="https://pagina-da-oferta.com" />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <Field label="URL principal" value={form.url} onChange={(value) => setForm({ ...form, url: value })} placeholder="https://..." />
              <button
                onClick={capturePreview}
                className="mt-2 flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/[0.06]"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Capturar Screenshot
              </button>
            </div>
          )}
          <Field label="Produto" value={form.product} onChange={(value) => setForm({ ...form, product: value })} />
          <Field label="Marca/anunciante" value={form.brand} onChange={(value) => setForm({ ...form, brand: value })} />
          <SelectField label="Nicho" value={form.niche} onChange={(value) => setForm({ ...form, niche: value })} options={niches} />
          <Field label="Subnicho" value={form.subniche} onChange={(value) => setForm({ ...form, subniche: value })} />
          <SelectField label="GEO" value={form.geo} onChange={(value) => setForm({ ...form, geo: value })} options={geos} />
          <SelectField label="Idioma" value={form.language} onChange={(value) => setForm({ ...form, language: value })} options={languages} />
          <SelectField label="Fonte de tráfego" value={form.trafficSource} onChange={(value) => setForm({ ...form, trafficSource: value })} options={trafficSources} />
          <SelectField label="Plataforma de anúncio" value={form.platform} onChange={(value) => setForm({ ...form, platform: value })} options={platforms} />
          <Field label="Link da biblioteca de anúncios" value={form.adLibraryUrl} onChange={(value) => setForm({ ...form, adLibraryUrl: value })} />
          <Field label={form.type === "Criativo" ? "URL pública do criativo" : "Link do criativo"} value={form.creativeUrl} onChange={(value) => setForm({ ...form, creativeUrl: value })} />
          {form.type !== "Criativo" && <Field label="Upload manual / URL do screenshot" value={form.screenshotUrl} onChange={(value) => setForm({ ...form, screenshotUrl: value })} />}
          <Field label="Tags" value={form.tags} onChange={(value) => setForm({ ...form, tags: value })} placeholder="vsl, prova social, br" />
          <SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as SwipeStatus })} options={statuses} />
          <SelectField label="Nota" value={String(form.rating)} onChange={(value) => setForm({ ...form, rating: Number(value) })} options={["1", "2", "3", "4", "5"]} />
          <div className="sm:col-span-2">
            <TextArea label="Observações" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
          </div>
          <Toggle checked={form.isFavorite} onChange={(value) => setForm({ ...form, isFavorite: value })} label="Favorito" />
        </div>
        <div className="space-y-4">
          {form.type === "Criativo" ? (
            <CreativeAssetPreview url={form.creativeUrl} mediaType={form.creativeMediaType} fileName={form.creativeFileName} />
          ) : (
            <ScreenshotPreview preview={preview} screenshotUrl={form.screenshotUrl} />
          )}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-400">
            {form.type === "Criativo" ? "Use o arquivo original do anúncio para manter a referência fiel." : "A captura respeita páginas públicas. Se houver bloqueio do site, use a imagem Open Graph ou envie um screenshot manual."}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-3 border-t border-white/10 pt-4">
        <button onClick={onClose} className="h-10 rounded-lg border border-white/10 px-4 text-sm">
          Cancelar
        </button>
        <button onClick={submit} className="h-10 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 text-sm font-semibold">
          Salvar Swipe
        </button>
      </div>
    </Modal>
  );
}

function CreativeAssetUpload({
  uploading,
  progress,
  error,
  fileName,
  onFile,
}: {
  uploading: boolean;
  progress: number;
  error: string;
  fileName: string;
  onFile: (file: File | null) => void;
}) {
  return (
    <label className="group mb-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#22d3ee]/35 bg-[#081327] px-5 text-center transition hover:border-[#8b5cff]/65 hover:bg-[#0b1730]">
      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
      {uploading ? <Loader2 className="mb-3 h-7 w-7 animate-spin text-cyan-200" /> : <Upload className="mb-3 h-7 w-7 text-cyan-200 transition group-hover:text-violet-200" />}
      <span className="text-sm font-semibold text-white">{uploading ? `Enviando ${progress}%` : fileName || "Enviar imagem ou vídeo"}</span>
      <span className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP, GIF ou MP4 · até 50 MB</span>
      {uploading && <span className="mt-3 h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-[#050b1d]"><span className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${progress}%` }} /></span>}
      {error && <span className="mt-3 text-xs text-amber-200">{error}</span>}
    </label>
  );
}

function CreativeAssetPreview({ url, mediaType, fileName }: { url: string; mediaType: "" | "image" | "video"; fileName: string }) {
  const isVideo = mediaType === "video" || (!mediaType && /\.mp4(?:$|[?#])/i.test(url));
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0f17] p-4">
      <p className="mb-3 text-sm font-medium text-white">Arquivo do criativo</p>
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-[#111827]">
        {url ? (
          isVideo ? (
            <video src={url} className="h-full w-full object-cover" controls playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-contain" />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
            <Upload className="h-8 w-8" />
            <span className="text-center text-xs">O arquivo enviado aparece aqui.</span>
          </div>
        )}
      </div>
      {fileName && <p className="mt-3 truncate text-xs text-slate-400">{fileName}</p>}
    </div>
  );
}

function ScreenshotPreview({
  preview,
  screenshotUrl,
}: {
  preview: { title?: string; description?: string; image?: string; screenshotUrl?: string; screenshotError?: string; error?: string } | null;
  screenshotUrl: string;
}) {
  const [failedImage, setFailedImage] = useState("");
  const image = screenshotUrl || preview?.screenshotUrl || preview?.image;
  const imageFailed = Boolean(image && failedImage === image);
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0f17] p-4">
      <p className="mb-3 text-sm font-medium text-white">Preview</p>
      <div className="aspect-[16/11] overflow-hidden rounded-lg bg-[#111827]">
        {image && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" onError={() => setFailedImage(image)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
            <Upload className="h-8 w-8" />
            <span className="max-w-56 text-center text-xs">
              {imageFailed ? "A imagem retornada pelo site falhou. Envie um screenshot manual ou tente outra URL." : "Cole uma URL e capture o preview."}
            </span>
          </div>
        )}
      </div>
      {preview?.title && <p className="mt-3 text-sm font-medium text-white">{preview.title}</p>}
      {preview?.description && <p className="mt-1 line-clamp-3 text-xs text-slate-400">{preview.description}</p>}
      {preview?.screenshotError && <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">{preview.screenshotError}</p>}
      {preview?.error && <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">{preview.error}</p>}
    </div>
  );
}

function CollectionsView({ collections, swipes, onCreate }: { collections: Collection[]; swipes: Swipe[]; onCreate: () => void }) {
  const nicheSuggestions = countBy(swipes, "niche").slice(0, 6);
  return (
    <section className="space-y-4">
      <PageHeading title="Coleções por Nicho" description="Organize suas páginas de venda, quizzes, criativos e advertorials por nicho." action="Criar coleção" onAction={onCreate} />
      {nicheSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nicheSuggestions.map((item) => (
            <span key={item.label} className="rounded-full border border-[#1a2d55] bg-[#081327] px-3 py-1.5 text-xs font-medium text-slate-300">
              {item.label} · {item.value}
            </span>
          ))}
        </div>
      )}
      {collections.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#1a2d55] bg-[#081327] p-8 text-center">
          <Folder className="mx-auto mb-4 h-9 w-9 text-slate-500" />
          <h3 className="text-lg font-semibold text-white">Nenhuma coleção por nicho ainda.</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Crie coleções como Diabetes, Skincare, Emagrecimento ou Pets para separar os swipes com mais clareza.
          </p>
          <button onClick={onCreate} className="mt-5 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 text-sm font-semibold text-white">
            Criar coleção
          </button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => (
          <div key={collection.id} className="overflow-hidden rounded-lg border border-white/10 bg-[#1c2230]">
            <div className="aspect-[16/8] bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={collection.coverUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white">{collection.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{collection.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>{collection.swipeIds.length} swipes</span>
                <span>{swipes.filter((swipe) => collection.swipeIds.includes(swipe.id)).map((swipe) => swipe.niche)[0] ?? "Geral"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CollectionModal({
  open,
  onClose,
  swipes,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  swipes: Swipe[];
  onSave: (collection: Collection) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  if (!open) return null;
  return (
    <Modal title="Criar Coleção" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nome" value={name} onChange={setName} placeholder="Diabetes, Skincare, Emagrecimento..." />
        <TextArea label="Descrição" value={description} onChange={setDescription} />
        <div className="grid max-h-64 gap-2 overflow-y-auto">
          {swipes.map((swipe) => (
            <Toggle
              key={swipe.id}
              checked={selected.includes(swipe.id)}
              label={swipe.title}
              onChange={(checked) => setSelected((current) => (checked ? [...current, swipe.id] : current.filter((id) => id !== swipe.id)))}
            />
          ))}
        </div>
        <button
          onClick={() =>
            onSave({
              id: createRecordId("collection"),
              name: name || "Nova coleção",
              description,
              coverUrl: swipes.find((swipe) => selected.includes(swipe.id))?.screenshotUrl || swipes[0]?.screenshotUrl || "",
              tags: [],
              swipeIds: selected,
              createdAt: new Date().toISOString(),
            })
          }
          className="h-10 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 text-sm font-semibold"
        >
          Criar Coleção
        </button>
      </div>
    </Modal>
  );
}

function KanbanView({ swipes, onSelect }: { swipes: Swipe[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {statuses.map((status) => (
        <div key={status} className="rounded-xl border border-white/10 bg-[#111827] p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{status}</h3>
            <span className="text-xs text-slate-500">{swipes.filter((swipe) => swipe.status === status).length}</span>
          </div>
          <div className="space-y-3">
            {swipes
              .filter((swipe) => swipe.status === status)
              .map((swipe) => (
                <MiniSwipeRow key={swipe.id} swipe={swipe} onClick={() => onSelect(swipe.id)} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListRow({
  swipe,
  onSelect,
  onFavorite,
  onDelete,
}: {
  swipe: Swipe;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 border-b border-white/10 p-3 last:border-b-0 md:grid-cols-[72px_1fr_140px_120px_110px_120px] md:items-center">
      <div className="h-12 w-16 overflow-hidden rounded-md">
        <SwipeMedia swipe={swipe} />
      </div>
      <button onClick={() => onSelect(swipe.id)} className="text-left">
        <p className="text-sm font-medium text-white">{swipe.title}</p>
        <p className="text-xs text-slate-500">{swipe.url}</p>
      </button>
      <CategoryBadge label={swipe.type} />
      <span className="text-sm text-slate-300">{swipe.niche}</span>
      <span className="text-sm text-slate-300">{swipe.geo}</span>
      <div className="flex gap-1">
        <IconButton label="Favoritar" icon={Heart} active={swipe.isFavorite} onClick={() => onFavorite(swipe.id)} />
        <IconButton label="Ver" icon={Eye} onClick={() => onSelect(swipe.id)} />
        <IconButton label="Excluir" icon={Trash2} onClick={() => onDelete(swipe.id)} />
      </div>
    </div>
  );
}

function MiniSwipeRow({ swipe, onClick }: { swipe: Swipe; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left hover:bg-white/[0.06]">
      <div className="h-12 w-16 overflow-hidden rounded-md">
        <SwipeMedia swipe={swipe} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{swipe.title}</p>
        <p className="text-xs text-slate-500">{swipe.niche} · {swipe.geo}</p>
      </div>
    </button>
  );
}

function SwipeMedia({ swipe, className = "" }: { swipe: Swipe; className?: string }) {
  const image = swipe.screenshotUrl || swipe.ogImage;
  const videoUrl = swipe.type === "Criativo" && (swipe.creativeMediaType === "video" || /\.mp4(?:$|[?#])/i.test(swipe.creativeUrl)) ? swipe.creativeUrl : "";
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background:
          "radial-gradient(circle at 72% 18%, rgba(139,92,255,0.24), transparent 30%), radial-gradient(circle at 24% 82%, rgba(37,99,255,0.2), transparent 36%), linear-gradient(135deg, #030716 0%, #081327 48%, #0B1730 100%)",
      }}
    >
      <div className="absolute inset-x-5 top-5 rounded-lg border border-[#1a2d55]/70 bg-[#050b1d]/50 p-3 opacity-80 shadow-[0_0_24px_rgba(37,99,255,0.12)]">
        <div className="mb-3 h-2 w-2/3 rounded bg-[#8b5cff]/55" />
        <div className="h-1.5 w-1/2 rounded bg-white/18" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-8 rounded-md border border-[#1a2d55] bg-[#0b1730]" />
          <div className="h-8 rounded-md border border-[#1a2d55] bg-[#081327]" />
          <div className="h-8 rounded-md border border-[#1a2d55] bg-[#0b1730]" />
        </div>
      </div>
      <div className="absolute bottom-4 left-5 right-5 h-10 rounded-lg border border-[#1a2d55] bg-[#050b1d]/55" />
      {videoUrl ? (
        <video src={videoUrl} className="relative h-full w-full object-cover" muted loop autoPlay playsInline preload="metadata" />
      ) : image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="relative h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#1a2d55] bg-[#081327] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24),0_0_48px_rgba(37,99,255,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-white">{title}</h2>
        {action && (
          <button onClick={onAction} className="text-xs text-blue-300 hover:text-blue-200">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function PageHeading({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      {action && (
        <button onClick={onAction} className="h-10 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 text-sm font-semibold">
          {action}
        </button>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#111827] p-8 text-center">
      <Boxes className="mb-4 h-10 w-10 text-slate-500" />
      <h3 className="text-lg font-semibold text-white">Nenhum swipe encontrado.</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400">Comece adicionando seu primeiro link de referência.</p>
      <button onClick={onAdd} className="mt-5 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 text-sm font-semibold">
        Adicionar Swipe
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#0b0f17] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/50"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm text-slate-300 xl:col-span-1">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#0b0f17] px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/50"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <Select value={value} onChange={onChange} options={options} />
    </label>
  );
}

function Select({ value, onChange, options, placeholder = "Selecionar" }: { value: string; onChange: (value: string) => void; options: readonly string[]; placeholder?: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full appearance-none rounded-lg border border-white/10 bg-[#0b0f17] px-3 pr-8 text-sm text-white outline-none focus:border-blue-400/50"
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option || placeholder}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg border px-3 text-left text-sm transition",
        checked ? "border-blue-400/40 bg-blue-500/15 text-blue-100" : "border-white/10 bg-[#0b0f17] text-slate-300 hover:bg-white/[0.04]",
      )}
      type="button"
    >
      <span className={cn("flex h-4 w-4 items-center justify-center rounded border", checked ? "border-blue-300 bg-blue-400" : "border-slate-600")}>
        {checked && <Check className="h-3 w-3 text-white" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Heart;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn("rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white", active && "text-rose-400")}
    >
      <Icon className={cn("h-4 w-4", active && label === "Favoritar" && "fill-current")} />
    </button>
  );
}

function StatusBadge({ status }: { status: SwipeStatus }) {
  const tone = {
    Ativo: "border-emerald-300/20 bg-emerald-400/15 text-emerald-100",
    Arquivado: "border-slate-300/20 bg-slate-400/15 text-slate-100",
    Quebrado: "border-rose-300/20 bg-rose-400/15 text-rose-100",
    "Para analisar": "border-amber-300/20 bg-amber-400/15 text-amber-100",
  }[status];
  return <span className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold uppercase backdrop-blur", tone)}>{status}</span>;
}

function CategoryBadge({ label }: { label: string }) {
  return <span className="rounded-full border border-[#8b5cff]/35 bg-[#2563ff]/28 px-2 py-1 text-[10px] font-semibold uppercase text-blue-50 backdrop-blur">{label}</span>;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={cn("h-3.5 w-3.5", index < rating ? "fill-amber-300 text-amber-300" : "text-slate-600")} />
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 truncate text-slate-200">{value || "-"}</p>
    </div>
  );
}

function countBy<T extends Record<string, unknown>>(items: T[], key: keyof T) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const label = String(item[key]);
    map.set(label, (map.get(label) ?? 0) + 1);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function sectionTitle(section: string) {
  const map: Record<string, string> = {
    "Pagina de Venda": "Páginas de Venda",
    Quiz: "Quizzes",
    Criativo: "Criativos",
    Advertorial: "Advertorials",
  };
  return map[section] ?? section;
}

function sectionDescription(section: string) {
  const map: Record<string, string> = {
    "Pagina de Venda": "Páginas de venda organizadas por nicho, GEO, fonte e status.",
    Quiz: "Quizzes de pré-venda e segmentação para estudar estrutura, promessa e CTA.",
    Criativo: "Criativos salvos para analisar hook, ângulo, plataforma e oferta.",
    Advertorial: "Advertorials para mapear lead, mecanismo, prova e transição de venda.",
  };
  return map[section] ?? `Referências categorizadas como ${section}, com busca, filtros e ordenação.`;
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0] || "dominio salvo";
  }
}


