import React, { useState, useEffect } from "react";

const STORAGE_KEY = "satc_notes_v1";

// Duration options for auto-expiry
const DURATIONS = [
    { label: "1 hour", ms: 1 * 60 * 60 * 1000 },
    { label: "6 hours", ms: 6 * 60 * 60 * 1000 },
    { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
    { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
    { label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
];

const loadNotes = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const all = JSON.parse(raw);
        const now = Date.now();
        // Auto-purge expired notes on load
        return all.filter((n) => n.expiresAt > now);
    } catch { return []; }
};

const saveNotes = (notes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

const formatTimeLeft = (expiresAt) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
};

const EMPTY_FORM = { title: "", body: "", durationIdx: 0 };

const NotesPanel = () => {
    const [notes, setNotes] = useState(loadNotes);
    const [form, setForm] = useState(EMPTY_FORM);
    const [, forceUpdate] = useState(0);

    // Tick every minute to refresh countdowns and purge expired
    useEffect(() => {
        const id = setInterval(() => {
            setNotes((prev) => {
                const alive = prev.filter((n) => n.expiresAt > Date.now());
                if (alive.length !== prev.length) saveNotes(alive);
                return alive;
            });
            forceUpdate((n) => n + 1);
        }, 60_000);
        return () => clearInterval(id);
    }, []);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAdd = (e) => {
        e.preventDefault();
        if (!form.body.trim()) return;
        const duration = DURATIONS[Number(form.durationIdx)];
        const note = {
            id: Date.now().toString(),
            title: form.title.trim() || "Note",
            body: form.body.trim(),
            createdAt: Date.now(),
            expiresAt: Date.now() + duration.ms,
            durationLabel: duration.label,
        };
        const updated = [note, ...notes];
        setNotes(updated);
        saveNotes(updated);
        setForm(EMPTY_FORM);
    };

    const handleDelete = (id) => {
        const updated = notes.filter((n) => n.id !== id);
        setNotes(updated);
        saveNotes(updated);
    };

    // Expiry progress bar (0–100%)
    const progress = (note) => {
        const total = note.expiresAt - note.createdAt;
        const remaining = note.expiresAt - Date.now();
        return Math.max(0, Math.min(100, (remaining / total) * 100));
    };

    return (
        <div className="space-y-5">
            {/* Add note form */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Add a note</h2>
                <p className="mb-4 text-xs text-slate-400">
                    Notes are <span className="font-medium text-slate-500 dark:text-slate-300">temporary</span> — they auto-delete after the time you set.
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
                        placeholder="Write your note here — announcement, reminder, info…"
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
                            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            Post Note
                        </button>
                    </div>
                </form>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
                    <p className="text-xs text-slate-400">No notes yet. Add one above — it will vanish automatically!</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {notes.map((note) => {
                        const pct = progress(note);
                        const urgency = pct < 20
                            ? "bg-red-500"
                            : pct < 50
                                ? "bg-amber-400"
                                : "bg-blue-500";
                        return (
                            <div
                                key={note.id}
                                className="group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                {/* Progress bar — shrinks as expiry approaches */}
                                <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${urgency}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{note.title}</h3>
                                    <button
                                        onClick={() => handleDelete(note.id)}
                                        className="shrink-0 rounded-full p-0.5 text-slate-300 opacity-0 transition hover:text-red-400 group-hover:opacity-100 dark:text-slate-600"
                                        aria-label="Delete note"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                    {note.body}
                                </p>

                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className={`font-semibold ${pct < 20 ? "text-red-500" : pct < 50 ? "text-amber-500" : "text-blue-500"}`}>
                                        {formatTimeLeft(note.expiresAt)}
                                    </span>
                                    <span>·</span>
                                    <span>Set for {note.durationLabel}</span>
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
