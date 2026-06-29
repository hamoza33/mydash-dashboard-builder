"use client";

interface LogViewerProps {
  logs: string[];
}

export default function LogViewer({ logs }: LogViewerProps) {
  if (logs.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-[#0f1018] border border-[#272a3a] text-sm text-[#9099b8]">
        No logs yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[#0f1018] border border-[#272a3a] overflow-hidden">
      <div className="p-3 border-b border-[#272a3a] flex items-center justify-between">
        <span className="text-xs font-medium text-[#9099b8] uppercase tracking-wide">
          Pipeline Logs
        </span>
        <span className="text-xs text-[#9099b8]">{logs.length} entries</span>
      </div>
      <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-1">
        {logs.map((log, index) => {
          let textColor = "text-[#e2e4f0]";
          if (log.includes("ERROR") || log.includes("FATAL")) {
            textColor = "text-[#f87171]";
          } else if (log.includes("DONE")) {
            textColor = "text-[#4ade80]";
          } else if (log.includes("START")) {
            textColor = "text-[#60a5fa]";
          } else if (log.includes("SKIP")) {
            textColor = "text-[#fbbf24]";
          }

          return (
            <div key={index} className={`${textColor} break-all`}>
              {log}
            </div>
          );
        })}
      </div>
    </div>
  );
}
