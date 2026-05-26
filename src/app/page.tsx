"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Database,
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
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tags,
  Trash2,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  emptyAnalysis,
  emptyFeatures,
  emptyMetrics,
  geos,
  niches,
  swipeTypes,
  trafficSources,
} from "@/lib/mock-data";
import type { Collection, Funnel, Swipe, SwipeStatus, SwipeType, ViewMode } from "@/lib/types";
import { cn, formatDate, safeUrl, uid } from "@/lib/utils";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "swipes", label: "Swipes", icon: Boxes },
  { id: "Advertorial", label: "Advertorials", icon: FileText },
  { id: "Quiz", label: "Quizzes", icon: Gauge },
  { id: "Pagina de Venda", label: "Páginas de Venda", icon: BookOpen },
  { id: "Landing Page", label: "Landing Pages", icon: LayoutDashboard },
  { id: "Criativo", label: "Criativos", icon: ImagePlus },
  { id: "Biblioteca de Anuncios", label: "Bibliotecas de Anúncios", icon: Database },
  { id: "funnels", label: "Funis", icon: Workflow },
  { id: "collections", label: "Coleções", icon: Folder },
  { id: "favorites", label: "Favoritos", icon: Heart },
  { id: "tags", label: "Tags", icon: Tags },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "settings", label: "Configurações", icon: Settings },
];

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

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [funnelOpen, setFunnelOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
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
      queueMicrotask(() => {
        setSwipes(parsed.swipes);
        setCollections(parsed.collections);
        setFunnels(parsed.funnels);
        setSelectedSwipeId(parsed.swipes[0]?.id ?? null);
      });
    }
    queueMicrotask(() => setIsAuthenticated(auth === "true"));
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

  const selectedSwipe = swipes.find((swipe) => swipe.id === selectedSwipeId) ?? swipes[0];

  const filteredSwipes = useMemo(() => {
    const sectionType = swipeTypes.includes(activeSection as SwipeType) ? activeSection : "";
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
      { label: "Total de Swipes", value: swipes.length, icon: Boxes, tone: "from-blue-500 to-cyan-400" },
      { label: "Advertorials", value: byType("Advertorial"), icon: FileText, tone: "from-violet-500 to-fuchsia-400" },
      { label: "Quizzes", value: byType("Quiz"), icon: Gauge, tone: "from-emerald-500 to-teal-400" },
      { label: "Páginas de Venda", value: byType("Pagina de Venda"), icon: BookOpen, tone: "from-sky-500 to-blue-400" },
      { label: "Criativos", value: byType("Criativo"), icon: ImagePlus, tone: "from-amber-500 to-orange-400" },
      { label: "Funis", value: funnels.length, icon: Workflow, tone: "from-indigo-500 to-violet-400" },
      { label: "Favoritos", value: swipes.filter((swipe) => swipe.isFavorite).length, icon: Heart, tone: "from-rose-500 to-pink-400" },
    ];
  }, [funnels.length, swipes]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function upsertSwipe(next: Swipe) {
    setSwipes((current) => current.map((swipe) => (swipe.id === next.id ? next : swipe)));
    showToast("Análise atualizada.");
  }

  function createSwipe(swipe: Swipe) {
    setSwipes((current) => [swipe, ...current]);
    setSelectedSwipeId(swipe.id);
    setAddOpen(false);
    showToast("Swipe salvo com sucesso.");
  }

  function toggleFavorite(id: string) {
    setSwipes((current) =>
      current.map((swipe) => (swipe.id === id ? { ...swipe, isFavorite: !swipe.isFavorite } : swipe)),
    );
  }

  function deleteSwipe(id: string) {
    if (!window.confirm("Excluir este swipe? Esta ação não pode ser desfeita.")) return;
    setSwipes((current) => current.filter((swipe) => swipe.id !== id));
    setSelectedSwipeId(swipes[0]?.id ?? null);
    showToast("Swipe excluído.");
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
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => {
          window.localStorage.removeItem("dtc-swipe-hub-auth");
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
          onFunnel={() => setFunnelOpen(true)}
          onMenu={() => setSidebarOpen(true)}
        />
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8">
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
                  onFunnel={() => setFunnelOpen(true)}
                  onSelectSwipe={(id) => {
                    setSelectedSwipeId(id);
                    setActiveSection("swipes");
                  }}
                  onFavorite={toggleFavorite}
                  onDelete={deleteSwipe}
                  onSection={setActiveSection}
                />
              )}

              {["swipes", "favorites", ...swipeTypes].includes(activeSection) && (
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

              {activeSection === "funnels" && (
                <FunnelsView funnels={funnels} swipes={swipes} onCreate={() => setFunnelOpen(true)} />
              )}

              {activeSection === "reports" && <ReportsView swipes={swipes} funnels={funnels} />}

              {activeSection === "tags" && <TagsView swipes={swipes} />}

              {activeSection === "settings" && <SettingsView />}

              {selectedSwipe && ["swipes", "favorites", ...swipeTypes].includes(activeSection) && (
                <SwipeDetail
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
          showToast("Coleção criada.");
        }}
      />
      <FunnelModal
        open={funnelOpen}
        onClose={() => setFunnelOpen(false)}
        swipes={swipes}
        onSave={(funnel) => {
          setFunnels((current) => [funnel, ...current]);
          setFunnelOpen(false);
          showToast("Funil criado.");
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
            {["Captura por URL", "Copy analysis", "Funis conectados"].map((item) => (
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
        <form
          className="w-full max-w-md rounded-xl border border-white/10 bg-[#111827]/90 p-6 shadow-2xl"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin();
          }}
        >
          <h2 className="text-2xl font-semibold text-white">Entrar</h2>
          <p className="mt-2 text-sm text-slate-400">Use qualquer e-mail e senha para testar o MVP local.</p>
          <label className="mt-6 block text-sm text-slate-300">
            E-mail
            <input
              required
              type="email"
              defaultValue="demo@dtcswipehub.com"
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0b0f17] px-3 text-sm outline-none ring-blue-500/0 transition focus:ring-2"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Senha
            <input
              required
              type="password"
              defaultValue="demo1234"
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0b0f17] px-3 text-sm outline-none ring-blue-500/0 transition focus:ring-2"
            />
          </label>
          <button className="mt-6 h-11 w-full rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-blue-950/40">
            Entrar no Hub
          </button>
          <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
            Autenticação real: conecte `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
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
  onLogout,
}: {
  activeSection: string;
  onSelect: (section: string) => void;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-sm font-semibold">D</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">Demo User</p>
              <p className="truncate text-xs text-slate-500">demo@dtcswipehub.com</p>
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
      <div className="mx-auto flex h-[72px] max-w-[1540px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="rounded-lg border border-white/10 p-2 lg:hidden" onClick={onMenu} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative min-w-0 flex-1 xl:max-w-[520px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar swipes, funis, produtos, domínios..."
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
  stats: Array<{ label: string; value: number; icon: typeof Boxes; tone: string }>;
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
                Ver tutorial
              </button>
            </div>
          </div>
          <div className="relative hidden min-h-56 overflow-visible lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mockups/hero-dashboard-clean.png" alt="" className="absolute -inset-x-10 -inset-y-8 h-[calc(100%+72px)] w-[calc(100%+80px)] object-contain object-center opacity-100 drop-shadow-[0_0_46px_rgba(109,59,255,0.36)]" />
          </div>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={() => onSection(stat.label === "Favoritos" ? "favorites" : "swipes")}
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
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <Panel title="Adicionados recentemente" action="Ver biblioteca" onAction={() => onSection("swipes")}>
          {recent.length > 0 ? (
            <SwipeGrid swipes={recent} onSelect={onSelectSwipe} onFavorite={onFavorite} onDelete={onDelete} compact />
          ) : (
            <DashboardEmptyLibrary onAdd={onAdd} />
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Resumo do Funil">
            <FunnelSummaryRail swipes={swipes} />
          </Panel>
          <Panel title="Top Tags" action="Ver todas as tags" onAction={() => onSection("tags")}>
            <TopTagsList swipes={swipes} />
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

function FunnelSummaryRail({ swipes }: { swipes: Swipe[] }) {
  const total = swipes.length;
  const pageViews = swipes.filter((swipe) => ["Advertorial", "Quiz", "Pagina de Venda", "Landing Page"].includes(swipe.type)).length;
  const checkoutSignals = swipes.filter((swipe) => swipe.features.hasExternalCheckout || swipe.features.hasOrderBump).length;
  const purchaseSignals = swipes.filter((swipe) => swipe.features.hasUpsell || swipe.type === "Upsell").length;
  const steps = [
    ["Descoberta", total],
    ["Clique", total],
    ["LP View", pageViews],
    ["Add to Cart", checkoutSignals],
    ["Purchase", purchaseSignals],
  ] as const;
  const conversionRate = total > 0 ? Math.round((purchaseSignals / total) * 1000) / 10 : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {steps.map(([label, value], index) => (
          <div key={label} className="grid grid-cols-[34px_1fr_auto] items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/15 text-emerald-200">
              {index < steps.length - 1 && <span className="absolute left-1/2 top-9 h-5 w-px -translate-x-1/2 bg-emerald-400/35" />}
              <span className="text-xs font-semibold">{index + 1}</span>
            </div>
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-lg font-semibold text-white">{value}</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">0%</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[#1a2d55] bg-[#0b1730] p-4 shadow-[0_0_28px_rgba(37,99,255,0.1)]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Taxa de Conversao</span>
          <span className="text-xs font-semibold text-slate-500">0%</span>
        </div>
        <p className="mt-2 text-2xl font-semibold text-white">{conversionRate.toLocaleString("pt-BR")}%</p>
        <div className="mt-3 h-10 rounded bg-[linear-gradient(135deg,rgba(37,99,255,0.28),rgba(34,211,238,0.12))]" />
      </div>
    </div>
  );
}

function TopTagsList({ swipes }: { swipes: Swipe[] }) {
  const tags = swipes
    .flatMap((swipe) => swipe.tags)
    .reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1;
      return acc;
    }, {});
  const topTags = Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topTags.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#1a2d55] bg-[#050b1d]/60 px-4 py-6 text-center">
        <p className="text-sm font-medium text-white">Nenhuma tag ainda.</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">As tags aparecem quando voce salvar seus primeiros swipes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topTags.map(([tag, count]) => (
        <div key={tag} className="flex items-center justify-between rounded-lg border border-[#1a2d55] bg-[#0b1730] px-3 py-3">
          <p className="text-sm text-white">{tag}</p>
          <p className="text-sm text-slate-500">{count}</p>
        </div>
      ))}
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
  const update = (key: keyof Filters, value: string | boolean) => setFilters({ ...filters, [key]: value });
  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
        <Filter className="h-4 w-4 text-blue-300" />
        Filtros avançados
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={filters.type} onChange={(value) => update("type", value)} options={["", ...swipeTypes]} placeholder="Tipo de swipe" />
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
  onSave: (swipe: Swipe) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  mode: "informacoes" | "metricas";
}) {
  const [draft, setDraft] = useState(swipe);
  const [tab, setTab] = useState<"resumo" | "copy" | "metricas" | "funil">("resumo");

  useEffect(() => {
    queueMicrotask(() => {
      setDraft(swipe);
      setTab(mode === "metricas" ? "metricas" : "resumo");
    });
  }, [mode, swipe]);

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
              <div>
                <h2 className="text-lg font-semibold text-white">{draft.title}</h2>
                <a className="mt-1 block truncate text-xs text-blue-300" href={draft.url} target="_blank" rel="noreferrer">
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
              <button onClick={() => onSave(draft)} className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold">
                Salvar alterações
              </button>
              <button onClick={() => onDelete(draft.id)} className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200">
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
    screenshotUrl: "",
    tags: "",
    notes: "",
    status: "Para analisar" as SwipeStatus,
    rating: 3,
    isFavorite: false,
  });
  const [preview, setPreview] = useState<{ title?: string; description?: string; image?: string; screenshotUrl?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function submit() {
    const url = safeUrl(form.url);
    if (!url) {
      setPreview({ error: "URL inválida. Use http:// ou https://." });
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: uid("swipe"),
      title: form.title || preview?.title || "Novo Swipe",
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
      screenshotUrl: form.screenshotUrl || preview?.screenshotUrl || preview?.image || "",
      ogTitle: preview?.title ?? "",
      ogDescription: preview?.description ?? "",
      ogImage: preview?.image ?? "",
      adLibraryUrl: form.adLibraryUrl,
      creativeUrl: form.creativeUrl,
      notes: form.notes,
      tags: splitTags(form.tags),
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      analysis: emptyAnalysis,
      features: emptyFeatures,
      metrics: emptyMetrics,
    });
  }

  return (
    <Modal title="Adicionar Novo Swipe" onClose={onClose}>
      <div className="grid max-h-[78vh] gap-5 overflow-y-auto pr-1 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2">
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
          <SelectField label="Tipo de swipe" value={form.type} onChange={(value) => setForm({ ...form, type: value as SwipeType })} options={swipeTypes} />
          <Field label="Nome da oferta" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <Field label="Produto" value={form.product} onChange={(value) => setForm({ ...form, product: value })} />
          <Field label="Marca/anunciante" value={form.brand} onChange={(value) => setForm({ ...form, brand: value })} />
          <SelectField label="Nicho" value={form.niche} onChange={(value) => setForm({ ...form, niche: value })} options={niches} />
          <Field label="Subnicho" value={form.subniche} onChange={(value) => setForm({ ...form, subniche: value })} />
          <SelectField label="GEO" value={form.geo} onChange={(value) => setForm({ ...form, geo: value })} options={geos} />
          <SelectField label="Idioma" value={form.language} onChange={(value) => setForm({ ...form, language: value })} options={languages} />
          <SelectField label="Fonte de tráfego" value={form.trafficSource} onChange={(value) => setForm({ ...form, trafficSource: value })} options={trafficSources} />
          <SelectField label="Plataforma de anúncio" value={form.platform} onChange={(value) => setForm({ ...form, platform: value })} options={platforms} />
          <Field label="Link da biblioteca de anúncios" value={form.adLibraryUrl} onChange={(value) => setForm({ ...form, adLibraryUrl: value })} />
          <Field label="Link do criativo" value={form.creativeUrl} onChange={(value) => setForm({ ...form, creativeUrl: value })} />
          <Field label="Upload manual / URL do screenshot" value={form.screenshotUrl} onChange={(value) => setForm({ ...form, screenshotUrl: value })} />
          <Field label="Tags" value={form.tags} onChange={(value) => setForm({ ...form, tags: value })} placeholder="vsl, prova social, br" />
          <SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as SwipeStatus })} options={statuses} />
          <SelectField label="Nota" value={String(form.rating)} onChange={(value) => setForm({ ...form, rating: Number(value) })} options={["1", "2", "3", "4", "5"]} />
          <div className="sm:col-span-2">
            <TextArea label="Observações" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
          </div>
          <Toggle checked={form.isFavorite} onChange={(value) => setForm({ ...form, isFavorite: value })} label="Favorito" />
        </div>
        <div className="space-y-4">
          <ScreenshotPreview preview={preview} screenshotUrl={form.screenshotUrl} />
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-400">
            A captura respeita páginas públicas. Se houver bloqueio do site, use a imagem Open Graph ou envie um screenshot manual.
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

function ScreenshotPreview({
  preview,
  screenshotUrl,
}: {
  preview: { title?: string; description?: string; image?: string; screenshotUrl?: string; error?: string } | null;
  screenshotUrl: string;
}) {
  const image = screenshotUrl || preview?.screenshotUrl || preview?.image;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0f17] p-4">
      <p className="mb-3 text-sm font-medium text-white">Preview</p>
      <div className="aspect-[16/11] overflow-hidden rounded-lg bg-[#111827]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
            <Upload className="h-8 w-8" />
            <span className="text-xs">Cole uma URL e capture o preview.</span>
          </div>
        )}
      </div>
      {preview?.title && <p className="mt-3 text-sm font-medium text-white">{preview.title}</p>}
      {preview?.description && <p className="mt-1 line-clamp-3 text-xs text-slate-400">{preview.description}</p>}
      {preview?.error && <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">{preview.error}</p>}
    </div>
  );
}

function CollectionsView({ collections, swipes, onCreate }: { collections: Collection[]; swipes: Swipe[]; onCreate: () => void }) {
  return (
    <section className="space-y-4">
      <PageHeading title="Coleções" description="Agrupe swipes por estratégia, nicho, oferta ou inspiração." action="Criar coleção" onAction={onCreate} />
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

function FunnelsView({ funnels, swipes, onCreate }: { funnels: Funnel[]; swipes: Swipe[]; onCreate: () => void }) {
  return (
    <section className="space-y-4">
      <PageHeading title="Funis" description="Mapeie a sequência completa: anúncio, presell, quiz, VSL, checkout e upsells." action="Criar funil" onAction={onCreate} />
      <div className="grid gap-4 xl:grid-cols-2">
        {funnels.map((funnel) => (
          <div key={funnel.id} className="rounded-xl border border-white/10 bg-[#111827] p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{funnel.name}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {funnel.niche} · {funnel.geo} · {funnel.trafficSource}
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">{funnel.ticket}</span>
            </div>
            <FunnelTimeline funnel={funnel} swipes={swipes} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportsView({ swipes, funnels }: { swipes: Swipe[]; funnels: Funnel[] }) {
  const typeCounts = countBy(swipes, "type");
  const nicheCounts = countBy(swipes, "niche");
  const geoCounts = countBy(swipes, "geo");
  const sourceCounts = countBy(swipes, "trafficSource");
  return (
    <section className="space-y-4">
      <PageHeading title="Relatórios" description="Visão rápida de categorias, nichos, GEOs, fontes e evolução da biblioteca." />
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Swipes por categoria" data={typeCounts} />
        <BarList title="Swipes por nicho" data={nicheCounts} />
        <BarList title="Swipes por GEO" data={geoCounts} />
        <BarList title="Fontes de tráfego" data={sourceCounts} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ReportMetric label="Funis mapeados" value={funnels.length} />
        <ReportMetric label="Swipes favoritos" value={swipes.filter((swipe) => swipe.isFavorite).length} />
        <ReportMetric label="Média de nota" value={(swipes.reduce((sum, swipe) => sum + swipe.rating, 0) / Math.max(swipes.length, 1)).toFixed(1)} />
      </div>
    </section>
  );
}

function TagsView({ swipes }: { swipes: Swipe[] }) {
  const tags = [...new Set(swipes.flatMap((swipe) => swipe.tags))];
  return (
    <section className="space-y-4">
      <PageHeading title="Tags" description="Mapa de temas recorrentes nos seus swipes." />
      <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#111827] p-5">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
            #{tag}
          </span>
        ))}
      </div>
    </section>
  );
}

function SettingsView() {
  return (
    <section className="space-y-4">
      <PageHeading title="Configurações" description="Autenticação, storage, captura e segurança do workspace." />
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ["Supabase Auth", "Conecte as variáveis públicas e ative e-mail/senha no projeto."],
          ["Supabase Storage", "Bucket `swipe-screenshots` para capturas e uploads manuais."],
          ["RLS", "Políticas SQL prontas em `supabase/schema.sql` para isolamento por usuário."],
          ["Captura Playwright", "Rota `/api/capture` valida URL, busca Open Graph e tenta screenshot público."],
        ].map(([title, description]) => (
          <div key={title} className="rounded-xl border border-white/10 bg-[#111827] p-5">
            <ShieldCheck className="mb-4 h-5 w-5 text-emerald-300" />
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
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
        <Field label="Nome" value={name} onChange={setName} placeholder="Melhores Advertorials Diabetes" />
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
              id: uid("collection"),
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

function FunnelModal({
  open,
  onClose,
  swipes,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  swipes: Swipe[];
  onSave: (funnel: Funnel) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  if (!open) return null;
  return (
    <Modal title="Criar Funil" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nome do funil" value={name} onChange={setName} placeholder="Glucose Delete" />
        <div className="grid gap-2 sm:grid-cols-2">
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
              id: uid("funnel"),
              name: name || "Novo funil",
              niche: swipes.find((swipe) => selected.includes(swipe.id))?.niche || "Geral",
              product: "",
              brand: "",
              geo: swipes.find((swipe) => selected.includes(swipe.id))?.geo || "US",
              language: "PT-BR",
              trafficSource: swipes.find((swipe) => selected.includes(swipe.id))?.trafficSource || "Meta Ads",
              ticket: "",
              objective: "Mapear sequência de conversão.",
              notes: "",
              createdAt: new Date().toISOString(),
              steps: selected.map((swipeId, index) => ({
                id: uid("step"),
                swipeId,
                stepType: ["Anúncio", "Advertorial", "Quiz", "VSL", "Checkout", "Upsell"][index] ?? "Etapa",
                stepOrder: index + 1,
                notes: "",
              })),
            })
          }
          className="h-10 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 text-sm font-semibold"
        >
          Criar Funil
        </button>
      </div>
    </Modal>
  );
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

function FunnelTimeline({ funnel, swipes, compact = false }: { funnel?: Funnel; swipes: Swipe[]; compact?: boolean }) {
  if (!funnel) return null;
  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-2", compact && "flex-col overflow-visible pb-0")}>
      {funnel.steps
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step, index) => {
          const swipe = swipes.find((item) => item.id === step.swipeId);
          return (
            <div key={step.id} className={cn("flex min-w-44 items-center gap-3", compact && "min-w-0")}>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs text-blue-300">{step.stepType}</p>
                <p className="mt-1 line-clamp-1 text-sm font-medium text-white">{swipe?.title ?? "Etapa vazia"}</p>
              </div>
              {index < funnel.steps.length - 1 && <div className={cn("h-px w-8 bg-white/20", compact && "hidden")} />}
            </div>
          );
        })}
    </div>
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
      {image && (
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

function BarList({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
      <h3 className="font-semibold text-white">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
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
    swipes: "Biblioteca de Swipes",
    favorites: "Favoritos",
  };
  return map[section] ?? section;
}

function sectionDescription(section: string) {
  const map: Record<string, string> = {
    swipes: "Todos os links, screenshots, tags e análises estratégicas em um grid rápido de escanear.",
    favorites: "Os swipes mais importantes para estudar, modelar e reutilizar.",
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

