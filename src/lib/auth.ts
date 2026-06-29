import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the admin password from the Authorization header.
 * Expects: Authorization: Bearer <ADMIN_PASSWORD>
 *
 * Returns null if authentication passes, or a 401 response if it fails.
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "Server misconfiguration: ADMIN_PASSWORD not set" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || token !== adminPassword) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  return null;
}
