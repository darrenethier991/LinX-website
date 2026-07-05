import React, { useState } from "react";

/**
 * LinX FaqItem — an accordion row. Question on a hairline-divided row;
 * a gold "+" rotates to "×" when open, revealing the answer.
 */
export function FaqItem({ question, answer, defaultOpen = false, style = {} }) {
  const [open, setOpen] = useState(defaultOpen);
  const [hover, setHover] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid var(--border-hairline)", ...style }}>
      <div
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 0",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          userSelect: "none",
          color: hover ? "var(--linx-gold)" : "var(--text-primary)",
          transition: "color var(--dur-base)",
        }}
      >
        {question}
        <span
          style={{
            color: "var(--linx-gold)",
            fontSize: "18px",
            fontWeight: 300,
            lineHeight: 1,
            flexShrink: 0,
            marginLeft: "16px",
            transform: open ? "rotate(45deg)" : "none",
            transition: "transform var(--dur-base)",
          }}
        >
          +
        </span>
      </div>
      {open && (
        <div style={{ padding: "0 0 16px", fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "var(--lh-relaxed)" }}>
          {answer}
        </div>
      )}
    </div>
  );
}
