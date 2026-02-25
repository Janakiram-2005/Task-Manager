import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import api from "../services/api";
import DashboardStats from "../components/DashboardStats.jsx";
import TaskCard from "../components/TaskCard.jsx";
import RequestCard from "../components/RequestCard.jsx";
import NotesPanel from "../components/NotesPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const INPUT_CLS = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({ task, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: task.title || "",
    subject: task.subject || "",
    description: task.description || "",
    priority: task.priority || "Medium",
    start_datetime: task.start_datetime
      ? new Date(task.start_datetime).toISOString().slice(0, 16)
      : "",
    deadline_datetime: task.deadline_datetime
      ? new Date(task.deadline_datetime).toISOString().slice(0, 16)
      : "",
    status: task.status || "Pending",
    reminder_enabled: task.reminder_enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title || !form.subject || !form.deadline_datetime) {
      setError("Title, subject and deadline are required."); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_datetime: form.start_datetime
          ? new Date(form.start_datetime).toISOString()
          : undefined,
        deadline_datetime: new Date(form.deadline_datetime).toISOString(),
      };
      const res = await api.put(`/tasks/${task._id}`, payload);
      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Edit Task</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="space-y-3 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Title *</label>
              <input name="title" value={form.title} onChange={handleChange} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Subject *</label>
              <input name="subject" value={form.subject} onChange={handleChange} className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Description</label>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              rows={3} className={`${INPUT_CLS} resize-none`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className={INPUT_CLS}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={INPUT_CLS}>
                <option>Pending</option><option>Completed</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Start date</label>
              <input type="datetime-local" name="start_datetime" value={form.start_datetime} onChange={handleChange} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Deadline *</label>
              <input type="datetime-local" name="deadline_datetime" value={form.deadline_datetime} onChange={handleChange} className={INPUT_CLS} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" name="reminder_enabled" checked={form.reminder_enabled} onChange={handleChange} className="rounded" />
            Enable deadline reminders
          </label>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = ({ onMetricsUpdate, onPendingCountChange }) => {
  const { isAdmin } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("tasks");
  const [editingTask, setEditingTask] = useState(null); // task being edited

  const [form, setForm] = useState({
    title: "", description: "", subject: "",
    priority: "Medium",
    start_datetime: "",
    deadline_datetime: "", reminder_enabled: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTasks = async () => {
    try { const res = await api.get("/tasks"); setTasks(res.data); } catch { }
  };

  const fetchRequests = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/task-requests");
      setPendingRequests(res.data || []);
      onPendingCountChange?.((res.data || []).length);
    } catch { }
  };

  useEffect(() => { fetchTasks(); }, []);
  useEffect(() => {
    fetchRequests();
    const id = setInterval(fetchRequests, 30000);
    return () => clearInterval(id);
  }, [isAdmin]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.deadline_datetime) { setError("Please choose a deadline."); return; }
    try {
      const payload = {
        ...form,
        start_datetime: form.start_datetime ? new Date(form.start_datetime).toISOString() : undefined,
        deadline_datetime: new Date(form.deadline_datetime).toISOString(),
      };
      const res = await api.post("/tasks", payload);
      setTasks((prev) => [...prev, res.data]);
      setForm({ title: "", description: "", subject: "", priority: "Medium", start_datetime: "", deadline_datetime: "", reminder_enabled: true });
      setSuccess("Task created successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      if (err.response?.status === 401) setError("Admin session expired. Re-enter the secret key.");
      else setError(err.response?.data?.error || "Failed to create task.");
    }
  };

  const handleApprove = async (req) => {
    try {
      const res = await api.post(`/task-requests/${req._id}/approve`);
      setPendingRequests((prev) => prev.filter((r) => r._id !== req._id));
      onPendingCountChange?.((p) => Math.max(0, p - 1));
      if (res.data?.task) setTasks((prev) => [...prev, res.data.task]);
    } catch { }
  };

  const handleReject = async (req) => {
    try {
      await api.post(`/task-requests/${req._id}/reject`);
      setPendingRequests((prev) => prev.filter((r) => r._id !== req._id));
      onPendingCountChange?.((p) => Math.max(0, p - 1));
    } catch { }
  };

  const handleComplete = async (task) => {
    try {
      const res = await api.put(`/tasks/complete/${task._id}`);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
    } catch { }
  };

  const handleDelete = async (task) => {
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
    } catch { }
  };

  // Called when EditModal saves successfully
  const handleTaskSaved = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
  };

  const recordDownload = async () => {
    try { const res = await api.post("/metrics/download"); onMetricsUpdate?.(res.data); } catch { }
  };

  const exportCsv = () => {
    if (!tasks.length) return;
    const headers = ["Title", "Subject", "Priority", "Deadline", "Status"];
    const rows = tasks.map((t) => [t.title, t.subject, t.priority, t.deadline_datetime, t.status]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: "tasks.csv",
    });
    a.click(); recordDownload();
  };

  const exportPdf = () => {
    if (!tasks.length) return;
    const doc = new jsPDF();
    let y = 16;
    doc.setFontSize(14); doc.text("Academic Task List", 14, y); y += 8;
    doc.setFontSize(9);
    tasks.forEach((t, i) => {
      if (y > 280) { doc.addPage(); y = 16; }
      doc.text(`${i + 1}. [${t.priority}] ${t.title} (${t.subject})`, 14, y); y += 5;
      doc.text(`Due: ${new Date(t.deadline_datetime).toLocaleString()} · ${t.status}`, 14, y); y += 5;
      if (t.description) { const lines = doc.splitTextToSize(t.description, 180); doc.text(lines, 14, y); y += lines.length * 4; }
      y += 2;
    });
    doc.save("tasks.pdf"); recordDownload();
  };

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Admin Mode required to manage tasks. You can still post and view notes below.
          </p>
        </div>
        <NotesPanel />
      </div>
    );
  }

  return (
    <>
      {/* Edit Modal */}
      {editingTask && (
        <EditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={handleTaskSaved}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Export CSV
            </button>
            <button onClick={exportPdf} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700">
              Download PDF
            </button>
          </div>
        </div>

        {/* Stats */}
        <DashboardStats
          tasks={tasks}
          pendingRequests={pendingRequests.length}
          isAdmin={isAdmin}
          onMetricsReset={onMetricsUpdate}
        />

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/50">
          {[
            ["tasks", "Tasks"],
            ["requests", `Requests${pendingRequests.length ? ` (${pendingRequests.length})` : ""}`],
            ["notes", "Notes"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${activeTab === tab
                ? "bg-white shadow text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tasks tab */}
        {activeTab === "tasks" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Create form */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-900">
              <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Create New Task</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Task title *" className={INPUT_CLS} />
                <input type="text" name="subject" value={form.subject} onChange={handleChange} placeholder="Subject *" className={INPUT_CLS} />
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description (optional)" rows={3} className={`${INPUT_CLS} resize-none`} />
                <select name="priority" value={form.priority} onChange={handleChange} className={INPUT_CLS}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Start date</label>
                    <input type="datetime-local" name="start_datetime" value={form.start_datetime} onChange={handleChange} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Deadline *</label>
                    <input type="datetime-local" name="deadline_datetime" value={form.deadline_datetime} onChange={handleChange} className={INPUT_CLS} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" name="reminder_enabled" checked={form.reminder_enabled} onChange={handleChange} className="rounded" />
                  Enable deadline reminders
                </label>
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
                {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{success}</p>}
                <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                  Create Task
                </button>
              </form>
            </div>

            {/* Task list */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                All Tasks <span className="ml-1 text-xs font-normal text-slate-400">({tasks.length})</span>
              </h2>
              {tasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-700">
                  No tasks yet. Create one!
                </p>
              ) : (
                <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
                  {tasks.map((t) => (
                    <TaskCard
                      key={t._id}
                      task={t}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                      onEdit={setEditingTask}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests tab */}
        {activeTab === "requests" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Pending Requests <span className="ml-1 text-xs font-normal text-slate-400">({pendingRequests.length})</span>
              </h2>
              <button onClick={fetchRequests} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                Refresh
              </button>
            </div>
            {pendingRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
                <p className="text-xs text-slate-400">No pending requests. All caught up!</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {pendingRequests.map((req) => (
                  <RequestCard key={req._id} request={req} onApprove={handleApprove} onReject={handleReject} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes tab */}
        {activeTab === "notes" && <NotesPanel />}

      </div>
    </>
  );
};

export default Dashboard;
