import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  History,
  ShieldAlert,
  Info,
  RotateCcw,
} from "lucide-react";

import {
  publishCatalogue,
  unpublishCatalogue,
  getPublishRuns,
  type PublishResponse,
  type PublishRun,
} from "../api/publish";

import {
  validateCatalogue,
  type CatalogueValidation,
} from "../api/catalogueValidation";

import { getMe, type User } from "../api/auth";
import { getShows, type Show } from "../api/shows";

export default function Publishing() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [allShows, setAllShows] = useState<Show[]>([]);
  const [validation, setValidation] =
    useState<CatalogueValidation | null>(null);

  const [runs, setRuns] = useState<PublishRun[]>([]);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  const [result, setResult] =
    useState<PublishResponse | null>(null);

  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [validationData, runsData, userData, showsData] =
        await Promise.all([
          validateCatalogue().catch(() => null),
          getPublishRuns().catch(() => []),
          getMe().catch(() => null),
          getShows().catch(() => []),
        ]);

      setValidation(validationData);
      setRuns(runsData);
      if (userData) setUser(userData);
      setAllShows(showsData);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to load publishing data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleValidate() {
    try {
      setChecking(true);
      setError("");
      setResult(null);

      const data = await validateCatalogue();
      setValidation(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Validation failed.";
      setError(msg);
    } finally {
      setChecking(false);
    }
  }

  async function handlePublish() {
    if (!validation?.valid) {
      setError(
        "The catalogue has validation errors. Fix them before publishing."
      );
      return;
    }

    if (
      !window.confirm(
        "Publish the current catalogue?"
      )
    ) {
      return;
    }

    try {
      setPublishing(true);
      setError("");
      setResult(null);

      const data = await publishCatalogue();

      setResult(data);

      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Publishing failed.";
      setError(msg);
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (
      !window.confirm(
        "Are you sure you want to unpublish the live catalogue? All published content will revert to Draft mode and be removed from the public viewer catalogue."
      )
    ) {
      return;
    }

    try {
      setUnpublishing(true);
      setError("");
      setResult(null);

      const data = await unpublishCatalogue();
      setResult(data);

      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Unpublishing failed.";
      setError(msg);
    } finally {
      setUnpublishing(false);
    }
  }


  if (loading) {
    return (
      <div className="page-content">
        Loading publishing information...
      </div>
    );
  }

  if (!loading && user && user.role !== "admin") {
    return (
      <div className="page-content">
        <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Administrator Access Required
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Publishing and catalogue deployment is restricted to administrators. As an editor, you can create shows, upload and validate artwork, and configure media streams.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate("/shows")}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              Manage Shows
            </button>
          </div>
        </div>
      </div>
    );
  }

  const draftShows = allShows.filter((s) => s.status === "draft");

  const errorCount =
    validation?.shows.reduce(
      (total, show) => total + show.errors.length,
      0
    ) || 0;

  const warningCount =
    validation?.shows.reduce(
      (total, show) => total + show.warnings.length,
      0
    ) || 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Publishing</h1>
          <p>
            Validate and publish the content catalogue.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {draftShows.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3 mb-6">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold block">
              {draftShows.length} Show{draftShows.length !== 1 ? "s" : ""} in Draft Status
            </strong>
            <p className="text-xs text-amber-800 leading-relaxed">
              Draft shows ({draftShows.map((s) => `"${s.title}"`).join(", ")}) are preserved in the CMS but omitted from the live viewer catalogue. To include a show in the public release, go to{" "}
              <button
                onClick={() => navigate("/shows")}
                className="underline font-bold text-amber-950 hover:text-indigo-600 cursor-pointer"
              >
                Shows
              </button>{" "}
              and toggle its status to <strong>Published</strong>.
            </p>
          </div>
        </div>
      )}

      {/* VALIDATION SUMMARY */}
      <div className="publish-summary">
        <div className="summary-card">
          <span>Catalogue Status</span>

          <strong
            className={
              !validation
                ? "text-slate-500"
                : validation.valid
                ? "text-success"
                : "text-danger"
            }
          >
            {!validation
              ? "Not Checked"
              : validation.valid
              ? "Ready to Publish"
              : validation.shows.length === 0
              ? "No Published Shows"
              : "Needs Fixes"}
          </strong>
        </div>

        <div className="summary-card">
          <span>Errors</span>
          <strong className={errorCount > 0 ? "text-danger" : ""}>{errorCount}</strong>
        </div>

        <div className="summary-card">
          <span>Warnings</span>
          <strong>{warningCount}</strong>
        </div>

        <div className="summary-card">
          <span>Shows Checked</span>
          <strong>
            {validation?.shows.length || 0}
          </strong>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="publish-actions flex flex-wrap items-center gap-3">
        <button
          className="secondary-button inline-flex items-center gap-2"
          onClick={handleValidate}
          disabled={checking}
        >
          <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          {checking
            ? "Checking..."
            : "Validate Catalogue"}
        </button>

        <div className="flex flex-col gap-1">
          <button
            className="primary-button inline-flex items-center gap-2"
            onClick={handlePublish}
            disabled={
              publishing || unpublishing || !validation?.valid
            }
          >
            <Upload className={`w-4 h-4 ${publishing ? "animate-bounce" : ""}`} />
            {publishing
              ? "Publishing..."
              : "Publish Catalogue"}
          </button>
          {validation && !validation.valid && (
            <span className="text-xs text-slate-500">
              {validation.shows.length === 0
                ? "No published shows to publish"
                : `Fix ${errorCount} error${errorCount !== 1 ? "s" : ""} to enable publishing`}
            </span>
          )}
          {!validation && (
            <span className="text-xs text-slate-500">Run validation first</span>
          )}
        </div>

        <button
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          onClick={handleUnpublish}
          disabled={unpublishing || publishing}
        >
          <RotateCcw className={`w-4 h-4 ${unpublishing ? "animate-spin" : ""}`} />
          {unpublishing ? "Unpublishing..." : "Unpublish Catalogue (Revert to Draft)"}
        </button>
      </div>

      {/* PUBLISH RESULT */}
      {result && (
        <div
          className={
            result.outcome === "success"
              ? "publish-success"
              : result.outcome === "unpublished"
              ? "p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 mb-6 shadow-xs"
              : "publish-failure"
          }
        >
          <h2 className="flex items-center gap-2 font-bold text-base">
            {result.outcome === "success" ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Catalogue Published Successfully
              </>
            ) : result.outcome === "unpublished" ? (
              <>
                <RotateCcw className="w-5 h-5 text-amber-600" /> Catalogue Unpublished & Reverted to Draft
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-rose-600" /> Publishing Failed
              </>
            )}
          </h2>

          {result.outcome === "unpublished" ? (
            <p className="mt-2 text-sm text-amber-800 leading-relaxed">
              The live content catalogue has been unpublished and all content reverted to Draft status. Viewers will see the "No Published Catalogue Yet" state until the next publish run.
            </p>
          ) : (
            <>
              <p>
                Shows: <strong>{result.shows_count}</strong>
              </p>

              <p>
                Episodes:{" "}
                <strong>{result.episodes_count}</strong>
              </p>

              {result.catalogue_uri && (
                <p>
                  Catalogue:{" "}
                  <code>{result.catalogue_uri}</code>
                </p>
              )}

              {result.error_message && (
                <p>{result.error_message}</p>
              )}

              {result.outcome === "success" && (
                <div style={{ marginTop: "16px" }}>
                  <button
                    className="primary-button inline-flex items-center gap-1.5"
                    onClick={() => navigate("/catalogue")}
                  >
                    View Live Catalogue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}


      {/* VALIDATION DETAILS */}
      <div className="editor-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="!mb-0">Validation Details</h2>
          {validation && !validation.valid && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              {errorCount} blocking error{errorCount !== 1 ? "s" : ""} — publish disabled
            </span>
          )}
          {validation && validation.valid && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              All checks passed
            </span>
          )}
        </div>

        {/* Pre-publish requirements hint */}
        {validation && !validation.valid && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed space-y-1">
            <p className="font-semibold">Each published show must meet ALL of these requirements before the catalogue can be published:</p>
            <ul className="list-disc ml-4 space-y-0.5 text-rose-700">
              <li>At least <strong>one season</strong> (season number ≥ 1)</li>
              <li>At least <strong>one published episode</strong> in that season</li>
              <li>Each published episode needs a <strong>positive duration</strong>, <strong>video stream</strong>, and <strong>3 artworks</strong> (poster 600×900, banner 1280×720, thumbnail 640×360)</li>
              <li>Show must have a <strong>valid section</strong> (featured / series / minisodes / songs) and at least <strong>one category</strong></li>
            </ul>
            <p className="text-rose-600 mt-1">Fix the issues below, then click <strong>Validate Catalogue</strong> to re-check before publishing.</p>
          </div>
        )}

        {!validation && (
          <p className="muted">
            Validation has not been run yet. Click <strong>Validate Catalogue</strong> above to check for issues.
          </p>
        )}

        {validation && validation.shows.length === 0 && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm text-center">
            <p className="font-medium">No published shows found.</p>
            <p className="text-xs text-slate-500 mt-1">
              Mark at least one show as <strong>Published</strong> in{" "}
              <button
                onClick={() => navigate("/shows")}
                className="underline text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Shows
              </button>{" "}
              before running a publish.
            </p>
          </div>
        )}

        {validation?.shows.map((show) => (
          <div
            className="validation-show"
            key={show.show_id}
          >
            <div className="validation-show-header">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <strong className="truncate">{show.title}</strong>
                {!show.valid && (
                  <button
                    onClick={() => navigate(`/shows/${show.show_id}`)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Fix this show <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <span
                className={`status-badge shrink-0 ${
                  show.valid
                    ? "published"
                    : "draft"
                }`}
              >
                {show.valid
                  ? "Valid"
                  : "Invalid"}
              </span>
            </div>

            {show.errors.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {show.errors.map((issue, index) => (
                  <div
                    className="validation-error flex items-start gap-2"
                    key={`error-${index}`}
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-xs font-bold text-rose-700 uppercase tracking-wide">{issue.field}</strong>
                      <span className="block text-sm">{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {show.warnings.map((issue, index) => (
              <div
                className="validation-warning flex items-start gap-2"
                key={`warning-${index}`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-xs font-bold text-amber-700 uppercase tracking-wide">{issue.field}</strong>
                  <span className="block text-sm">{issue.message}</span>
                </div>
              </div>
            ))}

            {show.valid &&
              show.errors.length === 0 &&
              show.warnings.length === 0 && (
                <p className="validation-success flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No issues found.
                </p>
              )}
          </div>
        ))}
      </div>

      {/* HISTORY */}
      <div className="editor-card">
        <h2 className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" /> Publish History
        </h2>

        {runs.length === 0 && (
          <p className="muted">
            No publish runs yet.
          </p>
        )}

        {runs.length > 0 && (
          <div className="publish-history">
            {runs.map((run) => (
              <div
                className="publish-history-row"
                key={run.id}
              >
                <div>
                  <strong>
                    Publish Run #{run.id}
                  </strong>

                  <small>
                    {new Date(
                      run.created_at
                    ).toLocaleString()}
                  </small>
                </div>

                <div>
                  <span
                    className={`status-badge ${
                      run.outcome === "success"
                        ? "published"
                        : "draft"
                    }`}
                  >
                    {run.outcome}
                  </span>
                </div>

                <div>
                  {run.shows_count} shows
                  <br />
                  {run.episodes_count} episodes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
