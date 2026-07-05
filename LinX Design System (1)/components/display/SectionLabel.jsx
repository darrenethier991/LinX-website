import React from "react";

/**
 * LinX SectionLabel — the gold uppercase eyebrow that opens every
 * marketing section (e.g. "Transparent Pricing").
 */
export function SectionLabel({ children, style = {} }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-eyebrow)",
        fontWeight: 600,
        letterSpacing: "var(--ls-eyebrow)",
        textTransform: "uppercase",
        color: "var(--text-accent)",
        marginBottom: "10px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
