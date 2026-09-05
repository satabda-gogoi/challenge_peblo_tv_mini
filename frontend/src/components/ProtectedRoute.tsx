import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { getMe } from "../api/auth";

export default function ProtectedRoute() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    async function checkAuth() {
      const token =
        localStorage.getItem("access_token");

      if (!token) {
        setChecking(false);
        return;
      }

      try {
        await getMe();
        setAuthenticated(true);
      } catch {
        localStorage.removeItem("access_token");
      } finally {
        setChecking(false);
      }
    }

    checkAuth();
  }, []);

  if (checking) {
    return (
      <div className="page-content">
        Checking authentication...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}
