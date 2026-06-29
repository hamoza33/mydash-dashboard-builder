import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getQueue } from "@/lib/queue";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const originalRun = await prisma.dashboardRun.findUnique({
      where: { id },
    });

    if (!originalRun) {
      return NextResponse.json(
        { error: "Original run not found" },
        { status: 404 }
      );
    }

    const newRun = await prisma.dashboardRun.create({
      data: {
        productName: originalRun.productName,
        lfProductId: originalRun.lfProductId,
        dateFrom: originalRun.dateFrom,
        dateTo: originalRun.dateTo,
        defaultCc: originalRun.defaultCc,
        outputFilename: originalRun.outputFilename,
        status: "queued",
        progress: 0,
        currentStep: "queued",
        logs: JSON.stringify([]),
      },
    });

    const dashboardPipelineQueue = getQueue();
    await dashboardPipelineQueue.add("process-dashboard", {
      runId: newRun.id,
      productName: newRun.productName,
      lfProductId: newRun.lfProductId,
      dateFrom: newRun.dateFrom,
      dateTo: newRun.dateTo,
      defaultCc: newRun.defaultCc,
      outputFilename: newRun.outputFilename,
    });

    return NextResponse.json(newRun, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to rerun", detail: message },
      { status: 500 }
    );
  }
}
