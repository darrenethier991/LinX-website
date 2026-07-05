import React from "react";

export interface FaqItemProps {
  question: React.ReactNode;
  answer: React.ReactNode;
  defaultOpen?: boolean;
  style?: React.CSSProperties;
}

/** Accordion row with a rotating gold "+" toggle. */
export function FaqItem(props: FaqItemProps): JSX.Element;
