import React from "react";

const PRIORITY_COLORS = {
    High: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
    Medium: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
    Low: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
};

const RequestCard = ({ request, onApprove, onReject }) => (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm transition hover:shadow-md dark:border-blue-800 dark:bg-blue-950/30">
        <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{request.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{request.subject}</span>
                    {" · "}Due {new Date(request.deadline_datetime).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </p>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[request.priority] ?? PRIORITY_COLORS.Medium}`}>
                {request.priority}
            </span>
        </div>

        {request.description && (
            <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{request.description}</p>
        )}

        <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                From: <span className="font-medium text-slate-600 dark:text-slate-300">{request.submitter_name || "Anonymous"}</span>
            </span>
            <div className="flex gap-2">
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
    </div>
);

export default RequestCard;
