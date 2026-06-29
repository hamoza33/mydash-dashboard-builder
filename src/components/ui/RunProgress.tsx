"use client";

interface RunProgressProps {
  status: string;
  progress: number;
  currentStep: string;
}

const steps = [
  { key: "queued", label: "Queued" },
  { key: "loading_prompts", label: "Loading Prompts" },
  { key: "running_reconciliation_prompt", label: "Reconciliation" },
  { key: "fetching_cod_leads", label: "COD Leads" },
  { key: "fetching_cod_orders", label: "COD Orders" },
  { key: "fetching_lightfunnels_orders", label: "LF Orders" },
  { key: "fetching_tracking", label: "Tracking" },
  { key: "building_merged_sheet", label: "Merged Sheet" },
  { key: "running_dashboard_prompt", label: "Dashboard" },
  { key: "deploying_dashboard", label: "Deploying" },
  { key: "completed", label: "Done" },
];

export default function RunProgress({
  status,
  progress,
  currentStep,
}: RunProgressProps) {
  const currentIndex = steps.findIndex(
    (s) => s.key === currentStep || s.key === status
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#9099b8]">Progress</span>
        <span className="text-[#e2e4f0] font-medium">{progress}%</span>
      </div>

      <div className="w-full h-2 bg-[#1e2030] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === "failed"
              ? "bg-[#f87171]"
              : status === "completed"
              ? "bg-[#4ade80]"
              : "bg-[#60a5fa]"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-1 gap-1.5 mt-4">
        {steps.map((step, index) => {
          let dotColor = "bg-[#272a3a]";
          let textColor = "text-[#9099b8]";

          if (status === "failed" && step.key === currentStep) {
            dotColor = "bg-[#f87171]";
            textColor = "text-[#f87171]";
          } else if (index < currentIndex) {
            dotColor = "bg-[#4ade80]";
            textColor = "text-[#4ade80]";
          } else if (index === currentIndex && status !== "failed") {
            dotColor = "bg-[#60a5fa]";
            textColor = "text-[#60a5fa]";
          }

          return (
            <div key={step.key} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${dotColor}`} />
              <span className={`text-xs ${textColor}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
