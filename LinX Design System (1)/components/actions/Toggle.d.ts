import React from "react";

export interface ToggleProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  style?: React.CSSProperties;
}

/** Pill switch with a gold thumb — billing and role selectors. */
export function Toggle(props: ToggleProps): JSX.Element;
