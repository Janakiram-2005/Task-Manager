import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

const priorityColor = (priority) => {
  switch (priority) {
    case "High":
      return "border-priority-high text-priority-high";
    case "Medium":
      return "border-priority-medium text-priority-medium";
    default:
      return "border-priority-low text-priority-low";
  }
};

const TaskCard = ({ task, onComplete, onDelete }) => {
  const { isAdmin } = useAuth();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{task.title}</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {task.subject} •{" "}
            {new Date(task.deadline_datetime).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short"
            })}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityColor(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-slate-700 dark:text-slate-200">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span
          className={
            task.status === "Completed"
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          }
        >
          {task.status}
        </span>
        {isAdmin && (
          <div className="flex gap-2">
            {task.status !== "Completed" && (
              <button
                onClick={() => onComplete(task)}
                className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Complete
              </button>
            )}
            <button
              onClick={() => onDelete(task)}
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
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

