import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tv, ArrowLeft } from "lucide-react";
import { login } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await login(
        username,
        password,
      );

      localStorage.setItem(
        "access_token",
        data.access_token,
      );

      navigate("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: string }; status?: number };
        message?: string;
      };
      if (!axiosErr.response) {
        setError(
          "Unable to reach backend server. Please make sure the backend is running at http://127.0.0.1:8000",
        );
      } else {
        setError(
          axiosErr.response.data?.detail || "Invalid username or password",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3 shadow-xs">
            <Tv className="w-7 h-7" />
          </div>
          <h1>Peblo CMS</h1>
          <p>Editorial sign in to manage content</p>
        </div>

        <form onSubmit={handleSubmit}>

          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter password"
              required
            />
          </label>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => navigate("/catalogue")}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                fontSize: "13px",
                cursor: "pointer",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Viewer Catalogue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
