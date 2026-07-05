import React, { useState } from "react";

/**
 * LinX Field — a labelled input or textarea. The label is a small
 * uppercase, wide-tracked caption; the control is a dark box that
 * gains a gold border on focus.
 */
export function Field({
  label,
  type = "text",
  multiline = false,
  value,
  onChange,
  placeholder,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = useState(false);

  const controlStyle = {
    width: "100%",
    background: "var(--surface-card)",
    border: `1px solid ${focus ? "var(--linx-gold)" : "var(--border-hairline)"}`,
    color: "var(--text-primary)",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "14px",
    fontFamily: "var(--font-sans)",
    outline: "none",
    transition: "border-color var(--dur-base)",
    boxSizing: "border-box",
    resize: multiline ? "vertical" : undefined,
    minHeight: multiline ? "88px" : "40px",
  };

  return (
    <div style={{ marginBottom: "14px", ...style }}>
      {label && (
        <label
          style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            marginBottom: "5px",
          }}
        >
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={controlStyle}
          {...rest}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={controlStyle}
          {...rest}
        />
      )}
    </div>
  );
}
