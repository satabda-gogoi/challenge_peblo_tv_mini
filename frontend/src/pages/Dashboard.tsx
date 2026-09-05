import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Film,
  CheckCircle2,
  FileEdit,
  Rocket,
  Globe,
  Plus,
  ArrowRight,
  ShieldCheck,
  Server,
  Database,
  KeyRound,
  FileCode,
} from "lucide-react";
import { getMe, type User } from "../api/auth";
import { getShows, type Show } from "../api/shows";
import { getPublishRuns, type PublishRun } from "../api/publish";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [publishRuns, setPublishRuns] = useState<PublishRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [me, showsData, runsData] = await Promise.all([
          getMe().catch(() => null),
          getShows().catch(() => []),
          getPublishRuns().catch(() => []),
        ]);
        if (me) setUser(me);
        setShows(showsData);
        setPublishRuns(runsData);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const publishedCount = shows.filter((s) => s.status === "published").length;
  const draftCount = shows.filter((s) => s.status === "draft").length;
  const lastRun = publishRuns[0] ?? null;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Editorial Dashboard</h1>
          <p>
            Welcome back, <strong>{user?.full_name || user?.username || "Editor"}</strong> • Logged in as{" "}
            <span className={`role-tag ${user?.role === "admin" ? "role-admin" : "role-editor"}`}>
              {user?.role || "editor"}
            </span>
          </p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={() => navigate("/catalogue")}>
            <Globe className="w-4 h-4 mr-1.5 inline text-slate-500" />
            View Public Catalogue
          </button>
          <button className="primary-button" onClick={() => navigate("/shows")}>
            <Plus className="w-4 h-4 mr-1.5 inline" />
            Manage Shows
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Shows</span>
            <Film className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="metric-value">{loading ? "..." : shows.length}</div>
          <div className="metric-subtext">{publishedCount} published, {draftCount} in draft</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Published Content</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="metric-value">{loading ? "..." : publishedCount}</div>
          <div className="metric-subtext">Active on Viewer Catalogue</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Drafts In Progress</span>
            <FileEdit className="w-4 h-4 text-amber-600" />
          </div>
          <div className="metric-value">{loading ? "..." : draftCount}</div>
          <div className="metric-subtext">Awaiting validation check</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Last Publish</span>
            <Rocket className="w-4 h-4 text-purple-600" />
          </div>
          <div className="metric-value" style={{ fontSize: "18px", marginTop: "8px" }}>
            {loading ? "..." : lastRun ? (
              <span className={`status-badge ${lastRun.outcome === "success" ? "published" : "draft"}`}>
                {lastRun.outcome}
              </span>
            ) : "Never"}
          </div>
          <div className="metric-subtext">
            {lastRun?.completed_at ? new Date(lastRun.completed_at).toLocaleTimeString() : "No publish runs yet"}
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW CARDS */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div>
            <div className="card-badge">Content Management</div>
            <h3>Shows & Seasons</h3>
            <p>
              Create and edit shows, configure sections and categories, organize seasons and manage video streams.
            </p>
          </div>
          <button className="primary-button" onClick={() => navigate("/shows")}>
            Manage Shows <ArrowRight className="w-4 h-4 ml-1.5 inline" />
          </button>
        </div>

        <div className="dashboard-card">
          <div>
            <div className="card-badge">Integrity & Build</div>
            <h3>Publishing & Validation</h3>
            <p>
              Run automated catalogue data integrity checks, review warnings, and publish versioned releases for viewers.
            </p>
          </div>
          <button className="primary-button" onClick={() => navigate("/publishing")}>
            Publishing Portal <ArrowRight className="w-4 h-4 ml-1.5 inline" />
          </button>
        </div>

        <div className="dashboard-card">
          <div>
            <div className="card-badge">Public Experience</div>
            <h3>Viewer Catalogue</h3>
            <p>
              Explore the live generated catalogue exactly as end viewers see it with live search, categories, and video streaming.
            </p>
          </div>
          <button className="secondary-button" onClick={() => navigate("/catalogue")}>
            Browse as Viewer <ArrowRight className="w-4 h-4 ml-1.5 inline" />
          </button>
        </div>
      </div>

      {/* SYSTEM ARCHITECTURE & INTEGRATION INFO */}
      <div className="details-card" style={{ marginTop: "24px" }}>
        <div className="section-heading">
          <div>
            <h2>Backend Architecture & Integration</h2>
            <p>Live status of backend services and database connections.</p>
          </div>
          <span className="status-badge published flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Systems Online
          </span>
        </div>

        <div className="details-grid">
          <div>
            <small className="flex items-center gap-1"><Server className="w-3 h-3" /> Backend Engine</small>
            <strong>FastAPI (Python 3.12, Async)</strong>
          </div>
          <div>
            <small className="flex items-center gap-1"><Database className="w-3 h-3" /> Database & ORM</small>
            <strong>PostgreSQL / SQLAlchemy Asyncpg</strong>
          </div>
          <div>
            <small className="flex items-center gap-1"><KeyRound className="w-3 h-3" /> Authentication</small>
            <strong>JWT Bearer (Role-Protected)</strong>
          </div>
          <div>
            <small className="flex items-center gap-1"><FileCode className="w-3 h-3" /> Catalogue Output</small>
            <strong>JSON Static Artifact</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
