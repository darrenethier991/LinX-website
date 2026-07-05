import React from "react";

export interface FieldProps {
  label?: React.ReactNode;
  type?: string;
  multiline?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

/** Labelled dark input / textarea that gains a gold focus border. */
export function Field(props: FieldProps): JSX.Element;
