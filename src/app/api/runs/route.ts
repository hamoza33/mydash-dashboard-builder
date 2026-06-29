import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getQueue } from "@/lib/queue";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      prisma.dashboardRun.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dashboardRun.count(),
    ]);

    return NextResponse.json({
      runs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch runs", detail: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, lfProductId, dateFrom, dateTo, defaultCc, outputFilename } = body;

    if (!productName || !lfProductId || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Missing required fields: productName, lfProductId, dateFrom, dateTo" },
        { status: 400 }
      );
    }

    const run = await prisma.dashboardRun.create({
      data: {
        productName,
        lfProductId,
        dateFrom,
        dateTo,
        defaultCc: defaultCc || "",
        outputFilename: outputFilename || `${productName}-${dateFrom}-${dateTo}`,
        status: "queued",
        progress: 0,
        currentStep: "queued",
        logs: JSON.stringify([]),
      },
    });

    const dashboardPipelineQueue = getQueue();
    await dashboardPipelineQueue.add("process-dashboard", {
      runId: run.id,
      productName: run.productName,
      lfProductId: run.lfProductId,
      dateFrom: run.dateFrom,
      dateTo: run.dateTo,
      defaultCc: run.defaultCc,
      outputFilename: run.outputFilename,
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create run", detail: message },
      { status: 500 }
    );
  }
}
