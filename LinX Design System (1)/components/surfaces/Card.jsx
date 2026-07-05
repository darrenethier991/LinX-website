import React, { useState } from "react";

/**
 * LinX Card — the base dark surface: near-black fill, hairline border,
 * 14px radius. On dark we lean on borders, not drop shadows. Set
 * `hoverable` to warm the border to gold and lift on hover.
 */
export function Card({ children, hoverable = false, padding = "24px", style = {}, ...rest }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHover(true)}
      onMouseLeave={() => hoverable && setHover(false)}
      style={{
        background: "var(--surface-card)",
        border: `1px solid ${hover ? "var(--linx-gold)" : "var(--border-hairline)"}`,
        borderRadius: "var(--radius-lg)",
        padding,
        transform: hover ? "translateY(-2px)" : "none",
        transition: "border-color var(--dur-base), transform var(--dur-base)",
        boxSizing: "border-box",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
