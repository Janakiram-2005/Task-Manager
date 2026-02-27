import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

// Duration choices shown to the user
const DURATIONS = [
    { label: "1 hour", ms: 1 * 60 * 60 * 1000 },
    { label: "6 hours", ms: 6 * 60 * 60 * 1000 },
    { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
    { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
    { label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
];

const formatTimeLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
};

const progressPct = (createdAt, expiresAt) => {
    const total = new Date(expiresAt) - new Date(createdAt);
    const remaining = new Date(expiresAt) - Date.now();
    return Math.max(0, Math.min(100, (remaining / total) * 100));
};

const EMPTY_FORM = { title: "", body: "", durationIdx: 0 };

const NotesPanel = () => {
    const { isAdmin } = useAuth();
    const [notes, setNotes] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState("");
    const [, tick] = useState(0);   // force re-render for countdown

    // ── Fetch notes from server ───────────────────────────────────────
    const fetchNotes = useCallback(async () => {
        try {
            const res = await api.get("/notes");
            setNotes(res.data);
        } catch (e) {
            setError("Could not load notes.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
        // Refresh from server every 60 s so new notes from other devices appear
        const id = setInterval(fetchNotes, 60_000);
        return () => clearInterval(id);
    }, [fetchNotes]);

    // Tick every 30 s to update countdowns
    useEffect(() => {
        const id = setInterval(() => tick((n) => n + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    // ── Form handlers ─────────────────────────────────────────────────
    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.body.trim()) return;
        setPosting(true);
        setError("");
        try {
            const duration = DURATIONS[Number(form.durationIdx)];
            const expiresAt = new Date(Date.now() + duration.ms).toISOString();
            const res = await api.post("/notes", {
                title: form.title.trim() || "Note",
                body: form.body.trim(),
                expiresAt,
            });
            setNotes((prev) => [res.data, ...prev]);
            setForm(EMPTY_FORM);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to post note.");
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/notes/${id}`);
            setNotes((prev) => prev.filter((n) => n._id !== id));
        } catch {
            setError("Failed to delete note.");
        }
    };

    return (
        <div className="space-y-5">
            {/* Add note form */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Add a note
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                    Notes are <span className="font-medium text-slate-500 dark:text-slate-300">shared</span> with
                    everyone and <span className="font-medium text-slate-500 dark:text-slate-300">auto-delete</span> after the time you set.
                </p>
                <form onSubmit={handleAdd} className="space-y-3">
                    <input
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="Title (optional)"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <textarea
                        name="body"
                        value={form.body}
                        onChange={handleChange}
                        placeholder="Write your note, announcement, or reminder here…"
                        rows={4}
                        required
                        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="mb-1 block text-xs text-slate-500">Auto-delete after</label>
                            <select
                                name="durationIdx"
                                value={form.durationIdx}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                                {DURATIONS.map((d, i) => (
                                    <option key={i} value={i}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={posting}
                            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                            {posting ? "Posting…" : "Post Note"}
                        </button>
                    </div>
                    {error && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                            {error}
                        </p>
                    )}
                </form>
            </div>

            {/* Notes list */}
            {loading ? (
                <p className="text-xs text-slate-400">Loading notes…</p>
            ) : notes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
                    <p className="text-xs text-slate-400">No notes yet. Add one above — it will appear on all devices!</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {notes.map((note) => {
                        const pct = progressPct(note.createdAt, note.expiresAt);
                        const urgencyBar = pct < 20 ? "bg-red-500" : pct < 50 ? "bg-amber-400" : "bg-blue-500";
                        const urgencyText = pct < 20 ? "text-red-500" : pct < 50 ? "text-amber-500" : "text-blue-500";
                        return (
                            <div
                                key={note._id}
                                className="group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                {/* Shrinking expiry bar */}
                                <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${urgencyBar}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        {note.title}
                                    </h3>
                                    {/* Delete — admin only */}
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDelete(note._id)}
                                            className="shrink-0 rounded-full p-0.5 text-slate-300 opacity-0 transition hover:text-red-400 group-hover:opacity-100 dark:text-slate-600"
                                            aria-label="Delete note"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                    {note.body}
                                </p>

                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className={`font-semibold ${urgencyText}`}>
                                        {formatTimeLeft(note.expiresAt)}
                                    </span>
                                    <span>·</span>
                                    <span>Posted {new Date(note.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NotesPanel;
