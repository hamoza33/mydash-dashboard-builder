/**
 * Database seed script.
 *
 * Creates sample data for local development and testing.
 * Run with: npm run seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create sample prompt configs
  const reconciliationPrompt = await prisma.promptConfig.upsert({
    where: { id: "seed-reconciliation-prompt" },
    update: {},
    create: {
      id: "seed-reconciliation-prompt",
      docUrl:
        "https://docs.google.com/document/d/1jSr0t8GZZpGZeYfBCvrpxMwVNplCKJKN9rVhVz3D3P4/export?format=txt",
      docTitle: "RECONCILIATION Prompt v1",
      contentHash: "seed-hash-reconciliation",
      promptVersion: 1,
      content:
        "Reconciliation prompt content: normalize phones, detect schema, map cities, assemble 45-column rows.",
      type: "RECONCILIATION",
    },
  });

  const dashboardPrompt = await prisma.promptConfig.upsert({
    where: { id: "seed-dashboard-prompt" },
    update: {},
    create: {
      id: "seed-dashboard-prompt",
      docUrl:
        "https://docs.google.com/document/d/1EXVVZ9mW-MtT42up3OWgTuvLQ6YxlnsO3TWf2P17Pz0/export?format=txt",
      docTitle: "DASHBOARD Prompt v1",
      contentHash: "seed-hash-dashboard",
      promptVersion: 1,
      content:
        "Dashboard prompt content: build HTML dashboard with metrics, design tokens, and responsive layout.",
      type: "DASHBOARD",
    },
  });

  console.log("Created prompt configs:", {
    reconciliation: reconciliationPrompt.id,
    dashboard: dashboardPrompt.id,
  });

  // Create sample dashboard runs
  const completedRun = await prisma.dashboardRun.upsert({
    where: { id: "seed-run-completed" },
    update: {},
    create: {
      id: "seed-run-completed",
      productName: "Premium Widget",
      lfProductId: "lf-product-123",
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      defaultCc: "966",
      outputFilename: "premium-widget-jan-2024",
      status: "completed",
      progress: 100,
      currentStep: "done",
      sheetUrl: "https://docs.google.com/spreadsheets/d/example-sheet-id",
      dashboardUrl: "https://example.com/dashboard/premium-widget-jan-2024",
      dashboardSlug: "premium-widget-jan-2024",
      completedAt: new Date("2024-01-31T23:00:00Z"),
      logs: JSON.stringify([
        "[2024-01-31T20:00:00.000Z] Loading reconciliation and dashboard prompts...",
        "[2024-01-31T20:00:05.000Z] Loaded prompts (reconciliation v1, dashboard v1)",
        "[2024-01-31T20:00:10.000Z] START: Fetch COD leads",
        "[2024-01-31T20:00:30.000Z] DONE: Fetch COD leads",
        "[2024-01-31T20:00:35.000Z] START: Fetch COD orders",
        "[2024-01-31T20:00:55.000Z] DONE: Fetch COD orders",
        "[2024-01-31T20:01:00.000Z] START: Fetch LightFunnels orders",
        "[2024-01-31T20:01:20.000Z] DONE: Fetch LightFunnels orders",
        "[2024-01-31T20:01:25.000Z] START: Fetch tracking data",
        "[2024-01-31T20:01:45.000Z] DONE: Fetch tracking data",
        "[2024-01-31T20:01:50.000Z] Running reconciliation engine...",
        "[2024-01-31T20:02:00.000Z] Reconciliation complete: 450 records, 380 reconciled, 12 duplicates",
        "[2024-01-31T20:02:05.000Z] START: Build merged sheet",
        "[2024-01-31T20:02:30.000Z] DONE: Build merged sheet",
        "[2024-01-31T20:02:35.000Z] Building dashboard HTML...",
        "[2024-01-31T20:02:40.000Z] Deploying dashboard...",
        "[2024-01-31T20:02:50.000Z] Pipeline completed successfully!",
      ]),
      reconciliationPromptSnapshot:
        "Reconciliation prompt content: normalize phones, detect schema, map cities, assemble 45-column rows.",
      dashboardPromptSnapshot:
        "Dashboard prompt content: build HTML dashboard with metrics, design tokens, and responsive layout.",
    },
  });

  const failedRun = await prisma.dashboardRun.upsert({
    where: { id: "seed-run-failed" },
    update: {},
    create: {
      id: "seed-run-failed",
      productName: "Budget Gadget",
      lfProductId: "lf-product-456",
      dateFrom: "2024-02-01",
      dateTo: "2024-02-15",
      defaultCc: "971",
      outputFilename: "budget-gadget-feb-2024",
      status: "failed",
      progress: 45,
      currentStep: "fetching_lightfunnels_orders",
      errorMessage: "Fetch LightFunnels orders failed: MCP call failed (503): Service temporarily unavailable",
      logs: JSON.stringify([
        "[2024-02-15T10:00:00.000Z] Loading reconciliation and dashboard prompts...",
        "[2024-02-15T10:00:05.000Z] Loaded prompts (reconciliation v1, dashboard v1)",
        "[2024-02-15T10:00:10.000Z] START: Fetch COD leads",
        "[2024-02-15T10:00:30.000Z] DONE: Fetch COD leads",
        "[2024-02-15T10:00:35.000Z] START: Fetch COD orders",
        "[2024-02-15T10:00:55.000Z] DONE: Fetch COD orders",
        "[2024-02-15T10:01:00.000Z] START: Fetch LightFunnels orders",
        "[2024-02-15T10:01:05.000Z] ERROR: Fetch LightFunnels orders - MCP call failed (503): Service temporarily unavailable",
        "[2024-02-15T10:01:05.000Z] FATAL ERROR: Fetch LightFunnels orders failed: MCP call failed (503): Service temporarily unavailable",
      ]),
    },
  });

  const pendingRun = await prisma.dashboardRun.upsert({
    where: { id: "seed-run-pending" },
    update: {},
    create: {
      id: "seed-run-pending",
      productName: "Deluxe Gizmo",
      lfProductId: "lf-product-789",
      dateFrom: "2024-03-01",
      dateTo: "2024-03-31",
      defaultCc: "966",
      outputFilename: "deluxe-gizmo-mar-2024",
      status: "pending",
      progress: 0,
      currentStep: "",
      logs: JSON.stringify([]),
    },
  });

  console.log("Created dashboard runs:", {
    completed: completedRun.id,
    failed: failedRun.id,
    pending: pendingRun.id,
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
