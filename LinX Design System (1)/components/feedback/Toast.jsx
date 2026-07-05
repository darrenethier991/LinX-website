import React from "react";

/**
 * LinX Toast — a small bottom-right notification with a gold border.
 * Purely presentational; control visibility from the parent.
 */
export function Toast({ children, style = {} }) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--linx-gold)",
        borderRadius: "var(--radius-sm)",
        padding: "12px 18px",
        fontFamily: "var(--font-sans)",
        fontSize: "13px",
        color: "var(--text-primary)",
        maxWidth: "320px",
        boxShadow: "var(--shadow-card)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
