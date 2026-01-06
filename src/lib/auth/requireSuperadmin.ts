// src/lib/auth/requireSuperadmin.ts
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Ensures the request is made by a user with a 'superadmin' role.
 * Throws an error or returns a NextResponse for API routes.
 * @param req The NextRequest object.
 */
export async function requireSuperadmin(req?: NextRequest): Promise<void> {
  const auth = getAdminAuth();
  const authorization = headers().get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }

  const token = authorization.split("Bearer ")[1];
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    const userClaims = decodedToken.role;

    if (userClaims !== "superadmin") {
      throw new Error("PERMISSION_DENIED");
    }
    // Si es superadmin, no hace nada (la función retorna void).
  } catch (error: any) {
    if (error.message === "PERMISSION_DENIED") {
      throw error;
    }
    // Re-lanza otros errores de verificación de token
    throw new Error("UNAUTHENTICATED");
  }
}

/**
 * Middleware-style error handler for requireSuperadmin.
 * Catches specific errors and returns appropriate NextResponse objects.
 * @param handler The API route handler to wrap.
 */
export function withSuperadminAuth(
  handler: (req: NextRequest, ...args: any[]) => Promise<Response>
) {
  return async (req: NextRequest, ...args: any[]): Promise<Response> => {
    try {
      await requireSuperadmin(req);
      return await handler(req, ...args);
    } catch (error: any) {
      if (error.message === "UNAUTHENTICATED") {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }
      if (error.message === "PERMISSION_DENIED") {
        return NextResponse.json({ error: "Permission denied." }, { status: 403 });
      }
      // Log for unexpected errors
      console.error("[withSuperadminAuth] Unexpected error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
