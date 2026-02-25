import React from "react";

const DashboardStats = ({ tasks }) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</p>
        <p className="mt-1 text-2xl font-semibold">{total}</p>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
        <p className="mt-1 text-2xl font-semibold text-emerald-500">
          {completed}
        </p>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Progress
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;

