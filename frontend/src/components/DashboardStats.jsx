import React, { useEffect, useState } from "react";
import api from "../services/api";

const Stat = ({ label, value, sub, color }) => (
  <div className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${color}`}>
    <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
    <p className="mt-1 text-3xl font-black">{value}</p>
    {sub && <p className="mt-0.5 text-xs opacity-60">{sub}</p>}
  </div>
);

const DashboardStats = ({ tasks, pendingRequests = 0, isAdmin = false, onMetricsReset }) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const pending = total - completed;
  const overdue = tasks.filter(
    (t) => t.status !== "Completed" && new Date(t.deadline_datetime) < new Date()
  ).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const [metrics, setMetrics] = useState({ visitors: 0, downloads: 0 });
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    api.get("/metrics").then((r) => setMetrics(r.data)).catch(() => { });
  }, []);

  const handleReset = async () => {
    if (!window.confirm("Reset visitors and downloads count to zero?")) return;
    setResetting(true);
    try {
      const res = await api.post("/metrics/reset");
      setMetrics(res.data);
      onMetricsReset?.(res.data);
    } catch {
      alert("Failed to reset metrics. Is admin mode active?");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total Tasks"
          value={total}
          sub={`${pending} still pending`}
          color="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/60 text-blue-800 dark:border-blue-800 dark:from-blue-950/60 dark:to-blue-900/30 dark:text-blue-200"
        />
        <Stat
          label="Completed"
          value={completed}
          sub={`${progress}% completion`}
          color="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-800 dark:border-emerald-800 dark:from-emerald-950/60 dark:to-emerald-900/30 dark:text-emerald-200"
        />
        <Stat
          label="Overdue"
          value={overdue}
          sub={overdue > 0 ? "needs attention!" : "all on track ✓"}
          color={overdue > 0
            ? "border-red-200 bg-gradient-to-br from-red-50 to-red-100/60 text-red-800 dark:border-red-800 dark:from-red-950/60 dark:to-red-900/30 dark:text-red-200"
            : "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 text-slate-700 dark:border-slate-700 dark:from-slate-900/60 dark:to-slate-800/30 dark:text-slate-300"
          }
        />
        <Stat
          label="Pending Requests"
          value={pendingRequests}
          sub={pendingRequests > 0 ? "awaiting review" : "no new requests"}
          color={pendingRequests > 0
            ? "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/60 text-amber-800 dark:border-amber-800 dark:from-amber-950/60 dark:to-amber-900/30 dark:text-amber-200"
            : "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 text-slate-700 dark:border-slate-700 dark:from-slate-900/60 dark:to-slate-800/30 dark:text-slate-300"
          }
        />
      </div>

      {/* Visitors + Downloads row */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <span className="text-lg">👁️</span>
          <span className="font-semibold">{metrics.visitors.toLocaleString()}</span>
          <span className="text-xs text-slate-400">visitors</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <span className="text-lg">⬇️</span>
          <span className="font-semibold">{metrics.downloads.toLocaleString()}</span>
          <span className="text-xs text-slate-400">downloads</span>
        </div>
        {isAdmin && (
          <button
            onClick={handleReset}
            disabled={resetting}
            className="ml-auto rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-slate-900 dark:text-red-400"
          >
            {resetting ? "Resetting…" : "Reset Counts"}
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;
