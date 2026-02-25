import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminModal from "./components/AdminModal.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import api from "./services/api";

// ─── App Shell ─────────────────────────────────────────────────────────────────
const AppShell = ({ children, onOpenAdmin, metrics, pendingCount }) => {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, logout } = useAuth();

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left — Logo + Nav */}
          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-7 w-7" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#lg)" />
                <rect x="7" y="10" width="18" height="15" rx="2" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
                <rect x="10" y="14" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
                <rect x="15" y="14" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="10" y="19" width="4" height="2" rx="1" fill="white" fillOpacity="0.6" />
                <line x1="11" y1="8" x2="11" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="21" y1="8" x2="21" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2563eb" />
                    <stop offset="1" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              Task Calendar
            </Link>
            <nav className="flex gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? "font-semibold text-blue-600 dark:text-blue-400"
                    : "transition hover:text-slate-800 dark:hover:text-slate-200"
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive
                    ? "font-semibold text-blue-600 dark:text-blue-400"
                    : "transition hover:text-slate-800 dark:hover:text-slate-200"
                }
              >
                Dashboard
                {pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            </nav>
          </div>

          {/* Right — Theme + Admin */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            {isAdmin ? (
              <button
                onClick={logout}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Admin Active
              </button>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Admin Mode
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>

      <footer className="mt-8 border-t border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-[11px] text-slate-400 sm:flex-row dark:text-slate-500">
          <span>Secure Academic Task Calendar — Admin key required to modify tasks</span>
          <span className="flex items-center gap-3">
            <span>
              Visitors: <span className="font-semibold text-slate-600 dark:text-slate-300">{metrics?.visitors ?? 0}</span>
              {" · "}
              Downloads: <span className="font-semibold text-slate-600 dark:text-slate-300">{metrics?.downloads ?? 0}</span>
            </span>
            <a
              href="mailto:msjanakiram2005@gmail.com"
              className="text-blue-500 hover:text-blue-600 hover:underline dark:text-blue-400"
            >
              Contact Admin
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
};

// ─── Root App ──────────────────────────────────────────────────────────────────
const App = () => {
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [metrics, setMetrics] = useState({ visitors: 0, downloads: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try { const res = await api.get("/metrics"); setMetrics(res.data); } catch { }
    };
    const trackVisit = async () => {
      try { const res = await api.post("/metrics/visit"); setMetrics(res.data); } catch { }
    };
    load();
    if (!localStorage.getItem("satc_hasVisited")) {
      trackVisit();
      localStorage.setItem("satc_hasVisited", "1");
    }
  }, []);

  useEffect(() => {
    let intervalId;
    const poll = async () => {
      if ("Notification" in window) {
        try {
          const res = await api.get("/reminders");
          const tasks = res.data.tasks || [];
          if (tasks.length > 0 && Notification.permission === "granted") {
            tasks.forEach((task) => {
              const deadline = task.deadline_datetime
                ? new Date(task.deadline_datetime).toLocaleString()
                : "";
              new Notification(`${task.title || "Upcoming task"}${task.subject ? ` (${task.subject})` : ""}`, {
                body: deadline ? `Due: ${deadline}` : "Approaching deadline",
              });
            });
          }
        } catch { }
      }
      if (isAdmin) {
        try {
          const res = await api.get("/task-requests");
          setPendingCount((res.data || []).length);
        } catch { }
      } else {
        setPendingCount(0);
      }
    };

    poll();
    intervalId = setInterval(poll, 30000);
    return () => clearInterval(intervalId);
  }, [isAdmin]);

  return (
    <>
      <AppShell
        onOpenAdmin={() => setAdminModalOpen(true)}
        metrics={metrics}
        pendingCount={pendingCount}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                onMetricsUpdate={(d) => d && setMetrics((m) => ({ ...m, ...d }))}
                onPendingCountChange={setPendingCount}
              />
            }
          />
        </Routes>
      </AppShell>
      <AdminModal open={adminModalOpen} onClose={() => setAdminModalOpen(false)} />
    </>
  );
};

export default App;
