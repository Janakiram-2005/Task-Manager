import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

const PRIORITY_STYLES = {
  High: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  Medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  Low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
};

const STATUS_STYLES = {
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const TaskCard = ({ task, onComplete, onDelete, onEdit }) => {
  const { isAdmin } = useAuth();

  const deadlineDate = task.deadline_datetime ? new Date(task.deadline_datetime) : null;
  const isOverdue = deadlineDate && task.status !== "Completed" && deadlineDate < new Date();

  return (
    <div
      className={`group flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${isOverdue
          ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20"
          : "border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900"
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {task.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">{task.subject}</span>
            {deadlineDate && (
              <>
                {" · "}
                <span className={isOverdue ? "font-semibold text-red-500" : ""}>
                  {deadlineDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
                {isOverdue && " · Overdue"}
              </>
            )}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.Medium}`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status] ?? STATUS_STYLES.Pending}`}>
          {task.status}
        </span>
        {isAdmin && (
          <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Edit */}
            <button
              onClick={() => onEdit && onEdit(task)}
              className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-400"
            >
              Edit
            </button>
            {/* Mark done */}
            {task.status !== "Completed" && (
              <button
                onClick={() => onComplete(task)}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Done
              </button>
            )}
            {/* Delete */}
            <button
              onClick={() => onDelete(task)}
              className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:bg-slate-900 dark:text-red-400"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
