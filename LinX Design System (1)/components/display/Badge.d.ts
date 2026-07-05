import React from "react";

export type BadgeTone = "success" | "info" | "error" | "gold" | "muted";

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  style?: React.CSSProperties;
}

/** Tinted status pill — LIVE / NEW / HOT and generic labels. */
export function Badge(props: BadgeProps): JSX.Element;
