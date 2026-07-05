import React from "react";

export interface AdminBadgeProps {
  children: React.ReactNode;
  tone?: "success" | "muted" | "accent";
  style?: React.CSSProperties;
}

/** Rounded status pill for the admin theme. */
export function AdminBadge(props: AdminBadgeProps): JSX.Element;
