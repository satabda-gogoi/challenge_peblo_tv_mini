import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Tv,
  LayoutDashboard,
  Film,
  Send,
  Globe,
  LogOut,
} from "lucide-react";
import { getMe, logout, type User } from "../api/auth";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {
        logout();
        navigate("/login");
      });
  }, [navigate]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h2>Peblo CMS</h2>
            <small>Editorial & Admin</small>
          </div>
        </div>

        {user && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {(user.username || "U").charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user.full_name || user.username}</span>
              <span className={`role-tag role-${user.role.toLowerCase()}`}>
                {user.role}
              </span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="nav-group-title">Management</div>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">
              <LayoutDashboard className="w-4 h-4" />
            </span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/shows"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">
              <Film className="w-4 h-4" />
            </span>
            <span>Shows</span>
          </NavLink>

          {user?.role === "admin" && (
            <NavLink
              to="/publishing"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">
                <Send className="w-4 h-4" />
              </span>
              <span>Publishing</span>
            </NavLink>
          )}

          <div className="nav-group-title">Viewer</div>

          <NavLink
            to="/catalogue"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">
              <Globe className="w-4 h-4" />
            </span>
            <span>Viewer Catalogue</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
