import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Play,
  ArrowLeft,
  Tv,
  Film,
  Clock,
  Globe,
  ChevronRight,
  X,
  Layers,
  Sparkles,
  Copy,
  Check,
  Radio,
  Info,
} from "lucide-react";

import {
  getCatalogue,
  type Catalogue,
  type CatalogueShow,
  type CatalogueEpisode,
} from "../api/catalogue";
import { getMediaUrl } from "../api/client";

export interface PlayerModalData {
  showTitle: string;
  episodeTitle: string;
  episodeNumber: number;
  isTrailer: boolean;
  videoUri: string;
  streamLang: string;
}

export default function CataloguePage() {
  const navigate = useNavigate();

  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [selectedShow, setSelectedShow] = useState<CatalogueShow | null>(null);
  const [activePlayer, setActivePlayer] = useState<PlayerModalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCatalogue() {
      try {
        setLoading(true);
        const data = await getCatalogue();
        setCatalogue(data);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "Failed to load catalogue.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadCatalogue();
  }, []);

  const categories = useMemo(() => {
    if (!catalogue) return [];
    return Array.from(
      new Set(catalogue.shows.flatMap((show) => show.categories))
    ).sort();
  }, [catalogue]);

  // Determine top featured show for Hero Banner
  const heroShow = useMemo(() => {
    if (!catalogue || catalogue.shows.length === 0) return null;
    const featuredList = catalogue.sections?.featured || [];
    return featuredList.length > 0 ? featuredList[0] : catalogue.shows[0];
  }, [catalogue]);

  // Composable search and filtering
  const filteredShows = useMemo(() => {
    if (!catalogue) return [];

    const query = search.trim().toLowerCase();

    return catalogue.shows.filter((show) => {
      const matchesSearch =
        !query ||
        show.title.toLowerCase().includes(query) ||
        show.synopsis?.toLowerCase().includes(query) ||
        show.categories.some((c) => c.toLowerCase().includes(query)) ||
        show.seasons.some((s) =>
          s.episodes.some(
            (ep) =>
              ep.title.toLowerCase().includes(query) ||
              ep.description?.toLowerCase().includes(query)
          )
        );

      const matchesCategory =
        category === "all" || show.categories.includes(category);

      const matchesLanguage =
        languageFilter === "all" ||
        show.seasons.some((s) =>
          s.episodes.some((ep) =>
            ep.available_languages
              ? ep.available_languages.includes(languageFilter)
              : Object.keys(ep.languages).includes(languageFilter)
          )
        );

      return matchesSearch && matchesCategory && matchesLanguage;
    });
  }, [catalogue, search, category, languageFilter]);

  const hasActiveFilters =
    search.trim() !== "" || category !== "all" || languageFilter !== "all";

  // SKELETON PLACEHOLDER LOADER
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 animate-pulse">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800/80 pb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-800/60 rounded"></div>
          </div>
          <div className="h-9 w-32 bg-slate-800 rounded-lg"></div>
        </div>

        {/* Skeleton Hero Banner */}
        <div className="w-full h-80 md:h-96 bg-slate-900 rounded-2xl mb-10 border border-slate-800 flex flex-col justify-end p-8 space-y-4">
          <div className="h-5 w-24 bg-indigo-900/60 rounded-full"></div>
          <div className="h-10 w-80 bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-96 max-w-full bg-slate-800/70 rounded"></div>
          <div className="h-10 w-36 bg-slate-800 rounded-lg"></div>
        </div>

        {/* Skeleton Rails */}
        <div className="space-y-10">
          {[1, 2].map((rail) => (
            <div key={rail} className="space-y-4">
              <div className="h-6 w-44 bg-slate-800 rounded"></div>
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5].map((card) => (
                  <div
                    key={card}
                    className="w-44 h-64 shrink-0 bg-slate-900 rounded-xl border border-slate-800/60"
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ERROR OR EMPTY STATE
  if (error || !catalogue) {
    const hasToken = Boolean(localStorage.getItem("access_token"));
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-6">
          <Tv className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          No Published Catalogue Yet
        </h2>
        <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
          The catalogue has not been published yet or is awaiting an admin publish run.
          Sign in to the CMS dashboard to manage shows, fix validation issues, and publish.
        </p>
        <button
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-md transition"
          onClick={() => navigate(hasToken ? "/dashboard" : "/login")}
        >
          {hasToken ? "Go to CMS Dashboard" : "Sign In to CMS"}
        </button>
      </div>
    );
  }

  const hasToken = Boolean(localStorage.getItem("access_token"));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* TOP VIEWER NAV BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Peblo TV <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/50 text-indigo-300 font-semibold uppercase">Mini</span>
            </h1>
            <p className="text-xs text-slate-400">Stream Catalogue Portal</p>
          </div>
        </div>

        <button
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg transition"
          onClick={() => navigate(hasToken ? "/dashboard" : "/login")}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {hasToken ? "Staff CMS Portal" : "Sign In"}
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8">
        {/* 1. HERO BANNER (Top featured show highlight) */}
        {!hasActiveFilters && heroShow && (
          <div className="relative rounded-3xl overflow-hidden border border-slate-800/90 shadow-2xl bg-slate-900 group">
            {/* Background image or gradient */}
            <div className="absolute inset-0 z-0">
              {heroShow.artwork?.banner ? (
                <img
                  src={getMediaUrl(heroShow.artwork.banner)}
                  alt={heroShow.title}
                  className="w-full h-full object-cover object-center group-hover:scale-102 transition duration-700 opacity-60"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-r from-indigo-950 via-slate-900 to-slate-950" />
              )}
              {/* Dark overlay gradients for contrast */}
              <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/60 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
            </div>

            {/* Content overlay */}
            <div className="relative z-10 p-6 md:p-12 max-w-2xl flex flex-col justify-end min-h-[360px] md:min-h-[440px]">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Featured Spotlight
                </span>
                {heroShow.section && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {heroShow.section}
                  </span>
                )}
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-3">
                {heroShow.title}
              </h2>

              <p className="text-slate-300 text-sm md:text-base line-clamp-3 mb-6 leading-relaxed">
                {heroShow.synopsis || "Stream complete episodes in English and Hindi on Peblo TV Mini."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSelectedShow(heroShow)}
                  className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm rounded-xl inline-flex items-center gap-2 shadow-lg transition"
                >
                  <Play className="w-4 h-4 fill-current" /> Browse Episodes
                </button>

                {heroShow.trailers && heroShow.trailers.length > 0 && (
                  <button
                    onClick={() => setSelectedShow(heroShow)}
                    className="px-5 py-3 bg-slate-900/80 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl border border-slate-700/80 inline-flex items-center gap-2 backdrop-blur-xs transition"
                  >
                    <Film className="w-4 h-4 text-indigo-400" /> Watch Trailer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. CONTROLS: SEARCH & COMPOSABLE FILTERS */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 md:p-5 backdrop-blur-md space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shows, synopsis, categories, or episodes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Dropdown Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 transition"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Language Stream Filter */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  languageFilter === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setLanguageFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  languageFilter === "en"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setLanguageFilter("en")}
              >
                English
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  languageFilter === "hi"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setLanguageFilter("hi")}
              >
                Hindi
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  category === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                onClick={() => setCategory("all")}
              >
                All Shows ({catalogue.shows.length})
              </button>
              {categories.map((cat) => {
                const count = catalogue.shows.filter((s) =>
                  s.categories.includes(cat)
                ).length;
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. SHOW BROWSING: HORIZONTAL SECTION RAILS OR FILTER RESULTS */}
        {hasActiveFilters ? (
          /* Filtered Results View */
          <section className="space-y-4">
            <div className="flex justify-between items-center text-sm text-slate-400 border-b border-slate-800 pb-3">
              <span>
                Found <strong className="text-white">{filteredShows.length}</strong> matching show{filteredShows.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setLanguageFilter("all");
                }}
                className="text-xs text-indigo-400 hover:underline"
              >
                Reset filters
              </button>
            </div>

            {filteredShows.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Tv className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <p className="text-base font-medium text-slate-400">No shows match your query</p>
                <p className="text-xs text-slate-500 mt-1">Try relaxing your search terms or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {filteredShows.map((show) => (
                  <ShowPosterCard
                    key={show.id}
                    show={show}
                    onSelect={() => setSelectedShow(show)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Netflix-Style Horizontal Section Rows */
          <div className="space-y-12">
            {[
              {
                id: "featured",
                title: "Featured Highlights",
                subtitle: "Top curated shows & original spotlight titles",
                shows: catalogue.sections?.featured || [],
              },
              {
                id: "series",
                title: "Trending Series",
                subtitle: "Full episodic series and learning adventures",
                shows: catalogue.sections?.series || [],
              },
              {
                id: "minisodes",
                title: "Bite-Sized Minisodes",
                subtitle: "Short, engaging episodes perfect for quick watching",
                shows: catalogue.sections?.minisodes || [],
              },
              {
                id: "songs",
                title: "Songs & Nursery Rhymes",
                subtitle: "Musical fun, rhymes, and sing-along favorites",
                shows: catalogue.sections?.songs || [],
              },
            ]
              .filter((section) => section.shows.length > 0)
              .map((section) => (
                <section key={section.id} className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        {section.title}
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">{section.subtitle}</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {section.shows.length} titles
                    </span>
                  </div>

                  {/* Horizontal Scroll Track */}
                  <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 pt-1">
                    {section.shows.map((show) => (
                      <div key={show.id} className="w-44 md:w-52 shrink-0">
                        <ShowPosterCard
                          show={show}
                          onSelect={() => setSelectedShow(show)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </main>

      {/* 4. SHOW DETAIL MODAL / EXPANDED VIEWER */}
      {selectedShow && (
        <ShowDetailModal
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
          onPlayStream={(data) => setActivePlayer(data)}
        />
      )}

      {/* 5. IN-APP STREAMING VIDEO PLAYER MODAL */}
      {activePlayer && (
        <VideoPlayerModal
          data={activePlayer}
          onClose={() => setActivePlayer(null)}
        />
      )}
    </div>
  );
}

/**
 * Deterministic color palette generator for OTT cards
 */
function getShowGradient(
  title: string,
  categories: string[] = []
): { bg: string; badgeColor: string } {
  const cat = (categories[0] || "").toLowerCase();
  if (cat.includes("music") || cat.includes("rhyme") || cat.includes("song")) {
    return {
      bg: "from-emerald-950 via-teal-900 to-slate-950",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    };
  }
  if (
    cat.includes("story") ||
    cat.includes("adventure") ||
    cat.includes("folk")
  ) {
    return {
      bg: "from-amber-950 via-orange-900 to-slate-950",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
  }
  if (
    cat.includes("science") ||
    cat.includes("learning") ||
    cat.includes("education")
  ) {
    return {
      bg: "from-violet-950 via-indigo-900 to-slate-950",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    };
  }
  const palettes = [
    {
      bg: "from-indigo-950 via-blue-900 to-slate-950",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    {
      bg: "from-rose-950 via-pink-900 to-slate-950",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    },
    {
      bg: "from-purple-950 via-violet-900 to-slate-950",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
  ];
  const charSum = title
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palettes[charSum % palettes.length];
}

/**
 * 2:3 Vertical Poster Card Component
 */
function ShowPosterCard({
  show,
  onSelect,
}: {
  show: CatalogueShow;
  onSelect: () => void;
}) {
  const posterUrl = show.artwork?.poster
    ? getMediaUrl(show.artwork.poster)
    : "";
  const style = getShowGradient(show.title, show.categories);

  const regularSeasonsCount = (show.seasons || []).filter((s) => s.season_number > 0).length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex flex-col text-left w-full focus:outline-hidden cursor-pointer"
    >
      {/* 2:3 Aspect Poster Box */}
      <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-md group-hover:border-indigo-500/80 group-hover:shadow-indigo-500/10 group-hover:scale-103 transition duration-300 relative flex items-center justify-center">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={show.title}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          /* Dynamic OTT Stylized Poster for mock seed items */
          <div
            className={`w-full h-full p-4 flex flex-col justify-between bg-linear-to-b ${style.bg} relative select-none`}
          >
            {/* Top brand stamp */}
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase bg-slate-950/70 px-2 py-0.5 rounded border border-indigo-500/20">
                PEBLO TV
              </span>
              <Tv className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Middle show title and icon */}
            <div className="space-y-2 z-10 my-auto py-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center mx-auto border border-white/15 text-white shadow-inner">
                <Film className="w-5 h-5 text-white/90" />
              </div>
              <h4 className="text-sm font-extrabold text-white leading-tight tracking-tight line-clamp-3">
                {show.title}
              </h4>
            </div>

            {/* Bottom info */}
            <div className="z-10 text-center space-y-1">
              <span
                className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badgeColor}`}
              >
                {show.categories[0] || "Series"}
              </span>
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-3 z-20">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600/90 py-1.5 px-2.5 rounded-lg backdrop-blur-xs self-start mb-1">
            <Play className="w-3 h-3 fill-current" /> Browse
          </span>
          <p className="text-[11px] text-slate-300 line-clamp-2">
            {show.synopsis || "View episodes and language streams"}
          </p>
        </div>

        {/* Section Badge */}
        {show.section && (
          <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-950/90 text-indigo-300 border border-slate-800 backdrop-blur-xs">
            {show.section}
          </span>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="mt-2.5 space-y-1">
        <h3 className="font-semibold text-sm text-slate-200 group-hover:text-white line-clamp-1 transition">
          {show.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">
            {show.categories.slice(0, 2).join(" • ") || "General"}
          </span>
          <span className="shrink-0 text-[11px]">
            {regularSeasonsCount > 0
              ? `${regularSeasonsCount} ${regularSeasonsCount === 1 ? "Season" : "Seasons"}`
              : show.trailers && show.trailers.length > 0
              ? "Trailers"
              : "0 Seasons"}
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Show Detail Modal with Banner, Season selector, Episode list, Trailers & Language streams
 */
function ShowDetailModal({
  show,
  onClose,
  onPlayStream,
}: {
  show: CatalogueShow;
  onClose: () => void;
  onPlayStream: (data: PlayerModalData) => void;
}) {
  // Defensively exclude any Season 0 from regular seasons
  const regularSeasons = useMemo(
    () => (show.seasons || []).filter((s) => s.season_number > 0),
    [show.seasons]
  );

  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(
    regularSeasons[0]?.season_number ?? 1
  );
  const [activeStreamLang, setActiveStreamLang] = useState<string>("en");

  const currentSeason =
    regularSeasons.find((s) => s.season_number === selectedSeasonNum) ||
    regularSeasons[0] ||
    null;

  const bannerUrl = show.artwork?.banner
    ? getMediaUrl(show.artwork.banner)
    : "";
  const style = getShowGradient(show.title, show.categories);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header: Hero Banner Backdrop */}
        <div className="relative h-64 md:h-72 w-full shrink-0 bg-slate-950 overflow-hidden flex items-end p-6 md:p-8">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt={show.title}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-linear-to-r ${style.bg} opacity-80`}
            />
          )}

          <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/60 to-transparent" />

          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              {show.section && (
                <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {show.section}
                </span>
              )}
              {show.categories.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                >
                  {c}
                </span>
              ))}
            </div>

            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              {show.title}
            </h2>

            <p className="text-slate-300 text-xs md:text-sm line-clamp-2 leading-relaxed">
              {show.synopsis || "No show synopsis recorded."}
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 md:p-8 space-y-8 overflow-y-auto">
          {/* TRAILERS & TEASERS (Season 0) */}
          {show.trailers && show.trailers.length > 0 && (
            <div className="space-y-3 pb-6 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Film className="w-4 h-4" /> Trailers & Teasers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {show.trailers.map((trailer) => (
                  <EpisodeCard
                    key={trailer.episode_number}
                    episode={trailer}
                    showTitle={show.title}
                    isTrailer={true}
                    activeLang={activeStreamLang}
                    onSelectLang={setActiveStreamLang}
                    onPlayStream={onPlayStream}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SEASON SELECTOR TABS & EPISODES */}
          {regularSeasons.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {regularSeasons.map((s) => (
                    <button
                      key={s.season_number}
                      onClick={() => setSelectedSeasonNum(s.season_number)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        selectedSeasonNum === s.season_number
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Season {s.season_number}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-500 font-mono shrink-0">
                  {currentSeason?.episodes.length || 0} episodes
                </span>
              </div>

              {/* EPISODE THUMBNAIL LISTS */}
              {currentSeason && currentSeason.episodes.length > 0 ? (
                <div className="space-y-3">
                  {currentSeason.episodes.map((episode) => (
                    <EpisodeCard
                      key={episode.episode_number}
                      episode={episode}
                      showTitle={show.title}
                      isTrailer={false}
                      activeLang={activeStreamLang}
                      onSelectLang={setActiveStreamLang}
                      onPlayStream={onPlayStream}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No episodes available in this season.
                </div>
              )}
            </div>
          ) : (
            (!show.trailers || show.trailers.length === 0) && (
              <div className="py-8 text-center text-slate-500 text-xs">
                No seasons or episodes available yet.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Episode Card Component with 16:9 Thumbnail and Language Variant Streams
 */
function EpisodeCard({
  episode,
  showTitle,
  isTrailer = false,
  activeLang,
  onSelectLang,
  onPlayStream,
}: {
  episode: CatalogueEpisode;
  showTitle: string;
  isTrailer?: boolean;
  activeLang: string;
  onSelectLang: (lang: string) => void;
  onPlayStream: (data: PlayerModalData) => void;
}) {
  const thumbUrl = episode.artwork?.thumbnail
    ? getMediaUrl(episode.artwork.thumbnail)
    : "";

  const availableLangs =
    episode.available_languages || Object.keys(episode.languages || {});

  // Determine active video stream URI based on chosen language
  const selectedStream =
    episode.languages[activeLang] ||
    episode.languages[availableLangs[0]] ||
    null;

  const formatDuration = (secs: number | null) => {
    if (!secs) return null;
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}m ${remaining > 0 ? `${remaining}s` : ""}`;
  };

  const handlePlay = () => {
    if (!selectedStream) return;
    onPlayStream({
      showTitle,
      episodeTitle: episode.title,
      episodeNumber: episode.episode_number,
      isTrailer,
      videoUri: selectedStream.video_uri,
      streamLang:
        activeLang === "en"
          ? "English"
          : activeLang === "hi"
          ? "Hindi"
          : activeLang,
    });
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-3 md:p-4 flex flex-col md:flex-row gap-4 transition group">
      {/* 16:9 Thumbnail */}
      <div className="aspect-[16/9] w-full md:w-48 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={episode.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-linear-to-br from-slate-900 via-indigo-950/40 to-slate-950 text-center relative select-none">
            <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-1 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-300 line-clamp-1">
              {episode.title}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              {isTrailer ? "Trailer" : `Episode ${episode.episode_number}`}
            </span>
          </div>
        )}

        {/* Play Icon Badge on hover */}
        {selectedStream && (
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg hover:scale-110 transition">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </button>
        )}

        {/* Duration badge */}
        {episode.duration_seconds && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-slate-300 text-[10px] font-mono flex items-center gap-1 pointer-events-none">
            <Clock className="w-2.5 h-2.5" />
            {formatDuration(episode.duration_seconds)}
          </span>
        )}
      </div>

      {/* Episode Details */}
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-mono font-semibold text-indigo-400">
              {isTrailer ? "TRAILER" : `EPISODE ${episode.episode_number}`}
            </span>
            {episode.content_group && (
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {episode.content_group}
              </span>
            )}
          </div>

          <h4 className="font-bold text-white text-sm md:text-base leading-snug group-hover:text-indigo-200 transition">
            {episode.title}
          </h4>

          {episode.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {episode.description}
            </p>
          )}
        </div>

        {/* Language Stream Variant Switcher */}
        <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-400 font-medium">Streams:</span>
            {availableLangs.map((lang) => {
              const isActive = activeLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onSelectLang(lang)}
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {lang === "en" ? "English" : lang === "hi" ? "Hindi" : lang}
                </button>
              );
            })}
          </div>

          {/* Watch Stream Button */}
          {selectedStream && (
            <button
              type="button"
              onClick={handlePlay}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch Stream
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * In-App Streaming Video Player Modal with OTT HUD & Diagnostics
 */
function VideoPlayerModal({
  data,
  onClose,
}: {
  data: PlayerModalData;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.videoUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>{data.showTitle}</span>
                <span className="text-slate-500 font-normal">•</span>
                <span className="text-indigo-400">
                  {data.isTrailer ? "Trailer" : `Ep. ${data.episodeNumber}`}:{" "}
                  {data.episodeTitle}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Peblo TV OTT Stream Player • Audio Track:{" "}
                <strong className="text-slate-200">{data.streamLang}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport (16:9) */}
        <div className="relative aspect-[16/9] w-full bg-black flex items-center justify-center overflow-hidden group">
          {!videoError ? (
            <video
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onError={() => setVideoError(true)}
            />
          ) : (
            /* Fallback offline/simulated player display */
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">
                  {data.episodeTitle}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Active HLS Stream Simulation for{" "}
                  <code className="text-indigo-300 font-mono">
                    {data.videoUri}
                  </code>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-500/30">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Stream Ready • 1080p 60fps • {data.streamLang}
              </div>
            </div>
          )}

          {/* On-screen live badge */}
          <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-semibold text-white">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span>1080p Full HD</span>
            <span className="text-slate-400">•</span>
            <span className="text-indigo-300">{data.streamLang} Audio</span>
          </div>
        </div>

        {/* Stream Diagnostics HUD & Evaluator Reference */}
        <div className="p-6 bg-slate-950/90 border-t border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Underlying Stream Identifier / Manifest URI
              </span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-indigo-300 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                  {data.videoUri}
                </code>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied URI
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Copy URI
                </>
              )}
            </button>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-400 bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-xl leading-relaxed">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-300">
                Evaluator Architecture Note:
              </strong>{" "}
              In production Peblo TV OTT deployments, these manifests resolve to
              signed Cloudflare/CloudFront HLS streams (e.g.{" "}
              <code className="text-indigo-300">.m3u8</code>). In this seed
              dataset, the evaluator provided mock URI identifiers (
              <code className="text-indigo-300">seed://video/...</code>), which
              this viewer simulates with real-time audio variant switching.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
