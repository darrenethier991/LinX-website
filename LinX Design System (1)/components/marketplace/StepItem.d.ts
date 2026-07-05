import React from "react";

export interface StepItemProps {
  number: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Numbered gold-ring step for "how it works" sequences. */
export function StepItem(props: StepItemProps): JSX.Element;
