import React, { useState } from "react";

/**
 * LinX Button — a pill-shaped, UPPERCASE, letter-spaced call to action.
 * The brand's signature interaction: gold fills or gold outlines that
 * invert to solid gold on hover.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  disabled = false,
  block = false,
  type = "button",
  style = {},
  ...rest
}) {
  const [hover, setHover] = useState(false);

  const sizes = {
    sm: { padding: "7px 16px", fontSize: "11px" },
    md: { padding: "9px 22px", fontSize: "12px" },
    lg: { padding: "12px 28px", fontSize: "13px" },
  };

  const base = {
    display: block ? "flex" : "inline-flex",
    width: block ? "100%" : "auto",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderRadius: "var(--radius-pill)",
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    letterSpacing: "var(--ls-wide)",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    textDecoration: "none",
    transition: "all var(--dur-fast) ease",
    boxSizing: "border-box",
    ...sizes[size],
  };

  const variants = {
    // Solid gold
    primary: {
      background: hover ? "var(--linx-gold-light)" : "var(--linx-gold)",
      color: "var(--text-on-gold)",
      border: "1px solid transparent",
    },
    // Black with gold outline → fills gold on hover
    "outline-gold": {
      background: hover ? "var(--linx-gold)" : "#000",
      color: hover ? "#000" : "var(--linx-gold)",
      border: "1px solid var(--linx-gold-85)",
    },
    // Neutral outline → gold text/border on hover
    outline: {
      background: "#000",
      color: hover ? "var(--linx-gold)" : "var(--text-primary)",
      border: `1px solid ${hover ? "var(--linx-gold-55)" : "var(--border-hairline)"}`,
    },
  };

  const composed = { ...base, ...variants[variant], ...style };
  const Tag = href ? "a" : "button";

  return (
    <Tag
      href={href}
      type={href ? undefined : type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={composed}
      disabled={href ? undefined : disabled}
      {...rest}
    >
      {children}
    </Tag>
  );
}
