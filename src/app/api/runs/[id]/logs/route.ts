import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await prisma.dashboardRun.findUnique({
      where: { id },
      select: { id: true, logs: true },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const logs = JSON.parse(run.logs || "[]") as string[];

    return NextResponse.json({ id: run.id, logs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch logs", detail: message },
      { status: 500 }
    );
  }
}
