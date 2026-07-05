import React from "react";

export interface NavLink {
  label: React.ReactNode;
  href?: string;
}

export interface NavbarProps {
  links?: (string | NavLink)[];
  cta?: React.ReactNode;
  onCta?: () => void;
  style?: React.CSSProperties;
}

/**
 * Sticky brand navigation: wordmark, uppercase links, gold CTA.
 * @startingPoint section="Navigation" subtitle="Marketing top nav" viewport="1040x64"
 */
export function Navbar(props: NavbarProps): JSX.Element;
