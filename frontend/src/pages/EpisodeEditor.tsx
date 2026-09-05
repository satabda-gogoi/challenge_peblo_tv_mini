import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Video,
  Image as ImageIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Upload,
  RefreshCw,
} from "lucide-react";

import {
  getEpisode,
  updateEpisode,
  type Episode,
} from "../api/episode";

import {
  createEpisodeContent,
  deleteEpisodeContent,
  getEpisodeContents,
  updateEpisodeContent,
  type EpisodeContent,
} from "../api/content";

import {
  createArtwork,
  deleteArtwork,
  getEpisodeArtworks,
  uploadEpisodeArtwork,
  type Artwork,
} from "../api/artworks";

import { getMediaUrl } from "../api/client";

import {
  validateEpisode,
  type ValidationResponse,
} from "../api/validation";

export default function EpisodeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const episodeId = Number(id);

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [contents, setContents] = useState<EpisodeContent[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [validation, setValidation] =
    useState<ValidationResponse | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [sourceEpisodeId, setSourceEpisodeId] = useState("");
  const [duration, setDuration] = useState("");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === "admin";

  const [status, setStatus] = useState("draft");

  const [language, setLanguage] = useState("en");
  const [videoUri, setVideoUri] = useState("");

  const [artworkType, setArtworkType] = useState("poster");
  const [storageUri, setStorageUri] = useState("");
  const [altText, setAltText] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [sizeBytes, setSizeBytes] = useState("");
  const [mimeType, setMimeType] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});

  async function handleSlotUpload(type: string, file: File) {
    try {
      setUploadingSlot(type);
      setSlotErrors((prev) => ({ ...prev, [type]: "" }));

      if (file.size > 200 * 1024) {
        setSlotErrors((prev) => ({
          ...prev,
          [type]: `File size (${Math.round(file.size / 1024)} KB) exceeds the 200 KB ceiling.`,
        }));
        setUploadingSlot(null);
        return;
      }

      await uploadEpisodeArtwork(episodeId, type, file);
      await loadData();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to upload artwork.";
      setSlotErrors((prev) => ({ ...prev, [type]: detail }));
    } finally {
      setUploadingSlot(null);
    }
  }

  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  async function saveVideoEdit(contentId: number) {
    try {
      setSaving(true);
      setError("");

      await updateEpisodeContent(contentId, {
        video_uri: editVideoUri,
      });

      setEditingContentId(null);
      setEditVideoUri("");

      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to update video.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const [editVideoUri, setEditVideoUri] = useState("");

  async function loadData() {
    try {
      setError("");

      const [episodeData, contentData, artworkData] =
        await Promise.all([
          getEpisode(episodeId),
          getEpisodeContents(episodeId),
          getEpisodeArtworks(episodeId),
        ]);

      setEpisode(episodeData);
      setContents(contentData);
      setArtworks(artworkData);

      setTitle(episodeData.title);
      setDescription(episodeData.description || "");
      setEpisodeNumber(String(episodeData.episode_number));
      setSourceEpisodeId(episodeData.source_episode_id || "");
      setDuration(
        episodeData.duration_seconds != null
          ? String(episodeData.duration_seconds)
          : ""
      );
      setStatus(episodeData.status);

      try {
        const validationData = await validateEpisode(
          episodeId
        );
        setValidation(validationData);
      } catch {
        // Validation is optional for loading the editor.
      }
    } catch {
      setError("Failed to load episode.");
    }
  }

  useEffect(() => {
    if (episodeId) {
      loadData();
    }
  }, [episodeId]);

  async function saveEpisode(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await updateEpisode(episodeId, {
        title,
        description: description || null,
        episode_number: Number(episodeNumber),
        source_episode_id: sourceEpisodeId || undefined,
        duration_seconds: duration
          ? Number(duration)
          : null,
        status,
      });

      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to update episode.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function addVideo(e: React.FormEvent) {
    e.preventDefault();

    if (!videoUri.trim()) {
      setError("Video URI is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createEpisodeContent(episodeId, {
        language,
        video_uri: videoUri.trim(),
      });

      setVideoUri("");
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to add video.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function removeVideo(id: number) {
    if (!window.confirm("Remove this video content?")) {
      return;
    }

    try {
      await deleteEpisodeContent(id);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to remove video.";
      setError(msg);
    }
  }

  async function addArtwork(e: React.FormEvent) {
    e.preventDefault();

    if (!storageUri.trim()) {
      setError("Artwork storage URI is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createArtwork(episodeId, {
        type: artworkType,
        storage_uri: storageUri.trim(),
        alt_text: altText || null,
        width: width ? Number(width) : null,
        height: height ? Number(height) : null,
        size_bytes: sizeBytes
          ? Number(sizeBytes)
          : null,
        mime_type: mimeType || null,
      });

      setStorageUri("");
      setAltText("");
      setWidth("");
      setHeight("");
      setSizeBytes("");
      setMimeType("");

      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to add artwork.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function removeArtwork(id: number) {
    if (!window.confirm("Remove this artwork?")) {
      return;
    }

    try {
      await deleteArtwork(id);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to remove artwork.";
      setError(msg);
    }
  }

  if (!episode) {
    return (
      <div className="page-content">
        {error || "Loading episode..."}
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <button
            className="secondary-button inline-flex items-center gap-1.5"
            onClick={() => navigate(-1)}
            style={{ marginBottom: "12px" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h1>Edit Episode</h1>
          <p>
            E{episode.episode_number} — {episode.title}
          </p>
        </div>

        <span className={`status-badge ${status}`}>
          {status}
        </span>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* EPISODE INFORMATION */}
      <div className="form-card">
        <h2>Episode Information</h2>

        <form onSubmit={saveEpisode}>
          <div className="form-grid">
            <div>
              <label>Source Episode ID</label>
              <input
                value={sourceEpisodeId}
                onChange={(e) =>
                  setSourceEpisodeId(e.target.value)
                }
              />
            </div>

            <div>
              <label>Episode Number</label>
              <input
                type="number"
                min="1"
                value={episodeNumber}
                onChange={(e) =>
                  setEpisodeNumber(e.target.value)
                }
              />
            </div>

            <div>
              <label>Title</label>
              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
              />
            </div>

            <div>
              <label>Duration (seconds)</label>
              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value)
                }
              />
            </div>

            {isAdmin && (
              <div>
                <label>Status</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">
                    Published
                  </option>
                </select>
              </div>
            )}
          </div>

          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Episode"}
          </button>
        </form>
      </div>

      {/* LANGUAGE VIDEOS */}
      <div className="editor-card">
        <div className="section-heading">
          <div>
            <h2 className="flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-600" /> Language Videos
            </h2>
            <p>
              Video streams for English, Hindi or other languages.
            </p>
          </div>
        </div>

        <div className="content-list">
          {contents.map((content) => (
            <div className="content-row" key={content.id}>
              {editingContentId === content.id ? (
                <>
                  <div style={{ flex: 1 }}>
                    <strong>
                      {content.language === "en"
                        ? "English"
                        : "Hindi"}
                    </strong>

                    <input
                      value={editVideoUri}
                      onChange={(e) =>
                        setEditVideoUri(e.target.value)
                      }
                    />
                  </div>

                  <button
                    onClick={() =>
                      saveVideoEdit(content.id)
                    }
                    disabled={saving}
                  >
                    Save
                  </button>

                  <button
                    onClick={() =>
                      setEditingContentId(null)
                    }
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <strong>
                      {content.language === "en"
                        ? "English"
                        : "Hindi"}
                    </strong>

                    <small>{content.video_uri}</small>
                  </div>

                  <div className="episode-actions">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        setEditingContentId(content.id);
                        setEditVideoUri(
                          content.video_uri
                        );
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>

                    <button
                      className="danger-button inline-flex items-center gap-1"
                      onClick={() =>
                        removeVideo(content.id)
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {contents.length === 0 && (
            <p className="muted">
              No language content added yet.
            </p>
          )}
        </div>

        <form className="sub-form" onSubmit={addVideo}>
          <h3>Add Language Video</h3>

          <div className="form-grid">
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value)
              }
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>

            <input
              placeholder="Video URI / URL"
              value={videoUri}
              onChange={(e) =>
                setVideoUri(e.target.value)
              }
            />
          </div>

          <button className="primary-button inline-flex items-center gap-1.5" type="submit" disabled={saving}>
            <Plus className="w-4 h-4" /> Add Video
          </button>
        </form>
      </div>

      {/* 3 DEDICATED ARTWORK SLOTS */}
      <div className="editor-card">
        <div className="section-heading">
          <div>
            <h2 className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600" /> Episode Artwork & Assets
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload exactly 3 artwork assets matching strict catalog specifications. Files are validated for dimensions, aspect ratio, and 200 KB ceiling.
            </p>
          </div>
        </div>

        {/* 3 Upload Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
          {[
            {
              type: "poster",
              title: "Poster Card",
              ratio: "2:3 Ratio",
              dims: "600 × 900 px",
              aspect: "aspect-[2/3]",
              help: "Vertical portrait for catalogue rails & show cards",
            },
            {
              type: "banner",
              title: "Hero Banner",
              ratio: "16:9 Ratio",
              dims: "1280 × 720 px",
              aspect: "aspect-[16/9]",
              help: "Wide widescreen for hero banner & backdrops",
            },
            {
              type: "thumbnail",
              title: "Episode Thumbnail",
              ratio: "16:9 Ratio",
              dims: "640 × 360 px",
              aspect: "aspect-[16/9]",
              help: "Landscape preview for episode list & video player",
            },
          ].map((slot) => {
            const currentArt = artworks.find(
              (a) => a.type.toLowerCase() === slot.type.toLowerCase()
            );
            const isUploading = uploadingSlot === slot.type;
            const slotErr = slotErrors[slot.type];

            return (
              <div
                key={slot.type}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-indigo-200 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-sm">
                      {slot.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        currentArt
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {currentArt ? "Uploaded" : "Missing"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">{slot.help}</p>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-600 mb-3 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <span className="font-medium text-indigo-600">{slot.ratio}</span>
                    <span>•</span>
                    <span>{slot.dims}</span>
                    <span>•</span>
                    <span>&lt; 200 KB</span>
                  </div>

                  {/* Preview box */}
                  <div
                    className={`${slot.aspect} w-full bg-slate-200/70 rounded-lg overflow-hidden flex items-center justify-center relative border border-slate-300/80 mb-3`}
                  >
                    {currentArt ? (
                      <img
                        src={getMediaUrl(currentArt.storage_uri)}
                        alt={currentArt.alt_text || slot.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/600x400?text=Preview+Unavailable";
                        }}
                      />
                    ) : (
                      <div className="text-center p-3 text-slate-400 flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 mb-1 text-slate-300" />
                        <span className="text-xs">No artwork uploaded</span>
                      </div>
                    )}

                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-medium gap-1.5 p-2 text-center">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Validating & Uploading...
                      </div>
                    )}
                  </div>

                  {/* Metadata display if present */}
                  {currentArt && (
                    <div className="text-xs text-slate-600 space-y-1 mb-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dimensions:</span>
                        <span className="font-medium">
                          {currentArt.width} × {currentArt.height} px
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">File Size:</span>
                        <span className="font-medium">
                          {currentArt.size_bytes
                            ? `${Math.round(currentArt.size_bytes / 1024)} KB`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="truncate text-slate-400 text-[11px]" title={currentArt.storage_uri}>
                        {currentArt.storage_uri}
                      </div>
                    </div>
                  )}

                  {/* Human-readable error message */}
                  {slotErr && (
                    <div className="p-2.5 mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>{slotErr}</span>
                    </div>
                  )}
                </div>

                {/* Upload Action */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2">
                  <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{currentArt ? "Replace" : `Upload ${slot.type}`}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleSlotUpload(slot.type, file);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>

                  {currentArt && (
                    <button
                      type="button"
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                      title="Delete Artwork"
                      onClick={() => removeArtwork(currentArt.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Advanced Manual Artwork Form Accordion */}
        <details className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-800">
            Advanced: Enter Raw Artwork URI or Custom Metadata
          </summary>
          <form className="sub-form mt-3" onSubmit={addArtwork}>
            <div className="form-grid">
              <select
                value={artworkType}
                onChange={(e) => setArtworkType(e.target.value)}
              >
                <option value="poster">Poster</option>
                <option value="banner">Banner</option>
                <option value="thumbnail">Thumbnail</option>
              </select>

              <input
                placeholder="Storage URI / URL"
                value={storageUri}
                onChange={(e) => setStorageUri(e.target.value)}
              />

              <input
                placeholder="Width"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />

              <input
                placeholder="Height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />

              <input
                placeholder="Size in bytes"
                type="number"
                value={sizeBytes}
                onChange={(e) => setSizeBytes(e.target.value)}
              />

              <input
                placeholder="MIME type e.g. image/jpeg"
                value={mimeType}
                onChange={(e) => setMimeType(e.target.value)}
              />
            </div>

            <input
              placeholder="Alt text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              style={{ marginTop: "12px", marginBottom: "12px" }}
            />

            <button className="primary-button inline-flex items-center gap-1.5" type="submit" disabled={saving}>
              <Plus className="w-4 h-4" /> Add Artwork
            </button>
          </form>
        </details>
      </div>

      {/* VALIDATION */}
      <div className="validation-card">
        <div className="section-heading">
          <div>
            <h2 className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" /> Validation
            </h2>
            <p>
              Check whether this episode is ready for
              publishing.
            </p>
          </div>

          {validation && (
            <span
              className={`status-badge ${
                validation.valid
                  ? "published"
                  : "draft"
              }`}
            >
              {validation.valid
                ? "Valid"
                : "Needs Fixes"}
            </span>
          )}
        </div>

        {!validation && (
          <p className="muted">
            Validation information unavailable.
          </p>
        )}

        {validation?.errors.map((issue, index) => (
          <div className="validation-error flex items-start gap-2" key={index}>
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <strong>{issue.field}</strong>
              <span className="block">{issue.message}</span>
            </div>
          </div>
        ))}

        {validation?.warnings.map((issue, index) => (
          <div className="validation-warning flex items-start gap-2" key={index}>
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>{issue.field}</strong>
              <span className="block">{issue.message}</span>
            </div>
          </div>
        ))}

        {validation?.valid &&
          validation.errors.length === 0 &&
          validation.warnings.length === 0 && (
            <p className="validation-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> This episode passes validation.
            </p>
          )}
      </div>
    </div>
  );
}
