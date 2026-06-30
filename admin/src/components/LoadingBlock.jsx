import React from "react";

export function LoadingBlock({ height = "h-24" }) {
  return <div className={`linx-skeleton ${height} w-full`} />;
}
