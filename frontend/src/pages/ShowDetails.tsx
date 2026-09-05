import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Clock,
  ChevronRight,
  Film,
  Layers,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { getShows, getShow, updateShow, type Show } from "../api/shows";
import {
  createSeason,
  deleteSeason,
  getSeasons,
  type Season,
} from "../api/seasons";
import {
  createEpisode,
  deleteEpisode,
  getEpisodes,
  updateEpisode,
  type Episode,
} from "../api/episodes";

interface SeasonWithEpisodes extends Season {
  episodes: Episode[];
}

export default function ShowDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showId = Number(id);

  const [show, setShow] = useState<Show | null>(null);
  const [seasons, setSeasons] = useState<SeasonWithEpisodes[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  // Show metadata editing
  const [editingShow, setEditingShow] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSynopsis, setEditSynopsis] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editStatus, setEditStatus] = useState("draft");

  // Add Season Dialog
  const [showAddSeasonModal, setShowAddSeasonModal] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState("");

  // Add Episode Modal
  const [showAddEpisodeModal, setShowAddEpisodeModal] = useState(false);
  const [epSourceId, setEpSourceId] = useState("");
  const [epNumber, setEpNumber] = useState("1");
  const [epTitle, setEpTitle] = useState("");
  const [epDescription, setEpDescription] = useState("");
  const [epDuration, setEpDuration] = useState("");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === "admin";

  const [epStatus, setEpStatus] = useState("draft");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      let currentShow: Show | undefined;
      try {
        currentShow = await getShow(showId);
      } catch {
        const allShows = await getShows();
        currentShow = allShows.find((item) => item.id === showId);
      }

      if (!currentShow) {
        setError("Show not found.");
        return;
      }

      setShow(currentShow);
      setEditTitle(currentShow.title);
      setEditSlug(currentShow.slug);
      setEditSynopsis(currentShow.synopsis || "");
      setEditSection(currentShow.section || "");
      setEditStatus(currentShow.status);

      const seasonData = await getSeasons(showId);
      const seasonsWithEpisodes = await Promise.all(
        seasonData.map(async (season) => ({
          ...season,
          episodes: await getEpisodes(season.id),
        }))
      );

      // Sort seasons by season_number ascending
      seasonsWithEpisodes.sort((a, b) => a.season_number - b.season_number);
      setSeasons(seasonsWithEpisodes);

      // Auto-select season if none selected or if previously selected season still exists
      if (seasonsWithEpisodes.length > 0) {
        setSelectedSeasonId((prev) => {
          if (prev && seasonsWithEpisodes.some((s) => s.id === prev)) {
            return prev;
          }
          return seasonsWithEpisodes[0].id;
        });
      } else {
        setSelectedSeasonId(null);
      }
    } catch {
      setError("Failed to load show details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (showId) {
      loadData();
    }
  }, [showId]);

  const activeSeason = seasons.find((s) => s.id === selectedSeasonId) || seasons[0] || null;

  async function handleToggleShowStatus() {
    if (!show) return;
    const nextStatus = show.status === "published" ? "draft" : "published";
    try {
      setSaving(true);
      await updateShow(show.id, { status: nextStatus });
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to update show status.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEpisodeStatus(episode: Episode) {
    const nextStatus = episode.status === "published" ? "draft" : "published";
    try {
      await updateEpisode(episode.id, { status: nextStatus });
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to update episode status.";
      setError(msg);
    }
  }

  async function handleCreateSeason(e: React.FormEvent) {
    e.preventDefault();
    const seasonNumber = Number(newSeasonNumber);

    if (!Number.isInteger(seasonNumber) || seasonNumber < 0) {
      setError("Enter a valid non-negative season number.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const created = await createSeason(showId, {
        season_number: seasonNumber,
      });

      setNewSeasonNumber("");
      setShowAddSeasonModal(false);
      await loadData();
      setSelectedSeasonId(created.id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to create season.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateEpisode(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSeason) return;

    if (!epSourceId.trim() || !epTitle.trim()) {
      setError("Episode ID and title are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createEpisode(activeSeason.id, {
        source_episode_id: epSourceId.trim(),
        episode_number: Number(epNumber) || 1,
        title: epTitle.trim(),
        description: epDescription.trim() || null,
        duration_seconds: epDuration ? Number(epDuration) : null,
        status: epStatus,
      });

      setEpSourceId("");
      setEpTitle("");
      setEpDescription("");
      setEpDuration("");
      setEpStatus("published");
      setEpNumber(String((activeSeason.episodes.length || 0) + 2));
      setShowAddEpisodeModal(false);

      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to create episode.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSeason(seasonId: number) {
    if (!window.confirm("Delete this season and all its episodes? This cannot be undone.")) {
      return;
    }

    try {
      setSaving(true);
      await deleteSeason(seasonId);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to delete season.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEpisode(episodeId: number) {
    if (!window.confirm("Delete this episode? This cannot be undone.")) {
      return;
    }

    try {
      setSaving(true);
      await deleteEpisode(episodeId);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to delete episode.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateShow(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await updateShow(showId, {
        title: editTitle.trim(),
        slug: editSlug.trim(),
        synopsis: editSynopsis.trim() || null,
        section: editSection || null,
        status: editStatus,
      });

      setEditingShow(false);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to update show metadata.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium animate-pulse">
        Loading show details...
      </div>
    );
  }

  if (!show) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Show Not Found</h2>
        <p className="text-slate-600 mb-6">{error || "The requested show does not exist."}</p>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
          onClick={() => navigate("/shows")}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shows
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* BREADCRUMB & TOP HEADER */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={() => navigate("/shows")}
            className="hover:text-slate-900 transition inline-flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Shows
          </button>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate">{show.title}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl shadow-xs">
              {show.title.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{show.title}</h1>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={handleToggleShowStatus}
                    disabled={saving}
                    title={`Click to switch show to ${show.status === "published" ? "draft" : "published"}`}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      show.status === "published"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700"
                        : "bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300"
                    }`}
                  >
                    {show.status === "published" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Published (Live)
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Draft (Click to Publish)
                      </>
                    )}
                  </button>
                ) : (
                  <span className="px-3 py-1 text-xs font-bold rounded-full border bg-amber-100 text-amber-900 border-amber-300 inline-flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">/{show.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setEditingShow(!editingShow)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <Edit2 className="w-4 h-4 text-slate-500" />
              {editingShow ? "Close Editor" : "Edit Metadata"}
            </button>
            <button
              onClick={() => {
                setNewSeasonNumber(String((seasons.length > 0 ? Math.max(...seasons.map(s => s.season_number)) : 0) + 1));
                setShowAddSeasonModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Season
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* SHOW METADATA PANEL (COMPACT OR EDIT MODE) */}
      {editingShow ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Edit Show Metadata</h2>
            <button
              onClick={() => setEditingShow(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpdateShow} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Show Title</label>
                <input
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Show Title"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slug</label>
                <input
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  placeholder="url-slug"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Section</label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                >
                  <option value="">No section</option>
                  <option value="featured">Featured</option>
                  <option value="series">Series</option>
                  <option value="minisodes">Minisodes</option>
                  <option value="songs">Songs</option>
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="draft">Draft (Work in Progress)</option>
                    <option value="published">Published (Live Catalogue)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Synopsis / Overview</label>
              <textarea
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                value={editSynopsis}
                onChange={(e) => setEditSynopsis(e.target.value)}
                placeholder="Detailed description of the show..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
                onClick={() => setEditingShow(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Section</span>
              <span className="font-semibold text-slate-800 capitalize">{show.section || "None"}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Categories</span>
              <div className="flex flex-wrap gap-1.5">
                {show.categories && show.categories.length > 0 ? (
                  show.categories.map((cat) => (
                    <span key={cat} className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">
                      {cat}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Seasons</span>
              <span className="font-semibold text-slate-800">{seasons.length}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Episodes</span>
              <span className="font-semibold text-slate-800">
                {seasons.reduce((acc, s) => acc + s.episodes.length, 0)}
              </span>
            </div>
          </div>
          {show.synopsis && (
            <p className="text-sm text-slate-600 mt-4 pt-3 border-t border-slate-100 leading-relaxed">
              {show.synopsis}
            </p>
          )}
        </div>
      )}

      {/* SEASONS NAVIGATION TABS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {seasons.map((season) => {
              const isActive = activeSeason?.id === season.id;
              return (
                <button
                  key={season.id}
                  onClick={() => {
                    setSelectedSeasonId(season.id);
                    setShowAddEpisodeModal(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-[1px] whitespace-nowrap ${
                    isActive
                      ? "border-indigo-600 text-indigo-600 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <Layers className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{season.season_number === 0 ? "Season 0 (Trailers & Teasers)" : `Season ${season.season_number}`}</span>
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {season.episodes.length}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => {
                setNewSeasonNumber(String((seasons.length > 0 ? Math.max(...seasons.map(s => s.season_number)) : 0) + 1));
                setShowAddSeasonModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition ml-2 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add Season
            </button>
          </div>
        </div>

        {/* ACTIVE SEASON VIEW */}
        {activeSeason ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Season Toolbar Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2">
                  {activeSeason.season_number === 0 ? "Season 0 (Trailers & Teasers)" : `Season ${activeSeason.season_number}`}
                  {activeSeason.season_number === 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      Trailers Only • Excluded from regular public seasons
                    </span>
                  )}
                  <span className="text-xs font-normal text-slate-500">
                    • {activeSeason.episodes.length} episode{activeSeason.episodes.length !== 1 ? "s" : ""}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeSeason.season_number === 0
                    ? "Season 0 is reserved for promotional trailers and teasers. These appear in the public viewer's Trailers rail, never as a regular series season."
                    : "Manage episodes, video streams, artwork, and validation for this season."}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setEpNumber(String(activeSeason.episodes.length + 1));
                    setEpSourceId(`ep-${activeSeason.season_number}-${activeSeason.episodes.length + 1}`);
                    setShowAddEpisodeModal(!showAddEpisodeModal);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> {showAddEpisodeModal ? "Cancel" : "Add Episode"}
                </button>

                <button
                  onClick={() => handleDeleteSeason(activeSeason.id)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                  title="Delete this entire season"
                >
                  <Trash2 className="w-4 h-4" /> Delete Season
                </button>
              </div>
            </div>

            {/* COLLAPSIBLE ADD EPISODE MODAL */}
            {showAddEpisodeModal && (
              <div className="p-6 bg-slate-50 border-b border-slate-200 animate-fadeIn">
                <div className="max-w-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Add Episode to Season {activeSeason.season_number}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Create episode record. You can upload media and artwork in the next step.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddEpisodeModal(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateEpisode} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Source Episode ID *
                        </label>
                        <input
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="e.g. ep-101"
                          value={epSourceId}
                          onChange={(e) => setEpSourceId(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Episode Number *
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          value={epNumber}
                          onChange={(e) => setEpNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Episode Title *
                        </label>
                        <input
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="e.g. Pilot: The Journey Begins"
                          value={epTitle}
                          onChange={(e) => setEpTitle(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Description (Optional)
                        </label>
                        <input
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="Short summary of the episode..."
                          value={epDescription}
                          onChange={(e) => setEpDescription(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Duration (seconds)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="e.g. 1440 (24 min)"
                          value={epDuration}
                          onChange={(e) => setEpDuration(e.target.value)}
                        />
                      </div>
                      
                      {isAdmin && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Status
                          </label>
                          <select
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                            value={epStatus}
                            onChange={(e) => setEpStatus(e.target.value)}
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
                      >
                        {saving ? "Saving Episode..." : "Save Episode"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddEpisodeModal(false)}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* EPISODE LIST / TABLE */}
            {activeSeason.episodes.length === 0 ? (
              <div className="p-12 text-center">
                <Film className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No episodes in Season {activeSeason.season_number}</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  Get started by adding the first episode with its metadata, media streams, and artwork.
                </p>
                <button
                  onClick={() => {
                    setEpNumber("1");
                    setEpSourceId(`ep-${activeSeason.season_number}-1`);
                    setShowAddEpisodeModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Episode 1
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeSeason.episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="p-4 sm:px-6 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                        E{episode.episode_number}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900">{episode.title}</h4>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleToggleEpisodeStatus(episode)}
                              disabled={saving}
                              title={`Click to switch to ${episode.status === "published" ? "draft" : "published"}`}
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full border capitalize cursor-pointer hover:opacity-85 transition ${
                                episode.status === "published"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {episode.status === "published" ? "✓ Published" : "✎ Draft"}
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200 capitalize">
                              {episode.status}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="font-mono">{episode.source_episode_id || "No external ID"}</span>
                          {episode.duration_seconds != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {Math.floor(episode.duration_seconds / 60)} min {episode.duration_seconds % 60 > 0 ? `${episode.duration_seconds % 60}s` : ""}
                            </span>
                          )}
                          {episode.description && (
                            <span className="hidden md:inline truncate max-w-xs text-slate-400">
                              • {episode.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => navigate(`/episodes/${episode.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs"
                      >
                        Edit Media & Details <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteEpisode(episode.id)}
                        disabled={saving}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Episode"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Seasons Created</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              This show currently has no seasons. Create Season 1 to start adding episodes.
            </p>
            <button
              onClick={() => {
                setNewSeasonNumber("1");
                setShowAddSeasonModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Create Season 1
            </button>
          </div>
        )}
      </div>

      {/* ADD SEASON MODAL DIALOG */}
      {showAddSeasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Add New Season
              </h3>
              <button
                onClick={() => setShowAddSeasonModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Season Number
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="e.g. 1"
                  value={newSeasonNumber}
                  onChange={(e) => setNewSeasonNumber(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Unique season identifier number for this show.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSeasonModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
                >
                  {saving ? "Creating..." : "Create Season"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

