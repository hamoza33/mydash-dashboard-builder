"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";

interface RunCardProps {
  run: {
    id: string;
    productName: string;
    status: string;
    progress: number;
    currentStep: string;
    dateFrom: string;
    dateTo: string;
    createdAt: string;
    completedAt?: string | null;
    errorMessage?: string | null;
  };
}

export default function RunCard({ run }: RunCardProps) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="block p-4 rounded-lg bg-[#161820] border border-[#272a3a] hover:border-[#60a5fa]/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[#e2e4f0] truncate">
          {run.productName}
        </h3>
        <StatusBadge status={run.status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-[#9099b8] mb-3">
        <span>{run.dateFrom} - {run.dateTo}</span>
      </div>

      {run.status !== "completed" && run.status !== "failed" && run.status !== "queued" && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#9099b8]">{run.currentStep}</span>
            <span className="text-[#9099b8]">{run.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#1e2030] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#60a5fa] rounded-full transition-all duration-300"
              style={{ width: `${run.progress}%` }}
            />
          </div>
        </div>
      )}

      {run.errorMessage && (
        <p className="text-xs text-[#f87171] mt-2 truncate">
          {run.errorMessage}
        </p>
      )}

      <div className="text-xs text-[#9099b8] mt-2">
        {new Date(run.createdAt).toLocaleString()}
      </div>
    </Link>
  );
}
