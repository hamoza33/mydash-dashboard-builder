"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RunCard from "@/components/ui/RunCard";

interface DashboardRun {
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
}

interface RunsResponse {
  runs: DashboardRun[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function HomePage() {
  const [data, setData] = useState<RunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchRuns() {
      setLoading(true);
      try {
        const res = await fetch(`/api/runs?page=${page}&limit=20`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch runs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRuns();
  }, [page]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#e2e4f0]">Pipeline Runs</h1>
        <Link
          href="/new"
          className="px-4 py-2 rounded-lg bg-[#60a5fa] hover:bg-[#60a5fa]/90 text-white text-sm font-medium transition-colors"
        >
          New Run
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[#9099b8]">Loading...</div>
        </div>
      )}

      {!loading && data && data.runs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#9099b8] mb-4">No runs yet.</p>
          <Link
            href="/new"
            className="text-[#60a5fa] hover:text-[#60a5fa]/80 text-sm font-medium"
          >
            Create your first pipeline run
          </Link>
        </div>
      )}

      {!loading && data && data.runs.length > 0 && (
        <>
          <div className="grid gap-3">
            {data.runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-md bg-[#1e2030] border border-[#272a3a] text-sm text-[#e2e4f0] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#272a3a] transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-[#9099b8]">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                }
                disabled={page === data.pagination.totalPages}
                className="px-3 py-1.5 rounded-md bg-[#1e2030] border border-[#272a3a] text-sm text-[#e2e4f0] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#272a3a] transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
