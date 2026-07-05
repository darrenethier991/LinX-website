import React from "react";

/**
 * LinX AdminBadge — a rounded status pill for the admin theme.
 */
export function AdminBadge({ children, tone = "muted", style = {} }) {
  const tones = {
    success: { background: "rgba(16,185,129,0.2)", color: "#6EE7B7" },
    muted: { background: "rgba(51,65,85,0.6)", color: "#CBD5E1" },
    accent: { background: "rgba(56,189,248,0.18)", color: "var(--admin-accent)" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-sans)",
        fontSize: "12px",
        fontWeight: 500,
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
