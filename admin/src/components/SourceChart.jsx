import React from "react";
import { Bar } from "react-chartjs-2";

export function SourceChart({ data }) {
  const labels = data?.map((d) => d.source) || [];
  const values = data?.map((d) => d.count) || [];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Leads by Source",
        data: values,
        backgroundColor: "rgba(34, 197, 94, 0.6)",
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#e5e7eb" } },
      tooltip: {
        backgroundColor: "#020617",
        borderColor: "#22c55e",
        borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
      y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(22,163,74,0.2)" } },
    },
  };

  return (
    <div className="linx-card p-4">
      <div className="mb-2 text-sm font-medium text-slate-200">Lead Sources</div>
      <Bar data={chartData} options={options} />
    </div>
  );
}
