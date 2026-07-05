import React, { useState } from "react";
import { Button } from "../actions/Button.jsx";

/**
 * LinX PricingCard — a plan tier. The `featured` tier gets a gold border
 * and a "MOST POPULAR" chip. Prices render with a gold dollar sign.
 */
export function PricingCard({
  name,
  price,
  period = "per month",
  features = [],
  cta = "Get Started",
  ctaVariant,
  featured = false,
  onCta,
  style = {},
}) {
  const [hover, setHover] = useState(false);
  const borderColor = featured
    ? "var(--linx-gold)"
    : hover
    ? "var(--linx-gold-55)"
    : "var(--border-hairline)";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: "var(--surface-card)",
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-lg)",
        padding: "28px 24px",
        transform: hover && !featured ? "translateY(-2px)" : "none",
        transition: "border-color var(--dur-base), transform var(--dur-base)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {featured && (
        <div
          style={{
            position: "absolute",
            top: "-13px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--linx-gold)",
            color: "var(--text-on-gold)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "var(--ls-widest)",
            padding: "4px 16px",
            borderRadius: "var(--radius-pill)",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
            fontFamily: "var(--font-sans)",
          }}
        >
          Most Popular
        </div>
      )}

      <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--text-secondary)", marginBottom: "6px" }}>
        {name}
      </div>

      <div style={{ fontFamily: "var(--font-sans)", fontSize: "42px", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "var(--ls-tightest)", lineHeight: 1, marginBottom: "4px" }}>
        <sup style={{ fontSize: "18px", verticalAlign: "super", color: "var(--linx-gold)", letterSpacing: 0 }}>$</sup>
        {price}
      </div>

      <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "18px" }}>
        {period}
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: "16px 0 0", marginBottom: "22px", borderTop: "1px solid var(--border-hairline)", display: "flex", flexDirection: "column", gap: "8px" }}>
        {features.map((f, i) => (
          <li key={i} style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: 1.5 }}>
            <span style={{ color: "var(--linx-gold)", fontWeight: 700, flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <Button
        variant={ctaVariant || (featured ? "primary" : "outline")}
        block
        onClick={onCta}
      >
        {cta}
      </Button>
    </div>
  );
}
