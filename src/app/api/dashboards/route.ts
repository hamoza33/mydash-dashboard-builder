import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const dashboards = await prisma.dashboardRun.findMany({
      where: {
        status: "completed",
        dashboardSlug: { not: null },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        productName: true,
        dashboardSlug: true,
        dashboardUrl: true,
        sheetUrl: true,
        dateFrom: true,
        dateTo: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ dashboards });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch dashboards", detail: message },
      { status: 500 }
    );
  }
}
