import React, { useState } from "react";

/**
 * LinX FeatureCard — an emoji icon, bold title, description, and a
 * gold-checked feature list. Used in "Who LinX Serves" and feature grids.
 */
export function FeatureCard({ icon, title, description, features = [], style = {} }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface-card)",
        border: `1px solid ${hover ? "var(--linx-gold)" : "var(--border-hairline)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "30px",
        transition: "border-color var(--dur-base)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {icon && <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>}
      <div style={{ fontFamily: "var(--font-sans)", fontSize: "20px", fontWeight: 800, marginBottom: "10px", color: "var(--text-primary)" }}>
        {title}
      </div>
      {description && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "var(--lh-relaxed)", marginBottom: features.length ? "18px" : 0 }}>
          {description}
        </p>
      )}
      {features.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "7px" }}>
          {features.map((f, i) => (
            <li key={i} style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <span style={{ color: "var(--linx-gold)", fontWeight: 700, flexShrink: 0 }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
