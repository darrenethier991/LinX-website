import React from "react";

/**
 * LinX AdminStatCard — a metric tile for the internal admin dashboard
 * (slate + sky theme). Uppercase label, large accented value, delta.
 * Wrap the admin surface in an element with class="linx-admin".
 */
export function AdminStatCard({ label, value, delta, accent = "accent", style = {} }) {
  const accents = {
    accent: "var(--admin-accent)",
    success: "var(--admin-success)",
    danger: "var(--admin-danger)",
  };
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.8)",
        border: "1px solid var(--admin-surface-soft)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-admin)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--admin-text-secondary)" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 600, color: accents[accent] }}>
          {value}
        </div>
        {delta != null && (
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--admin-text-secondary)" }}>
            {delta >= 0 ? "+" : ""}
            {delta} today
          </div>
        )}
      </div>
    </div>
  );
}
