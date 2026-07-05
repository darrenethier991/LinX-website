import React from "react";

/**
 * LinX Segmented — a pill-shaped segmented control. The active segment
 * fills gold. Used for role selection (Homeowner / Contractor).
 */
export function Segmented({ options = [], value, onChange, style = {} }) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-pill)",
        padding: "4px",
        gap: "4px",
        ...style,
      }}
    >
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const active = val === value;
        return (
          <button
            key={val}
            onClick={() => onChange && onChange(val)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "var(--radius-pill)",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              background: active ? "var(--linx-gold)" : "transparent",
              color: active ? "var(--text-on-gold)" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all var(--dur-base)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
