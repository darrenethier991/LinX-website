import React from "react";
import { ButtonVariant } from "../actions/Button";

export interface PricingCardProps {
  name: React.ReactNode;
  /** Numeric or string amount, shown after a gold "$" */
  price: React.ReactNode;
  period?: React.ReactNode;
  features?: React.ReactNode[];
  cta?: React.ReactNode;
  ctaVariant?: ButtonVariant;
  /** Gold border + "MOST POPULAR" chip */
  featured?: boolean;
  onCta?: () => void;
  style?: React.CSSProperties;
}

/**
 * A single pricing tier with a gold-checked feature list and CTA.
 * @startingPoint section="Surfaces" subtitle="Pricing tier card" viewport="340x460"
 */
export function PricingCard(props: PricingCardProps): JSX.Element;
