import React from "react";

const PRIORITY_COLORS = {
    High: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
    Medium: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
    Low: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
};

const fmt = (iso) =>
    iso
        ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "—";

const RequestCard = ({ request, onApprove, onReject }) => (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm transition hover:shadow-md dark:border-blue-800 dark:bg-blue-950/30">
        <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{request.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{request.subject}</span>
                </p>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[request.priority] ?? PRIORITY_COLORS.Medium}`}>
                {request.priority}
            </span>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/60 px-3 py-2 text-[11px] dark:bg-slate-800/40">
            <div>
                <span className="block font-semibold text-slate-500 dark:text-slate-400">Start</span>
                <span className="text-slate-700 dark:text-slate-200">{fmt(request.start_datetime)}</span>
            </div>
            <div>
                <span className="block font-semibold text-slate-500 dark:text-slate-400">Deadline</span>
                <span className="text-slate-700 dark:text-slate-200">{fmt(request.deadline_datetime)}</span>
            </div>
        </div>

        {request.description && (
            <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{request.description}</p>
        )}

        <div className="flex items-center justify-end gap-2">
            <button
                onClick={() => onReject(request)}
                className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:bg-slate-900 dark:text-red-400"
            >
                Reject
            </button>
            <button
                onClick={() => onApprove(request)}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
                Approve
            </button>
        </div>
    </div>
);

export default RequestCard;
