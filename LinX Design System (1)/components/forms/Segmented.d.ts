import React from "react";

export interface SegmentedOption {
  label: React.ReactNode;
  value: string;
}

export interface SegmentedProps {
  /** String values or {label, value} objects */
  options: (string | SegmentedOption)[];
  value: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Pill segmented control; active segment fills gold. */
export function Segmented(props: SegmentedProps): JSX.Element;
