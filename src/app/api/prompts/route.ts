import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const prompts = await prisma.promptConfig.findMany({
      orderBy: { loadedAt: "desc" },
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch prompts", detail: message },
      { status: 500 }
    );
  }
}
