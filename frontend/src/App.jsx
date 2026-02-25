import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminModal from "./components/AdminModal.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useSection } from "./context/SectionContext.jsx";
import api from "./services/api";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX"];

// ─── Section Picker ────────────────────────────────────────────────────────────
const SectionPicker = () => {
  const { selectedSection, changeSection } = useSection();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
        title="Select class section"
      >
        <span>§</span>
        <span>{selectedSection ? ROMAN[selectedSection - 1] : "All"}</span>
        <span className="text-indigo-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Class Sections
          </p>
          <button
            onClick={() => { changeSection(null); setOpen(false); }}
            className={`mb-1 w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium transition ${selectedSection === null
                ? "bg-indigo-600 text-white"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
          >
            All Sections
          </button>
          <div className="grid grid-cols-4 gap-1">
            {ROMAN.map((r, i) => (
              <button
                key={r}
                onClick={() => { changeSection(i + 1); setOpen(false); }}
                className={`rounded-lg py-1.5 text-center text-xs font-bold transition ${selectedSection === i + 1
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-400 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300"
                  }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
              className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-[10px] font-black text-white shadow">
                TC
              </span>
              Task Calendar
            </Link>
            <nav className="flex gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "hover:text-slate-800 dark:hover:text-slate-200 transition"
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "hover:text-slate-800 dark:hover:text-slate-200 transition"
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

          {/* Right — Section Picker + Theme + Admin */}
          <div className="flex items-center gap-2">
            <SectionPicker />
            <button
              onClick={toggleTheme}
              className="rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
            {isAdmin ? (
              <button
                onClick={logout}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                ✓ Admin Active
              </button>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="rounded-full bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-slate-700 hover:to-slate-800 dark:from-slate-100 dark:to-slate-200 dark:text-slate-900"
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

      <footer className="mt-8 border-t border-slate-200 px-4 py-4 text-center text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <span>Secure Academic Task Calendar — Admin key required to modify tasks</span>
          <span>
            Visitors: <span className="font-semibold text-slate-600 dark:text-slate-300">{metrics?.visitors ?? 0}</span>
            {" · "}
            Downloads: <span className="font-semibold text-slate-600 dark:text-slate-300">{metrics?.downloads ?? 0}</span>
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

  // Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Metrics
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

  // Reminder + pending requests polling
  useEffect(() => {
    let intervalId;
    const poll = async () => {
      // Reminders
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
      // Pending count badge for admin
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
