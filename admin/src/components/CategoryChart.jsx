import React from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export function CategoryChart({ data }) {
  const labels = data?.map((d) => d.category) || [];
  const values = data?.map((d) => d.count) || [];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Leads by Category",
        data: values,
        backgroundColor: "rgba(56, 189, 248, 0.6)",
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
        borderColor: "#38bdf8",
        borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
      y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(30,64,175,0.2)" } },
    },
  };

  return (
    <div className="linx-card p-4">
      <div className="mb-2 text-sm font-medium text-slate-200">Lead Categories</div>
      <Bar data={chartData} options={options} />
    </div>
  );
}
