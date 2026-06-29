"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import RunProgress from "@/components/ui/RunProgress";
import LogViewer from "@/components/ui/LogViewer";

interface DashboardRun {
  id: string;
  productName: string;
  lfProductId: string;
  dateFrom: string;
  dateTo: string;
  defaultCc: string;
  outputFilename: string;
  status: string;
  progress: number;
  currentStep: string;
  sheetUrl: string | null;
  dashboardUrl: string | null;
  dashboardSlug: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  logs: string;
}

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [run, setRun] = useState<DashboardRun | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRun(data);
      }
    } catch (err) {
      console.error("Failed to fetch run:", err);
    }
  }, [id]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchRun(), fetchLogs()]);
      setLoading(false);
    }
    init();
  }, [fetchRun, fetchLogs]);

  useEffect(() => {
    if (!run) return;
    if (run.status === "completed" || run.status === "failed") return;

    const interval = setInterval(() => {
      fetchRun();
      fetchLogs();
    }, 3000);

    return () => clearInterval(interval);
  }, [run, fetchRun, fetchLogs]);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      const res = await fetch(`/api/runs/${id}/rerun`, { method: "POST" });
      if (res.ok) {
        const newRun = await res.json();
        router.push(`/runs/${newRun.id}`);
      }
    } catch (err) {
      console.error("Failed to rerun:", err);
    } finally {
      setRerunning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this run?")) return;
    try {
      const res = await fetch(`/api/runs/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-[#9099b8]">Loading...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-[#f87171]">Run not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e4f0]">
            {run.productName}
          </h1>
          <p className="text-sm text-[#9099b8] mt-1">
            {run.dateFrom} to {run.dateTo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={run.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Run details */}
          <div className="p-5 rounded-xl bg-[#0f1018] border border-[#272a3a]">
            <h2 className="text-sm font-medium text-[#9099b8] uppercase tracking-wide mb-4">
              Run Details
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[#9099b8]">Product Name</dt>
                <dd className="text-[#e2e4f0] mt-0.5">{run.productName}</dd>
              </div>
              <div>
                <dt className="text-[#9099b8]">LF Product ID</dt>
                <dd className="text-[#e2e4f0] mt-0.5">{run.lfProductId}</dd>
              </div>
              <div>
                <dt className="text-[#9099b8]">Date Range</dt>
                <dd className="text-[#e2e4f0] mt-0.5">
                  {run.dateFrom} - {run.dateTo}
                </dd>
              </div>
              <div>
                <dt className="text-[#9099b8]">Default CC</dt>
                <dd className="text-[#e2e4f0] mt-0.5">
                  {run.defaultCc || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-[#9099b8]">Output Filename</dt>
                <dd className="text-[#e2e4f0] mt-0.5">
                  {run.outputFilename || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-[#9099b8]">Created</dt>
                <dd className="text-[#e2e4f0] mt-0.5">
                  {new Date(run.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            {(run.sheetUrl || run.dashboardUrl) && (
              <div className="mt-4 pt-4 border-t border-[#272a3a] flex gap-3">
                {run.sheetUrl && (
                  <a
                    href={run.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#60a5fa] hover:text-[#60a5fa]/80"
                  >
                    View Sheet
                  </a>
                )}
                {run.dashboardUrl && (
                  <a
                    href={run.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#4ade80] hover:text-[#4ade80]/80"
                  >
                    View Dashboard
                  </a>
                )}
              </div>
            )}

            {run.errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-[#f87171]">
                {run.errorMessage}
              </div>
            )}
          </div>

          {/* Logs */}
          <LogViewer logs={logs} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#0f1018] border border-[#272a3a]">
            <RunProgress
              status={run.status}
              progress={run.progress}
              currentStep={run.currentStep}
            />
          </div>

          <div className="p-5 rounded-xl bg-[#0f1018] border border-[#272a3a] space-y-3">
            <button
              onClick={handleRerun}
              disabled={rerunning}
              className="w-full py-2 px-4 rounded-lg bg-[#60a5fa] hover:bg-[#60a5fa]/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rerunning ? "Creating..." : "Re-run Pipeline"}
            </button>
            <button
              onClick={handleDelete}
              className="w-full py-2 px-4 rounded-lg bg-[#f87171]/10 hover:bg-[#f87171]/20 border border-[#f87171]/30 text-[#f87171] text-sm font-medium transition-colors"
            >
              Delete Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
