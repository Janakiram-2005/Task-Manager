import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import api from "../services/api";
import CalendarView from "../components/CalendarView.jsx";
import TaskCard from "../components/TaskCard.jsx";
import SearchBar from "../components/SearchBar.jsx";
import FeedbackForm from "../components/FeedbackForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const INPUT_CLS = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const EMPTY_REQ = {
  title: "", subject: "", description: "",
  priority: "Medium", deadline_datetime: "", submitter_name: "",
};

const Home = () => {
  const { isAdmin } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reqForm, setReqForm] = useState(EMPTY_REQ);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState("");
  const [reqSuccess, setReqSuccess] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tasks");
      setTasks(res.data);
      setFilteredTasks(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!search) { setFilteredTasks(tasks); return; }
    const q = search.toLowerCase();
    setFilteredTasks(tasks.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    ));
  }, [search, tasks]);

  const handleEventDrop = async (id, newIso) => {
    if (!isAdmin) return;
    try {
      const res = await api.put(`/tasks/${id}`, { deadline_datetime: newIso });
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
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

  const upcoming = [...tasks]
    .filter((t) => new Date(t.deadline_datetime) >= new Date())
    .sort((a, b) => new Date(a.deadline_datetime) - new Date(b.deadline_datetime))
    .slice(0, 5);

  const tasksForSelectedDate = selectedDate
    ? filteredTasks.filter((t) => {
      const start = t.start_datetime ? t.start_datetime.slice(0, 10) : null;
      const deadline = t.deadline_datetime ? t.deadline_datetime.slice(0, 10) : null;
      // Show if selectedDate hits the deadline, the start, or falls within start–deadline range
      if (deadline === selectedDate) return true;
      if (start === selectedDate) return true;
      if (start && deadline && selectedDate >= start && selectedDate <= deadline) return true;
      return false;
    })
    : [];

  // ── Download PDF (all users) ─────────────────────────────────────
  const downloadPdf = () => {
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
    doc.save("tasks.pdf");
    try { api.post("/metrics/download"); } catch { }
  };

  // ── Request form ─────────────────────────────────────────────────
  const handleReqChange = (e) => setReqForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleReqSubmit = async (e) => {
    e.preventDefault();
    setReqError(""); setReqSuccess("");
    if (!reqForm.title || !reqForm.subject || !reqForm.deadline_datetime) {
      setReqError("Title, subject and deadline are required."); return;
    }
    setReqLoading(true);
    try {
      await api.post("/task-requests", {
        ...reqForm,
        deadline_datetime: new Date(reqForm.deadline_datetime).toISOString(),
      });
      setReqSuccess("Request submitted! The admin will review it shortly.");
      setReqForm(EMPTY_REQ);
      setTimeout(() => setReqSuccess(""), 6000);
    } catch (err) {
      setReqError(err.response?.data?.error || "Failed to submit request.");
    } finally { setReqLoading(false); }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Academic Task Calendar</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Public view — browse tasks, download the list, or submit a request below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPdf}
            disabled={!tasks.length}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Download PDF
          </button>
          <SearchBar value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Calendar + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CalendarView tasks={filteredTasks} onDateClick={setSelectedDate} onEventDrop={handleEventDrop} />
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Upcoming Deadlines</h2>
            {upcoming.length === 0 ? (
              <p className="text-xs text-slate-400">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((t) => (
                  <TaskCard key={t._id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>

          {selectedDate && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Tasks on {selectedDate}
              </h2>
              {tasksForSelectedDate.length === 0 ? (
                <p className="text-xs text-slate-400">No tasks on this date.</p>
              ) : (
                <div className="space-y-2">
                  {tasksForSelectedDate.map((t) => (
                    <TaskCard key={t._id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400">Loading tasks…</p>}

      {/* Request a Task */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Request a Task</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Fill in the details — the admin will review and add it to the calendar.
          </p>
        </div>
        <form onSubmit={handleReqSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Your name</label>
              <input name="submitter_name" value={reqForm.submitter_name} onChange={handleReqChange} placeholder="e.g. Ravi Kumar" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Task title *</label>
              <input name="title" value={reqForm.title} onChange={handleReqChange} placeholder="e.g. Math Assignment" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Subject *</label>
              <input name="subject" value={reqForm.subject} onChange={handleReqChange} placeholder="e.g. Mathematics" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Deadline *</label>
              <input type="datetime-local" name="deadline_datetime" value={reqForm.deadline_datetime} onChange={handleReqChange} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Priority</label>
              <select name="priority" value={reqForm.priority} onChange={handleReqChange} className={INPUT_CLS}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Description (optional)</label>
            <textarea name="description" value={reqForm.description} onChange={handleReqChange} placeholder="Any extra details…" rows={3} className={`${INPUT_CLS} resize-none`} />
          </div>
          {reqError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">{reqError}</p>}
          {reqSuccess && <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{reqSuccess}</p>}
          <button type="submit" disabled={reqLoading} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
            {reqLoading ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </div>

      {/* Feedback */}
      <FeedbackForm />

    </div>
  );
};

export default Home;
