import React from "react";

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
      <span className="font-medium">Something went wrong:</span>{" "}
      <span>{message}</span>
    </div>
  );
}
