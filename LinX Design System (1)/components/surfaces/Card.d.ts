import React from "react";

export interface CardProps {
  children: React.ReactNode;
  /** Warm the border to gold and lift on hover */
  hoverable?: boolean;
  padding?: string;
  style?: React.CSSProperties;
}

/** Base dark surface — hairline border, 14px radius. */
export function Card(props: CardProps): JSX.Element;
