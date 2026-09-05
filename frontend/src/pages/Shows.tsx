import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Search, ArrowRight, Trash2 } from "lucide-react";
import {
  createShow,
  deleteShow,
  getCategories,
  getShows,
  type Category,
  type Show,
} from "../api/shows";

export default function Shows() {
  const navigate = useNavigate();

  const [shows, setShows] = useState<Show[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [section, setSection] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const [showData, categoryData] = await Promise.all([
        getShows(),
        getCategories(),
      ]);

      setShows(showData);
      setCategories(categoryData);
    } catch {
      setError("Failed to load shows.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function toggleCategory(id: number) {
    setSelectedCategories((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createShow({
        title: title.trim(),
        slug: slug.trim(),
        synopsis: synopsis.trim() || null,
        section: section || null,
        category_ids: selectedCategories,
      });

      setTitle("");
      setSlug("");
      setSynopsis("");
      setSection("");
      setSelectedCategories([]);
      setShowCreateForm(false);

      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to create show.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this show and all its seasons/episodes?")) {
      return;
    }

    try {
      await deleteShow(id);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to delete show.";
      setError(msg);
    }
  }

  const filteredShows = shows.filter((show) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      show.title.toLowerCase().includes(q) ||
      show.slug.toLowerCase().includes(q) ||
      show.categories.some((cat) => cat.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return <div className="page-content">Loading shows...</div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Shows & Seasons</h1>
          <p>Create, manage and organize your catalogue content.</p>
        </div>

        <button
          className="primary-button flex items-center gap-1.5"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? (
            <>
              <X className="w-4 h-4" /> Close Form
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Create New Show
            </>
          )}
        </button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: "20px" }}>{error}</div>}

      {/* COLLAPSIBLE CREATE SHOW FORM */}
      {showCreateForm && (
        <form className="form-card" onSubmit={handleCreate}>
          <div className="section-heading">
            <div>
              <h2>New Show Metadata</h2>
              <p>Add a new show entry to the catalogue draft.</p>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>Title</label>
              <input
                placeholder="e.g. Stranger Adventures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>Slug</label>
              <input
                placeholder="e.g. stranger-adventures"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                <option value="">No section</option>
                <option value="featured">Featured</option>
                <option value="series">Series</option>
                <option value="minisodes">Minisodes</option>
                <option value="songs">Songs</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>Synopsis</label>
            <textarea
              placeholder="Detailed show description or synopsis..."
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600 }}>Categories</label>
            <div className="tag-list">
              {categories.map((category) => (
                <label key={category.id} className="tag-item">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Creating Show..." : "Save Show"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "16px" }}>
        <div style={{ position: "relative", maxWidth: "340px", width: "100%" }}>
          <Search className="w-4 h-4 text-slate-400" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            style={{ width: "100%", paddingLeft: "36px" }}
            placeholder="Filter by title, slug, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Showing {filteredShows.length} of {shows.length} show{shows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* SHOWS TABLE */}
      <div className="shows-table">
        <div className="table-header">
          <div>Title & Slug</div>
          <div>Section</div>
          <div>Categories</div>
          <div>Status</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {filteredShows.map((show) => (
          <div className="table-row" key={show.id}>
            <div>
              <strong>{show.title}</strong>
              <small style={{ display: "block", color: "var(--text-muted)", marginTop: "2px" }}>/{show.slug}</small>
            </div>
            <div>{show.section || "-"}</div>
            <div>
              <div className="category-tags">
                {show.categories.map((cat) => (
                  <span className="category-pill" key={cat}>
                    {cat}
                  </span>
                ))}
                {show.categories.length === 0 && <span style={{ color: "var(--text-muted)" }}>-</span>}
              </div>
            </div>
            <div>
              <span className={`status-badge ${show.status}`}>
                {show.status}
              </span>
            </div>
            <div className="table-actions">
              <button
                className="secondary-button flex items-center gap-1"
                onClick={() => navigate(`/shows/${show.id}`)}
              >
                Open <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                className="danger-button flex items-center gap-1"
                onClick={() => handleDelete(show.id)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}

        {filteredShows.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
            {searchQuery ? "No shows match your filter." : "No shows created yet. Click '+ Create New Show' to get started."}
          </div>
        )}
      </div>
    </div>
  );
}
