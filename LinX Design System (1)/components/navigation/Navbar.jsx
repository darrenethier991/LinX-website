import React from "react";
import { Button } from "../actions/Button.jsx";

/**
 * LinX Navbar — the sticky top bar: LinX wordmark, uppercase nav links,
 * and a gold CTA pill. Translucent dark with a blur.
 */
export function Navbar({ links = [], cta = "Get Started Free", onCta, style = {} }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--linx-nav-bg)",
        borderBottom: "1px solid var(--border-hairline)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 6%",
        height: "var(--nav-height)",
        ...style,
      }}
    >
      <div style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 900, letterSpacing: "var(--ls-tightest)", display: "flex", alignItems: "center", background: "var(--linx-gold-foil)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.5))" }}>
        LinX
      </div>

      <ul style={{ display: "flex", gap: "24px", listStyle: "none", margin: 0, padding: 0 }}>
        {links.map((l, i) => (
          <li key={i}>
            <a
              href={typeof l === "string" ? "#" : l.href}
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--text-secondary)",
                textDecoration: "none",
                textTransform: "uppercase",
                letterSpacing: "var(--ls-wider)",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {typeof l === "string" ? l : l.label}
            </a>
          </li>
        ))}
      </ul>

      <Button variant="primary" size="sm" onClick={onCta}>
        {cta}
      </Button>
    </nav>
  );
}
