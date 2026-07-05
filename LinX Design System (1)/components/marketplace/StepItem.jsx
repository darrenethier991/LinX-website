import React from "react";

/**
 * LinX StepItem — a numbered gold-ringed circle over a title and blurb.
 * Used in "How LinX Works" process rows.
 */
export function StepItem({ number, title, description, style = {} }) {
  return (
    <div style={{ textAlign: "center", ...style }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "2px solid var(--linx-gold)",
          color: "var(--linx-gold)",
          fontFamily: "var(--font-sans)",
          fontSize: "18px",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
        }}
      >
        {number}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: "16px", fontWeight: 700, marginBottom: "6px", color: "var(--text-primary)" }}>
        {title}
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "var(--lh-body)", margin: 0 }}>
        {description}
      </p>
    </div>
  );
}
