import React, { useState } from "react";
import api from "../services/api";

const STAR_LABELS = ["", "Very Poor", "Poor", "Okay", "Good", "Excellent"];

const StarRating = ({ value, onChange }) => (
    <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
            <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`text-2xl transition-transform hover:scale-110 ${n <= value ? "text-amber-400" : "text-slate-300 dark:text-slate-600"
                    }`}
                aria-label={`${n} star`}
            >
                ★
            </button>
        ))}
        {value > 0 && (
            <span className="ml-2 self-center text-xs text-slate-500 dark:text-slate-400">
                {STAR_LABELS[value]}
            </span>
        )}
    </div>
);

const FeedbackForm = () => {
    const [rating, setRating] = useState(0);
    const [suggestion, setSuggestion] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) { setError("Please rate your experience."); return; }
        setError("");
        setLoading(true);
        try {
            await api.post("/feedback", { rating, suggestion });
            setSubmitted(true);
        } catch {
            // If endpoint doesn't exist yet, store locally and still show thanks
            const fbKey = "satc_feedback";
            const existing = JSON.parse(localStorage.getItem(fbKey) || "[]");
            existing.push({ rating, suggestion, at: new Date().toISOString() });
            localStorage.setItem(fbKey, JSON.stringify(existing));
            setSubmitted(true);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-2xl">🎉</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Thank you for your feedback!
                </p>
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                    Your response helps us improve the experience for everyone.
                </p>
                <button
                    onClick={() => { setSubmitted(false); setRating(0); setSuggestion(""); }}
                    className="mt-3 text-xs text-emerald-600 underline hover:no-underline dark:text-emerald-400"
                >
                    Submit another response
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Share your feedback</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                    We'd love to hear how your experience was and how we can improve!
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Experience rating */}
                <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                        How was your experience using this calendar?
                    </label>
                    <StarRating value={rating} onChange={setRating} />
                </div>

                {/* Suggestion */}
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Any suggestions to make it better?
                    </label>
                    <textarea
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                        placeholder="e.g. Add colour-coding for subjects, better mobile view…"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>

                {error && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                    {loading ? "Sending…" : "Submit Feedback"}
                </button>
            </form>
        </div>
    );
};

export default FeedbackForm;
