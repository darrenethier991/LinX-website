import React from "react";

export type ButtonVariant = "primary" | "outline-gold" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children: React.ReactNode;
  /** primary = solid gold · outline-gold = black w/ gold border, fills on hover · outline = neutral border */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as an <a> when set */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Full-width */
  block?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

/**
 * Pill-shaped, uppercase LinX call to action.
 * @startingPoint section="Actions" subtitle="Gold pill buttons" viewport="700x120"
 */
export function Button(props: ButtonProps): JSX.Element;
