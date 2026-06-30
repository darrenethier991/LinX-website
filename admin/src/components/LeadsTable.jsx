import React from "react";

export function LeadsTable({ leads }) {
  return (
    <div className="linx-card p-4 overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-200">Recent Leads</div>
        <div className="text-xs text-slate-400">
          Showing {leads?.length || 0} records
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Category</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Source</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads?.map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-slate-800/80 hover:bg-slate-800/60"
              >
                <td className="px-3 py-2 text-slate-200">{lead.name || lead.title}</td>
                <td className="px-3 py-2 text-slate-300">{lead.category}</td>
                <td className="px-3 py-2 text-slate-300">{lead.sourcePlatform || lead.source}</td>
                <td className="px-3 py-2">
                  {lead.active || lead.status === "active" ? (
                    <span className="linx-badge-success">Active</span>
                  ) : (
                    <span className="linx-badge-muted">Expired</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-400 text-xs">
                  {lead.created_at || lead.postedAt}
                </td>
              </tr>
            ))}
            {!leads?.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500 text-sm">
                  No leads available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
