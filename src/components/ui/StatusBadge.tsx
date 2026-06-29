"use client";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-blue-500/20 text-[#60a5fa] border-blue-500/30" },
  loading_prompts: { label: "Loading Prompts", className: "bg-violet-500/20 text-[#a78bfa] border-violet-500/30" },
  running_reconciliation_prompt: { label: "Reconciliation", className: "bg-violet-500/20 text-[#a78bfa] border-violet-500/30" },
  fetching_cod_leads: { label: "COD Leads", className: "bg-cyan-500/20 text-[#22d3ee] border-cyan-500/30" },
  fetching_cod_orders: { label: "COD Orders", className: "bg-cyan-500/20 text-[#22d3ee] border-cyan-500/30" },
  fetching_lightfunnels_orders: { label: "LF Orders", className: "bg-cyan-500/20 text-[#22d3ee] border-cyan-500/30" },
  fetching_tracking: { label: "Tracking", className: "bg-cyan-500/20 text-[#22d3ee] border-cyan-500/30" },
  building_merged_sheet: { label: "Building Sheet", className: "bg-amber-500/20 text-[#fbbf24] border-amber-500/30" },
  running_dashboard_prompt: { label: "Dashboard", className: "bg-violet-500/20 text-[#a78bfa] border-violet-500/30" },
  deploying_dashboard: { label: "Deploying", className: "bg-amber-500/20 text-[#fbbf24] border-amber-500/30" },
  completed: { label: "Completed", className: "bg-green-500/20 text-[#4ade80] border-green-500/30" },
  failed: { label: "Failed", className: "bg-red-500/20 text-[#f87171] border-red-500/30" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
