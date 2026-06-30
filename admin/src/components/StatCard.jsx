import React from "react";

export function StatCard({ label, value, delta, accent }) {
  const accentClass =
    accent === "success"
      ? "text-emerald-400"
      : accent === "danger"
      ? "text-rose-400"
      : "text-sky-400";

  return (
    <div className="linx-card linx-hover p-4 flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="flex items-baseline justify-between">
        <div className={`text-2xl font-semibold ${accentClass}`}>{value}</div>
        {delta != null && (
          <div className="text-xs text-slate-400">
            {delta >= 0 ? "+" : ""}
            {delta} today
          </div>
        )}
      </div>
    </div>
  );
}
