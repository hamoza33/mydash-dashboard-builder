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
 * Fetches COD leads with pagination support.
 * Tool: "cod_export_lead_inputs" on COD Network MCP
 * Returns paginated results with has_more/next_offset pattern.
 */
async function fetchCodLeadsPaginated(
  client: McpClient | null,
  productName: string,
  dateFrom: string,
  dateTo: string,
  runId: string
): Promise<Record<string, unknown>[]> {
  if (!client) {
    await appendLog(runId, "SKIP: Fetch COD leads - MCP client not configured");
    return [];
  }

  const allLeads: Record<string, unknown>[] = [];
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const args: Record<string, unknown> = {
      product_name: productName,
      since: dateFrom,
      until: dateTo,
      chunk_size: 2000,
    };
    if (offset > 0) {
      args.offset = offset;
    }

    await appendLog(runId, `START: Fetch COD leads page ${pageCount} (offset=${offset})`);
    const result = await client.callTool({ tool: "cod_export_lead_inputs", arguments: args });

    if (!result.success) {
      await appendLog(runId, `ERROR: Fetch COD leads page ${pageCount} - ${result.error}`);
      throw new Error(`Fetch COD leads page ${pageCount} failed: ${result.error}`);
    }

    const data = result.data as Record<string, unknown>;
    const leads = (data?.leads || []) as Record<string, unknown>[];
    allLeads.push(...leads);

    const totalMatched = data?.total_matched ?? 0;
    const returned = data?.returned ?? leads.length;
    hasMore = Boolean(data?.has_more);
    offset = (data?.next_offset as number) || (offset + leads.length);

    await appendLog(
      runId,
      `DONE: COD leads page ${pageCount}: got ${returned} records (total_matched=${totalMatched}, has_more=${hasMore})`
    );
  }

  await appendLog(runId, `Fetched ${allLeads.length} total COD leads across ${pageCount} page(s)`);
  return allLeads;
}

/**
 * Fetches COD orders with pagination support.
 * Tool: "cod_export_orders" on COD Network MCP
 * Returns paginated results with has_more/next_offset pattern.
 */
async function fetchCodOrdersPaginated(
  client: McpClient | null,
  productName: string,
  dateFrom: string,
  dateTo: string,
  runId: string
): Promise<Record<string, unknown>[]> {
  if (!client) {
    await appendLog(runId, "SKIP: Fetch COD orders - MCP client not configured");
    return [];
  }

  const allOrders: Record<string, unknown>[] = [];
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const args: Record<string, unknown> = {
      product_name: productName,
      since: dateFrom,
      until: dateTo,
      chunk_size: 2000,
    };
    if (offset > 0) {
      args.offset = offset;
    }

    await appendLog(runId, `START: Fetch COD orders page ${pageCount} (offset=${offset})`);
    const result = await client.callTool({ tool: "cod_export_orders", arguments: args });

    if (!result.success) {
      await appendLog(runId, `ERROR: Fetch COD orders page ${pageCount} - ${result.error}`);
      throw new Error(`Fetch COD orders page ${pageCount} failed: ${result.error}`);
    }

    const data = result.data as Record<string, unknown>;
    const orders = (data?.orders || []) as Record<string, unknown>[];
    allOrders.push(...orders);

    const totalMatched = data?.total_matched ?? 0;
    const returned = data?.returned ?? orders.length;
    hasMore = Boolean(data?.has_more);
    offset = (data?.next_offset as number) || (offset + orders.length);

    await appendLog(
      runId,
      `DONE: COD orders page ${pageCount}: got ${returned} records (total_matched=${totalMatched}, has_more=${hasMore})`
    );
  }

  await appendLog(runId, `Fetched ${allOrders.length} total COD orders across ${pageCount} page(s)`);
  return allOrders;
}

/**
 * Fetches LightFunnels orders with cursor-based pagination.
 * Tool: "lf_fetch_all_orders" on LightFunnels MCP
 * Pagination via next_cursor until has_more = false.
 */
async function fetchLfOrdersPaginated(
  client: McpClient | null,
  lfProductId: string,
  dateFrom: string,
  runId: string
): Promise<Record<string, unknown>[]> {
  if (!client) {
    await appendLog(runId, "SKIP: Fetch LightFunnels orders - MCP client not configured");
    return [];
  }

  const allOrders: Record<string, unknown>[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const args: Record<string, unknown> = {
      query: `order_by:created_at order_dir:desc product_id:${lfProductId}`,
      since_date: dateFrom,
      limit: 100,
      include_test: false,
    };
    if (cursor) {
      args.cursor = cursor;
    }

    await appendLog(runId, `START: Fetch LightFunnels orders page ${pageCount}`);
    const result = await client.callTool({ tool: "lf_fetch_all_orders", arguments: args });

    if (!result.success) {
      await appendLog(runId, `ERROR: Fetch LF orders page ${pageCount} - ${result.error}`);
      throw new Error(`Fetch LF orders page ${pageCount} failed: ${result.error}`);
    }

    const data = result.data as Record<string, unknown>;
    // LF response may have orders in "orders" or "data" array
    const orders = (data?.orders || data?.data || []) as Record<string, unknown>[];
    allOrders.push(...orders);

    hasMore = Boolean(data?.has_more);
    cursor = (data?.next_cursor as string) || null;

    await appendLog(
      runId,
      `DONE: LF orders page ${pageCount}: got ${orders.length} records (has_more=${hasMore})`
    );

    // Safety: break if no cursor returned and has_more claims true
    if (hasMore && !cursor) {
      await appendLog(runId, "WARN: LF has_more=true but no next_cursor, stopping pagination");
      break;
    }
  }

  await appendLog(runId, `Fetched ${allOrders.length} total LF orders across ${pageCount} page(s)`);
  return allOrders;
}

/**
 * Fetches tracking data in batches of 50 waybills.
 * Tool: "get_shipment_summary" on Tracking MCP
 * Args: { waybills: string[], lang: "en" }
 */
async function fetchTrackingBatched(
  client: McpClient | null,
  trackingNumbers: string[],
  runId: string
): Promise<Record<string, unknown>[]> {
  if (!client) {
    await appendLog(runId, "SKIP: Fetch tracking - MCP client not configured");
    return [];
  }

  if (trackingNumbers.length === 0) {
    await appendLog(runId, "SKIP: Fetch tracking - no tracking numbers to look up");
    return [];
  }

  const allResults: Record<string, unknown>[] = [];
  const BATCH_SIZE = 50;
  const batches = Math.ceil(trackingNumbers.length / BATCH_SIZE);

  await appendLog(runId, `Fetching tracking for ${trackingNumbers.length} waybills in ${batches} batch(es)`);

  for (let i = 0; i < batches; i++) {
    const batch = trackingNumbers.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

    await appendLog(runId, `START: Fetch tracking batch ${i + 1}/${batches} (${batch.length} waybills)`);
    const result = await client.callTool({
      tool: "get_shipment_summary",
      arguments: { waybills: batch, lang: "en" },
    });

    if (!result.success) {
      await appendLog(runId, `ERROR: Fetch tracking batch ${i + 1} - ${result.error}`);
      // Continue with other batches rather than failing completely
      continue;
    }

    const data = result.data;
    // Response may be an array directly or wrapped in an object
    if (Array.isArray(data)) {
      allResults.push(...(data as Record<string, unknown>[]));
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const shipments = (obj.shipments || obj.data || obj.results || []) as Record<string, unknown>[];
      if (Array.isArray(shipments)) {
        allResults.push(...shipments);
      }
    }

    await appendLog(runId, `DONE: Tracking batch ${i + 1}/${batches}`);
  }

  await appendLog(runId, `Fetched tracking data for ${allResults.length} shipments`);
  return allResults;
}

/**
 * Extracts tracking numbers from reconciled orders.
 * Looks for tracking_number, tracking, or waybill fields in COD orders.
 */
function extractTrackingNumbers(
  codOrders: Record<string, unknown>[],
  codLeads: Record<string, unknown>[]
): string[] {
  const trackingSet = new Set<string>();

  const allRecords = [...codOrders, ...codLeads];
  for (const record of allRecords) {
    const tn = String(
      record.tracking_number ||
      record.tracking ||
      record.waybill ||
      record.awb ||
      ""
    ).trim();
    if (tn && tn !== "undefined" && tn !== "null") {
      trackingSet.add(tn);
    }
  }

  return Array.from(trackingSet);
}

/**
 * Generates a URL-safe slug from product name and date.
 * Pattern: ^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$
 */
function generateSlug(productName: string, date: string): string {
  const namePart = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, "")        // Trim leading/trailing hyphens
    .slice(0, 40);                   // Limit length to leave room for date + suffix

  const slug = `${namePart}-${date}`;

  // Ensure slug matches the required pattern
  return slug
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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

    // Step 3: Fetch COD leads using cod_export_lead_inputs with pagination
    await updateRunStatus(runId, "fetching_cod_leads", 2);
    const codClient = mcpClients.codNetwork();
    const codLeads = await fetchCodLeadsPaginated(
      codClient,
      productName,
      dateFrom,
      dateTo,
      runId
    );

    // Step 4: Fetch COD orders using cod_export_orders with pagination
    await updateRunStatus(runId, "fetching_cod_orders", 3);
    const codOrders = await fetchCodOrdersPaginated(
      codClient,
      productName,
      dateFrom,
      dateTo,
      runId
    );

    // Step 5: Fetch LightFunnels orders using lf_fetch_all_orders with cursor pagination
    await updateRunStatus(runId, "fetching_lightfunnels_orders", 4);
    const lfClient = mcpClients.lightfunnels();
    const lfOrders = await fetchLfOrdersPaginated(
      lfClient,
      lfProductId,
      dateFrom,
      runId
    );

    // Step 6: Fetch tracking data using get_shipment_summary in batches of 50
    await updateRunStatus(runId, "fetching_tracking", 5);
    const trackingClient = mcpClients.tracking();
    const trackingNumbers = extractTrackingNumbers(codOrders, codLeads);
    await appendLog(runId, `Found ${trackingNumbers.length} tracking numbers to look up`);
    const trackingData = await fetchTrackingBatched(
      trackingClient,
      trackingNumbers,
      runId
    );

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

    // Upload sheet via SHEET BOND MCP: sheets_create + sheets_batch_update_multi
    const sheetClient = mcpClients.sheet();
    let sheetUrl: string | undefined;

    if (sheetClient) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const sheetTitle = `COD_LF_Full_Merged - ${productName} - ${today}`;

        // Step 1: Create the spreadsheet
        const createResult = await callMcpTool(
          sheetClient,
          "sheets_create",
          { title: sheetTitle },
          runId,
          "Create spreadsheet"
        );

        let spreadsheetId: string | undefined;
        if (createResult && typeof createResult === "object") {
          const res = createResult as Record<string, unknown>;
          await appendLog(runId, `sheets_create response keys: ${Object.keys(res).join(", ")}`);

          // Try multiple possible field names for the spreadsheet ID
          spreadsheetId = (res.spreadsheetId || res.spreadsheet_id || res.id) as string | undefined;

          if (spreadsheetId) {
            sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
          } else if (res.url) {
            sheetUrl = res.url as string;
            // Extract spreadsheet ID from URL
            const match = (res.url as string).match(/\/d\/([^/]+)/);
            if (match) spreadsheetId = match[1];
          }

          // If still no spreadsheetId but we have a URL, try extracting from it
          if (!spreadsheetId && sheetUrl) {
            const match = sheetUrl.match(/\/d\/([^/]+)/);
            if (match) spreadsheetId = match[1];
          }

          await appendLog(runId, `Extracted spreadsheetId: ${spreadsheetId || "NONE"}, sheetUrl: ${sheetUrl || "NONE"}`);
        } else if (typeof createResult === "string") {
          // Check if the string is an error message
          if (createResult.toLowerCase().startsWith("error")) {
            await appendLog(runId, `sheets_create returned error: ${createResult}`);
            // Don't set spreadsheetId - skip sheet writing
          } else if (createResult.includes("spreadsheets/d/")) {
            sheetUrl = createResult;
            const match = createResult.match(/\/d\/([^/]+)/);
            if (match) spreadsheetId = match[1];
          } else if (/^[a-zA-Z0-9_-]+$/.test(createResult)) {
            // Looks like a valid spreadsheet ID
            spreadsheetId = createResult;
            sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
          } else {
            await appendLog(runId, `sheets_create returned unexpected string: ${createResult.slice(0, 100)}`);
          }
          if (spreadsheetId) {
            await appendLog(runId, `sheets_create returned string, spreadsheetId: ${spreadsheetId}`);
          }
        }

        if (spreadsheetId) {
          // Step 2: Write all data (headers + rows) using sheets_batch_update_multi
          const allValues: string[][] = [
            reconciliationResult.headers,
            ...reconciliationResult.rows,
          ];

          // Split into batches of 5000 rows to avoid payload limits
          const BATCH_SIZE = 5000;
          const totalRows = allValues.length;

          if (totalRows <= BATCH_SIZE) {
            await callMcpTool(
              sheetClient,
              "sheets_batch_update_multi",
              {
                spreadsheet_id: spreadsheetId,
                data: [
                  {
                    range: `Sheet1!A1:AS${totalRows}`,
                    values: allValues,
                  },
                ],
                value_input_option: "RAW",
              },
              runId,
              `Write ${totalRows} rows to sheet`
            );
          } else {
            // Write in chunks
            const chunks: { range: string; values: string[][] }[] = [];
            for (let i = 0; i < totalRows; i += BATCH_SIZE) {
              const chunk = allValues.slice(i, i + BATCH_SIZE);
              chunks.push({
                range: `Sheet1!A${i + 1}:AS${i + chunk.length}`,
                values: chunk,
              });
            }
            await callMcpTool(
              sheetClient,
              "sheets_batch_update_multi",
              {
                spreadsheet_id: spreadsheetId,
                data: chunks,
                value_input_option: "RAW",
              },
              runId,
              `Write ${totalRows} rows to sheet in ${chunks.length} chunks`
            );
          }

          await appendLog(runId, `Sheet created: ${sheetUrl}`);
        } else {
          await appendLog(runId, "WARN: Could not extract spreadsheet ID from sheets_create response");
        }

        // Update run with sheet URL
        if (sheetUrl) {
          await prisma.dashboardRun.update({
            where: { id: runId },
            data: { sheetUrl },
          });
        }
      } catch (sheetError) {
        const msg = sheetError instanceof Error ? sheetError.message : String(sheetError);
        await appendLog(runId, `WARN: Sheet creation failed (non-fatal): ${msg}`);
      }
    } else {
      await appendLog(runId, "SKIP: Sheet creation - SHEET_MCP_URL not configured");
    }

    // Step 8: Run dashboard prompt / build dashboard HTML
    await updateRunStatus(runId, "running_dashboard_prompt", 7);
    await appendLog(runId, "Building dashboard HTML...");

    // Generate slug before building dashboard (needed for DASHBOARD_DATA_API path)
    const importClient = mcpClients.import();
    let dashboardUrl: string | undefined;
    let dashboardSlug: string | undefined;
    const today = new Date().toISOString().split("T")[0];
    let baseSlug = generateSlug(productName, today);
    let slug = baseSlug;

    if (importClient) {
      try {
        const listResult = await callMcpTool(
          importClient,
          "list_dashboards",
          {},
          runId,
          "Check existing dashboards"
        );

        if (listResult && Array.isArray(listResult)) {
          const existingSlugs = new Set(
            (listResult as Record<string, unknown>[]).map((d) => d.slug as string)
          );
          let suffix = 1;
          while (existingSlugs.has(slug)) {
            suffix++;
            slug = `${baseSlug}-${suffix}`;
          }
          if (slug !== baseSlug) {
            await appendLog(runId, `Slug "${baseSlug}" taken, using "${slug}"`);
          }
        }
      } catch {
        await appendLog(runId, "WARN: Could not check existing dashboards, proceeding with generated slug");
      }
    }

    const dashboardHtml = buildDashboardHtml({
      productName,
      dateFrom,
      dateTo,
      reconciliationRows: reconciliationResult.rows,
      sheetUrl,
      dashboardSlug: slug,
    });

    // Step 9: Deploy dashboard via deploy_dashboard on IMPORT BOND
    await updateRunStatus(runId, "deploying_dashboard", 8);
    await appendLog(runId, "Deploying dashboard...");

    if (importClient) {
      // Deploy with correct schema
      const dashboardName = `${productName} \u2014 ${today}`;
      const deployResult = await callMcpTool(
        importClient,
        "deploy_dashboard",
        {
          slug,
          name: dashboardName,
          html: dashboardHtml,
          sheetUrl: sheetUrl || undefined,
          category: "Products",
        },
        runId,
        "Deploy dashboard"
      );

      dashboardSlug = slug;
      dashboardUrl = `https://dash.shopinzo.bond/${slug}`;

      if (deployResult && typeof deployResult === "object") {
        const result = deployResult as Record<string, unknown>;
        // Use URL from response if available
        if (result.url) {
          dashboardUrl = result.url as string;
        }
      }

      await appendLog(runId, `Dashboard deployed: ${dashboardUrl}`);
    } else {
      await appendLog(runId, "SKIP: Dashboard deployment - IMPORT_MCP_URL not configured");
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
