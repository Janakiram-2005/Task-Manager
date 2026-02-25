import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminModal from "./components/AdminModal.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import api from "./services/api";

const AppShell = ({ children, onOpenAdmin, metrics }) => {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4 sm:justify-start">
            <Link
              to="/"
              className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50"
            >
              Task Calendar
            </Link>
            <nav className="hidden gap-3 text-xs font-medium text-slate-600 dark:text-slate-300 sm:flex">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? "text-blue-600 dark:text-blue-400" : ""
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive ? "text-blue-600 dark:text-blue-400" : ""
                }
              >
                Dashboard
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              onClick={toggleTheme}
              className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            {isAdmin ? (
              <button
                onClick={logout}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Admin Active
              </button>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Admin Mode
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>
      <footer className="mt-4 border-t border-slate-200 px-4 py-3 text-center text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <span>
            Public read-only academic calendar • Admin key required to modify
          </span>
          <span>
            Visitors:{" "}
            <span className="font-semibold">
              {metrics?.visitors ?? 0}
            </span>{" "}
            • Downloads:{" "}
            <span className="font-semibold">
              {metrics?.downloads ?? 0}
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
};

const App = () => {
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [metrics, setMetrics] = useState({ visitors: 0, downloads: 0 });

  // Browser notifications: ask for permission once and poll reminders.
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const initMetrics = async () => {
      try {
        const res = await api.get("/metrics");
        setMetrics(res.data);
      } catch (err) {
        console.error("Failed to load metrics", err);
      }
    };

    const trackVisit = async () => {
      try {
        const res = await api.post("/metrics/visit");
        setMetrics(res.data);
      } catch (err) {
        console.error("Failed to record visit", err);
      }
    };

    initMetrics();

    if (!localStorage.getItem("satc_hasVisited")) {
      trackVisit();
      localStorage.setItem("satc_hasVisited", "1");
    }
  }, []);

  const handleMetricsUpdate = (data) => {
    if (!data) return;
    setMetrics({
      visitors: data.visitors ?? metrics.visitors,
      downloads: data.downloads ?? metrics.downloads
    });
  };

  useEffect(() => {
    let intervalId;
    if ("Notification" in window) {
      const pollReminders = async () => {
        try {
          const res = await api.get("/reminders");
          const tasks = res.data.tasks || [];
          if (
            tasks.length > 0 &&
            Notification.permission === "granted"
          ) {
            tasks.forEach((task) => {
              const title = task.title || "Upcoming academic task";
              const deadline = task.deadline_datetime
                ? new Date(task.deadline_datetime).toLocaleString()
                : "";
              const subject = task.subject ? ` (${task.subject})` : "";
              new Notification(`${title}${subject}`, {
                body: deadline
                  ? `Due around: ${deadline}`
                  : "You have a task approaching its deadline."
              });
            });
          }
        } catch (err) {
          console.error("Failed to poll reminders", err);
        }
      };
      pollReminders();
      intervalId = setInterval(pollReminders, 30000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <AppShell
        onOpenAdmin={() => setAdminModalOpen(true)}
        metrics={metrics}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dashboard"
            element={<Dashboard onMetricsUpdate={handleMetricsUpdate} />}
          />
        </Routes>
      </AppShell>
      <AdminModal open={adminModalOpen} onClose={() => setAdminModalOpen(false)} />
    </>
  );
};

export default App;

