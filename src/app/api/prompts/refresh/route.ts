import { NextRequest, NextResponse } from "next/server";
import { PromptLoader } from "@/lib/prompt-loader";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  try {
    const reconciliationDocId =
      process.env.GOOGLE_DOC_RECONCILIATION_ID || "";
    const dashboardDocId = process.env.GOOGLE_DOC_DASHBOARD_ID || "";

    if (!reconciliationDocId || !dashboardDocId) {
      return NextResponse.json(
        { error: "Google Doc IDs not configured in environment" },
        { status: 500 }
      );
    }

    const [reconciliation, dashboard] = await Promise.all([
      PromptLoader.loadPrompt(reconciliationDocId, "RECONCILIATION"),
      PromptLoader.loadPrompt(dashboardDocId, "DASHBOARD"),
    ]);

    return NextResponse.json({
      reconciliation: {
        version: reconciliation.version,
        isNew: reconciliation.isNew,
      },
      dashboard: {
        version: dashboard.version,
        isNew: dashboard.isNew,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to refresh prompts", detail: message },
      { status: 500 }
    );
  }
}
