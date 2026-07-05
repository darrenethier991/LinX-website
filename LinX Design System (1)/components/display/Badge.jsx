import React from "react";

/**
 * LinX Badge — a small pill with a tinted background and colored text.
 * Used for live-feed status (LIVE / NEW / HOT) and generic labels.
 */
export function Badge({ children, tone = "success", style = {} }) {
  const tones = {
    success: { background: "var(--linx-success-12)", color: "var(--linx-success)" },
    info: { background: "var(--linx-info-12)", color: "var(--linx-info)" },
    error: { background: "var(--linx-error-12)", color: "var(--linx-error)" },
    gold: { background: "var(--linx-gold-12)", color: "var(--linx-gold)" },
    muted: { background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 9px",
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-sans)",
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "var(--ls-wide)",
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
