import React from "react";

export interface AdminStatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** +N today indicator */
  delta?: number;
  accent?: "accent" | "success" | "danger";
  style?: React.CSSProperties;
}

/** Metric tile for the internal admin dashboard (slate/sky theme). */
export function AdminStatCard(props: AdminStatCardProps): JSX.Element;
