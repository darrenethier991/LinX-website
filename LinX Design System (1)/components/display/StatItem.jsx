import React from "react";

/**
 * LinX StatItem — a big gold number over a wide-tracked label.
 * Used in the hero stats bar (e.g. "1,400+ Contractors").
 */
export function StatItem({ value, label, style = {} }) {
  return (
    <div style={{ textAlign: "center", ...style }}>
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-sans)",
          fontSize: "24px",
          fontWeight: 800,
          color: "var(--linx-gold)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "11px",
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "var(--ls-widest)",
          marginTop: "6px",
        }}
      >
        {label}
      </div>
    </div>
  );
}
