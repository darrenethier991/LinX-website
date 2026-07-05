import React from "react";

/**
 * LinX Toggle — a pill switch used for billing (Monthly/Annual) and
 * role (Homeowner/Contractor) choices. Gold thumb on a dark track.
 */
export function Toggle({ checked = false, onChange, style = {} }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: "44px",
        height: "24px",
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "12px",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: "18px",
          height: "18px",
          background: "var(--linx-gold)",
          borderRadius: "50%",
          position: "absolute",
          top: "3px",
          left: checked ? "23px" : "3px",
          transition: "left var(--dur-base) ease",
        }}
      />
    </div>
  );
}
