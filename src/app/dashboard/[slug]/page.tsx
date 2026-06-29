"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface DashboardData {
  id: string;
  productName: string;
  dashboardSlug: string | null;
  dashboardUrl: string | null;
  sheetUrl: string | null;
  dateFrom: string;
  dateTo: string;
  completedAt: string | null;
}

export default function DashboardViewPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`/api/dashboards/${slug}`);
        if (!res.ok) {
          throw new Error("Dashboard not found");
        }
        const data = await res.json();
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-[#9099b8]">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-[#f87171]">{error || "Dashboard not found"}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e2e4f0]">
          {dashboard.productName}
        </h1>
        <p className="text-sm text-[#9099b8] mt-1">
          {dashboard.dateFrom} to {dashboard.dateTo}
        </p>
      </div>

      <div className="p-6 rounded-xl bg-[#0f1018] border border-[#272a3a] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dashboard.dashboardUrl && (
            <div>
              <dt className="text-sm text-[#9099b8]">Dashboard URL</dt>
              <dd className="mt-1">
                <a
                  href={dashboard.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#60a5fa] hover:text-[#60a5fa]/80 break-all"
                >
                  {dashboard.dashboardUrl}
                </a>
              </dd>
            </div>
          )}
          {dashboard.sheetUrl && (
            <div>
              <dt className="text-sm text-[#9099b8]">Sheet URL</dt>
              <dd className="mt-1">
                <a
                  href={dashboard.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#4ade80] hover:text-[#4ade80]/80 break-all"
                >
                  {dashboard.sheetUrl}
                </a>
              </dd>
            </div>
          )}
        </div>

        {dashboard.completedAt && (
          <p className="text-xs text-[#9099b8]">
            Completed: {new Date(dashboard.completedAt).toLocaleString()}
          </p>
        )}

        {dashboard.dashboardUrl && (
          <div className="mt-6">
            <iframe
              src={dashboard.dashboardUrl}
              className="w-full h-[600px] rounded-lg border border-[#272a3a]"
              title={`Dashboard: ${dashboard.productName}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
