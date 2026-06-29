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
      select: {
        id: true,
        status: true,
        progress: true,
        currentStep: true,
        errorMessage: true,
        sheetUrl: true,
        dashboardUrl: true,
        dashboardSlug: true,
        completedAt: true,
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch status", detail: message },
      { status: 500 }
    );
  }
}
