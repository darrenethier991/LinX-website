import React from "react";

/**
 * LinX Testimonial — gold stars, an italic quote, and an author line.
 */
export function Testimonial({ rating = 5, quote, author, role, style = {} }) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ color: "var(--linx-gold)", fontSize: "12px", marginBottom: "10px", letterSpacing: "2px" }}>
        {"★".repeat(rating)}
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "var(--lh-relaxed)", marginBottom: "14px", fontStyle: "italic", marginTop: 0 }}>
        {quote}
      </p>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
        {author}
      </div>
      {role && (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--text-secondary)" }}>
          {role}
        </div>
      )}
    </div>
  );
}
