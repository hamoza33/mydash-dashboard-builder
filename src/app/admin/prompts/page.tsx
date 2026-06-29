"use client";

import { useEffect, useState } from "react";

interface PromptConfig {
  id: string;
  docUrl: string;
  docTitle: string;
  loadedAt: string;
  contentHash: string;
  promptVersion: number;
  content: string;
  type: string;
}

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompts();
  }, []);

  async function fetchPrompts() {
    setLoading(true);
    try {
      const res = await fetch("/api/prompts");
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      console.error("Failed to fetch prompts:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch("/api/prompts/refresh", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRefreshResult(
          `Refreshed! Reconciliation v${data.reconciliation.version}${data.reconciliation.isNew ? " (new)" : ""}, Dashboard v${data.dashboard.version}${data.dashboard.isNew ? " (new)" : ""}`
        );
        await fetchPrompts();
      } else {
        setRefreshResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setRefreshResult(
        `Error: ${err instanceof Error ? err.message : "Unknown"}`
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#e2e4f0]">Prompt Management</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg bg-[#a78bfa] hover:bg-[#a78bfa]/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? "Refreshing..." : "Refresh from Google Docs"}
        </button>
      </div>

      {refreshResult && (
        <div
          className={`mb-4 p-3 rounded-lg border text-sm ${
            refreshResult.startsWith("Error")
              ? "bg-red-500/10 border-red-500/30 text-[#f87171]"
              : "bg-green-500/10 border-green-500/30 text-[#4ade80]"
          }`}
        >
          {refreshResult}
        </div>
      )}

      {loading && (
        <div className="text-[#9099b8]">Loading prompts...</div>
      )}

      {!loading && prompts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#9099b8] mb-4">No prompts loaded yet.</p>
          <p className="text-sm text-[#9099b8]">
            Click &quot;Refresh from Google Docs&quot; to load prompts.
          </p>
        </div>
      )}

      {!loading && prompts.length > 0 && (
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="rounded-xl bg-[#0f1018] border border-[#272a3a] overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === prompt.id ? null : prompt.id)
                }
                className="w-full p-4 text-left flex items-center justify-between hover:bg-[#161820] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#e2e4f0]">
                      {prompt.docTitle || prompt.type}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        prompt.type === "RECONCILIATION"
                          ? "bg-violet-500/20 text-[#a78bfa] border-violet-500/30"
                          : "bg-cyan-500/20 text-[#22d3ee] border-cyan-500/30"
                      }`}
                    >
                      {prompt.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#9099b8]">
                    <span>v{prompt.promptVersion}</span>
                    <span>
                      Loaded: {new Date(prompt.loadedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-[#9099b8] text-sm">
                  {expandedId === prompt.id ? "Hide" : "Show"}
                </span>
              </button>
              {expandedId === prompt.id && (
                <div className="border-t border-[#272a3a] p-4">
                  <pre className="text-xs text-[#9099b8] whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">
                    {prompt.content || "(empty)"}
                  </pre>
                  <div className="mt-3 pt-3 border-t border-[#272a3a] text-xs text-[#9099b8]">
                    <span>Hash: {prompt.contentHash.slice(0, 16)}...</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
