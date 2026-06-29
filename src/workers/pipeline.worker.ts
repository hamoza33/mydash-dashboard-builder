import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { PromptLoader } from "../lib/prompt-loader";
import { mcpClients, McpClient } from "../lib/mcp-client";
import { redisConnection, type DashboardPipelineJobData } from "../lib/queue";
import { reconcile, type ReconciliationInput } from "../lib/reconciliation";
import { buildDashboardHtml } from "../lib/dashboard-builder";

const prisma = new PrismaClient();

const connection = redisConnection;

/**
 * Pipeline steps for tracking progress.
 * These map to the DashboardRun status values.
 */
export const PIPELINE_STEPS = [
  "loading_prompts",
  "running_reconciliation_prompt",
  "fetching_cod_leads",
  "fetching_cod_orders",
  "fetching_lightfunnels_orders",
  "fetching_tracking",
  "building_merged_sheet",
  "running_dashboard_prompt",
  "deploying_dashboard",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

/**
 * Updates the DashboardRun status in the database.
 */
export async function updateRunStatus(
  runId: string,
  step: PipelineStep,
  stepIndex: number,
  additionalData?: Record<string, unknown>
) {
  const progress = Math.round(((stepIndex + 1) / PIPELINE_STEPS.length) * 100);

  await prisma.dashboardRun.update({
    where: { id: runId },
    data: {
      status: step,
      currentStep: step,
      progress,
      ...additionalData,
    },
  });
}

/**
 * Appends a log entry to the run's logs.
 */
export async function appendLog(runId: string, message: string) {
  const run = await prisma.dashboardRun.findUnique({ where: { id: runId } });
  if (!run) return;

  const logs = JSON.parse(run.logs || "[]") as string[];
  logs.push(`[${new Date().toISOString()}] ${message}`);

  await prisma.dashboardRun.update({
    where: { id: runId },
    data: { logs: JSON.stringify(logs) },
  });
}

/**
 * Calls an MCP tool and handles the response, logging results.
 */
export async function callMcpTool(
  client: McpClient | null,
  tool: string,
  args: Record<string, unknown>,
  runId: string,
  description: string
): Promise<unknown> {
  if (!client) {
    await appendLog(runId, `SKIP: ${description} - MCP client not configured`);
    return null;
  }

  await appendLog(runId, `START: ${description}`);
  const result = await client.callTool({ tool, arguments: args });

  if (!result.success) {
    await appendLog(runId, `ERROR: ${description} - ${result.error}`);
    throw new Error(`${description} failed: ${result.error}`);
  }

  await appendLog(runId, `DONE: ${description}`);
  return result.data;
}

/**
 * Main pipeline processor.
 * Orchestrates the full dashboard pipeline from prompt loading through deployment.
 */
export async function processPipeline(job: Job<DashboardPipelineJobData>) {
  const {
    runId,
    productName,
    lfProductId,
    dateFrom,
    dateTo,
    defaultCc,
    outputFilename,
  } = job.data;

  try {
    // Step 1: Load prompts
    await updateRunStatus(runId, "loading_prompts", 0);
    await appendLog(runId, "Loading reconciliation and dashboard prompts...");

    const reconciliationDocId =
      process.env.GOOGLE_DOC_RECONCILIATION_ID || "";
    const dashboardDocId = process.env.GOOGLE_DOC_DASHBOARD_ID || "";

    const reconciliationPrompt = await PromptLoader.loadPrompt(
      reconciliationDocId,
      "RECONCILIATION"
    );
    const dashboardPrompt = await PromptLoader.loadPrompt(
      dashboardDocId,
      "DASHBOARD"
    );

    await prisma.dashboardRun.update({
      where: { id: runId },
      data: {
        reconciliationPromptSnapshot: reconciliationPrompt.content,
        dashboardPromptSnapshot: dashboardPrompt.content,
      },
    });
    await appendLog(runId, `Loaded prompts (reconciliation v${reconciliationPrompt.version}, dashboard v${dashboardPrompt.version})`);

    // Step 2: Run reconciliation prompt (prepare)
    await updateRunStatus(runId, "running_reconciliation_prompt", 1);
    await appendLog(runId, "Preparing reconciliation configuration...");

    // Step 3: Fetch COD leads
    await updateRunStatus(runId, "fetching_cod_leads", 2);
    const codClient = mcpClients.codNetwork();
    const codLeadsResult = await callMcpTool(
      codClient,
      "fetch_leads",
      { productName, dateFrom, dateTo, defaultCc },
      runId,
      "Fetch COD leads"
    );
    const codLeads = Array.isArray(codLeadsResult) ? codLeadsResult : [];

    // Step 4: Fetch COD orders
    await updateRunStatus(runId, "fetching_cod_orders", 3);
    const codOrdersResult = await callMcpTool(
      codClient,
      "fetch_orders",
      { productName, dateFrom, dateTo },
      runId,
      "Fetch COD orders"
    );
    const codOrders = Array.isArray(codOrdersResult) ? codOrdersResult : [];

    // Step 5: Fetch LightFunnels orders
    await updateRunStatus(runId, "fetching_lightfunnels_orders", 4);
    const lfClient = mcpClients.lightfunnels();
    const lfOrdersResult = await callMcpTool(
      lfClient,
      "fetch_orders",
      { productId: lfProductId, dateFrom, dateTo },
      runId,
      "Fetch LightFunnels orders"
    );
    const lfOrders = Array.isArray(lfOrdersResult) ? lfOrdersResult : [];

    // Step 6: Fetch tracking data
    await updateRunStatus(runId, "fetching_tracking", 5);
    const trackingClient = mcpClients.tracking();
    const trackingResult = await callMcpTool(
      trackingClient,
      "fetch_tracking",
      { productName, dateFrom, dateTo },
      runId,
      "Fetch tracking data"
    );
    const trackingData = Array.isArray(trackingResult) ? trackingResult : [];

    // Step 7: Build merged sheet using reconciliation engine
    await updateRunStatus(runId, "building_merged_sheet", 6);
    await appendLog(runId, "Running reconciliation engine...");

    const reconciliationInput: ReconciliationInput = {
      codLeads,
      codOrders,
      lfOrders,
      trackingData,
      defaultCc,
      productName,
    };

    const reconciliationResult = reconcile(reconciliationInput);
    await appendLog(
      runId,
      `Reconciliation complete: ${reconciliationResult.totalRecords} records, ${reconciliationResult.reconciledCount} reconciled, ${reconciliationResult.duplicatesFound} duplicates`
    );

    // Upload sheet via MCP
    const sheetClient = mcpClients.sheet();
    const sheetResult = await callMcpTool(
      sheetClient,
      "build_sheet",
      {
        productName,
        outputFilename,
        dateFrom,
        dateTo,
        headers: reconciliationResult.headers,
        rows: reconciliationResult.rows,
      },
      runId,
      "Build merged sheet"
    );

    let sheetUrl: string | undefined;
    if (
      sheetResult &&
      typeof sheetResult === "object" &&
      "url" in (sheetResult as Record<string, unknown>)
    ) {
      sheetUrl = (sheetResult as Record<string, unknown>).url as string;
      await prisma.dashboardRun.update({
        where: { id: runId },
        data: { sheetUrl },
      });
    }

    // Step 8: Run dashboard prompt / build dashboard HTML
    await updateRunStatus(runId, "running_dashboard_prompt", 7);
    await appendLog(runId, "Building dashboard HTML...");

    const dashboardHtml = buildDashboardHtml({
      productName,
      dateFrom,
      dateTo,
      metrics: reconciliationResult.metrics,
      totalOrders: reconciliationResult.totalRecords,
      reconciledCount: reconciliationResult.reconciledCount,
      duplicatesFound: reconciliationResult.duplicatesFound,
      sheetUrl,
    });

    // Step 9: Deploy dashboard
    await updateRunStatus(runId, "deploying_dashboard", 8);
    await appendLog(runId, "Deploying dashboard...");

    const importClient = mcpClients.import();
    const deployResult = await callMcpTool(
      importClient,
      "deploy_dashboard",
      {
        productName,
        html: dashboardHtml,
        dateFrom,
        dateTo,
      },
      runId,
      "Deploy dashboard"
    );

    let dashboardUrl: string | undefined;
    let dashboardSlug: string | undefined;

    if (deployResult && typeof deployResult === "object") {
      const result = deployResult as Record<string, unknown>;
      dashboardUrl = result.url as string | undefined;
      dashboardSlug = result.slug as string | undefined;
    }

    // Mark as completed
    await prisma.dashboardRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        progress: 100,
        currentStep: "done",
        completedAt: new Date(),
        ...(dashboardUrl ? { dashboardUrl } : {}),
        ...(dashboardSlug ? { dashboardSlug } : {}),
      },
    });

    await appendLog(runId, "Pipeline completed successfully!");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await prisma.dashboardRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        errorMessage,
      },
    });

    await appendLog(runId, `FATAL ERROR: ${errorMessage}`);
    throw error;
  }
}

// Create and export the worker
const worker = new Worker<DashboardPipelineJobData>(
  "dashboard-pipeline",
  processPipeline,
  {
    connection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed for run ${job.data.runId}`);
});

worker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id} failed for run ${job?.data.runId}:`,
    error.message
  );
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

// Graceful shutdown on SIGTERM/SIGINT (container environments)
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down worker gracefully...`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

console.log("Dashboard pipeline worker started");

export default worker;
