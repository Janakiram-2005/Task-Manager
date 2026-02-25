import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import api from "../services/api";
import DashboardStats from "../components/DashboardStats.jsx";
import TaskCard from "../components/TaskCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Dashboard = ({ onMetricsUpdate }) => {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    priority: "Medium",
    start_datetime: "",
    end_datetime: "",
    deadline_datetime: "",
    reminder_enabled: true
  });
  const [error, setError] = useState("");

  const fetchTasks = async () => {
    const res = await api.get("/tasks");
    setTasks(res.data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.deadline_datetime) {
      setError("Please choose a deadline date and time.");
      return;
    }
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const deadlineSelected = new Date(form.deadline_datetime);
    if (deadlineSelected < todayStart) {
      setError("Deadline cannot be earlier than today.");
      return;
    }

    if (form.start_datetime) {
      const startSelected = new Date(form.start_datetime);
      if (startSelected < todayStart) {
        setError("Start date cannot be earlier than today.");
        return;
      }
      if (form.end_datetime) {
        const endSelected = new Date(form.end_datetime);
        if (endSelected < startSelected) {
          setError("End date cannot be earlier than start date.");
          return;
        }
      }
    }
    try {
      const res = await api.post("/tasks", {
        ...form,
        start_datetime: form.start_datetime
          ? new Date(form.start_datetime).toISOString()
          : undefined,
        end_datetime: form.end_datetime
          ? new Date(form.end_datetime).toISOString()
          : undefined,
        deadline_datetime: new Date(form.deadline_datetime).toISOString()
      });
      setTasks((prev) => [...prev, res.data]);
      setForm({
        title: "",
        description: "",
        subject: "",
        priority: "Medium",
        start_datetime: "",
        end_datetime: "",
        deadline_datetime: "",
        reminder_enabled: true
      });
    } catch (err) {
      setError(
        err.response?.data?.errors
          ? JSON.stringify(err.response.data.errors)
          : "Failed to create task (are you in Admin Mode?)"
      );
    }
  };

  const recordDownload = async () => {
    try {
      const res = await api.post("/metrics/download");
      onMetricsUpdate?.(res.data);
    } catch (err) {
      console.error("Failed to record download", err);
    }
  };

  const handleComplete = async (task) => {
    try {
      const res = await api.put(`/tasks/complete/${task._id}`);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
    } catch (err) {
      console.error("Failed to complete", err);
    }
  };

  const handleDelete = async (task) => {
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const exportCsv = () => {
    if (tasks.length === 0) return;
    const headers = [
      "Title",
      "Description",
      "Subject",
      "Priority",
      "Deadline",
      "Status",
      "ReminderEnabled"
    ];
    const rows = tasks.map((t) => [
      t.title,
      t.description || "",
      t.subject,
      t.priority,
      t.deadline_datetime,
      t.status,
      t.reminder_enabled ? "Yes" : "No"
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.csv";
    a.click();
    URL.revokeObjectURL(url);
    recordDownload();
  };

  const exportPdf = () => {
    if (tasks.length === 0) return;
    const doc = new jsPDF();
    const marginLeft = 14;
    let y = 16;

    doc.setFontSize(14);
    doc.text("Academic Task List", marginLeft, y);
    y += 6;
    doc.setFontSize(9);

    tasks.forEach((t, index) => {
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
      const deadline = new Date(t.deadline_datetime).toLocaleString();
      const line = `${index + 1}. [${t.priority}] ${t.title} (${t.subject})`;
      doc.text(line, marginLeft, y);
      y += 4;
      doc.text(`Due: ${deadline} • Status: ${t.status}`, marginLeft, y);
      y += 4;
      if (t.description) {
        const descLines = doc.splitTextToSize(
          t.description,
          180
        );
        doc.text(descLines, marginLeft, y);
        y += descLines.length * 4;
      }
      y += 2;
    });

    doc.save("tasks.pdf");
    recordDownload();
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <h1 className="text-lg font-semibold">Admin dashboard</h1>
        <p className="max-w-sm text-xs text-slate-600 dark:text-slate-300">
          Dashboard is only visible for admins. Enable Admin Mode with the
          secret key to create, modify, or delete tasks and view statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900"
          >
            Export CSV
          </button>
          <button
            onClick={exportPdf}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900"
          >
            Download PDF
          </button>
        </div>
      </div>

      <DashboardStats tasks={tasks} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Create new task</h2>
          {!isAdmin && (
            <p className="mb-2 text-xs text-amber-600 dark:text-amber-300">
              Enable Admin Mode to create or edit tasks.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Title"
              disabled={!isAdmin}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Subject"
              disabled={!isAdmin}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800"
            />
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Description"
              disabled={!isAdmin}
              className="h-20 w-full resize-none rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="flex gap-3">
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-32 rounded-md border border-slate-300 bg-slate-50 px-2 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <div className="flex-1 space-y-2">
                <input
                  type="datetime-local"
                  name="start_datetime"
                  value={form.start_datetime}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  placeholder="Start date & time"
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="datetime-local"
                  name="end_datetime"
                  value={form.end_datetime}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  placeholder="End date & time"
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="datetime-local"
                  name="deadline_datetime"
                  value={form.deadline_datetime}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  placeholder="Deadline date & time"
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="reminder_enabled"
                checked={form.reminder_enabled}
                onChange={handleChange}
                disabled={!isAdmin}
              />
              Enable reminders
            </label>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={!isAdmin}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              Create task
            </button>
          </form>
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">All tasks</h2>
          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="text-xs text-slate-500">No tasks available yet.</p>
            )}
            {tasks.map((t) => (
              <TaskCard
                key={t._id}
                task={t}
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

