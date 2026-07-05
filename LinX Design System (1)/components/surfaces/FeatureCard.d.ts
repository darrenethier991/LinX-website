import React from "react";

export interface FeatureCardProps {
  /** Emoji or node used as the icon */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Gold-checked bullet list */
  features?: React.ReactNode[];
  style?: React.CSSProperties;
}

/**
 * Emoji + title + description + gold-checked feature list.
 * @startingPoint section="Surfaces" subtitle="Feature / audience card" viewport="360x320"
 */
export function FeatureCard(props: FeatureCardProps): JSX.Element;
