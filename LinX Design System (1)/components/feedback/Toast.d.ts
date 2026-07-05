import React from "react";

export interface ToastProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/** Gold-bordered notification chip. Parent controls visibility/position. */
export function Toast(props: ToastProps): JSX.Element;
