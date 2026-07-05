import React from "react";
import { BadgeTone } from "../display/Badge";

export interface LiveCardProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Location · budget · time */
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  badgeTone?: BadgeTone;
  style?: React.CSSProperties;
}

/** A live project-feed row: icon, title, meta, status badge. */
export function LiveCard(props: LiveCardProps): JSX.Element;
