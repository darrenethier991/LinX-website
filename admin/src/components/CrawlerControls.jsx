import React from "react";

export function CrawlerControls({ status, onStart, onStop, loading }) {
  const isRunning = status?.running;

  return (
    <div className="linx-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-200">Crawler Scheduler</div>
          <div className="text-xs text-slate-400">
            {isRunning ? "Currently running" : "Idle"}
          </div>
        </div>
        <div>
          {isRunning ? (
            <span className="linx-badge-success">Running</span>
          ) : (
            <span className="linx-badge-muted">Stopped</span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="linx-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onStart}
          disabled={loading || isRunning}
        >
          Run Now
        </button>
        <button
          className="linx-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onStop}
          disabled={loading || !isRunning}
        >
          Stop Scheduler
        </button>
      </div>
      {status?.last_run && (
        <div className="text-xs text-slate-400">
          Last run:{" "}
          <span className="text-slate-300 font-medium">{status.last_run}</span>
        </div>
      )}
    </div>
  );
}
