import React from "react";

export interface StatItemProps {
  /** The headline figure, e.g. "1,400+" or "4.9 ★" */
  value: React.ReactNode;
  label: React.ReactNode;
  style?: React.CSSProperties;
}

/** Big gold stat over a wide-tracked caption. */
export function StatItem(props: StatItemProps): JSX.Element;
