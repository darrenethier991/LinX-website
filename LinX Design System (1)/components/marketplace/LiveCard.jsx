import React from "react";
import { Badge } from "../display/Badge.jsx";

/**
 * LinX LiveCard — a real-time project row from the live feed: emoji icon,
 * title, location/budget/time meta, and a status badge.
 */
export function LiveCard({ icon, title, meta, badge, badgeTone = "success", style = {} }) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        padding: "14px",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {icon && <div style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>{icon}</div>}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 600, marginBottom: "2px", color: "var(--text-primary)" }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--text-secondary)" }}>
          {meta}
        </div>
      </div>
      {badge && (
        <span style={{ marginLeft: "auto", flexShrink: 0 }}>
          <Badge tone={badgeTone}>{badge}</Badge>
        </span>
      )}
    </div>
  );
}
