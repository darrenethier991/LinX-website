import React from "react";

export interface TestimonialProps {
  /** Number of gold stars, 1–5 */
  rating?: number;
  quote: React.ReactNode;
  author: React.ReactNode;
  role?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Star-rated italic quote with author attribution. */
export function Testimonial(props: TestimonialProps): JSX.Element;
