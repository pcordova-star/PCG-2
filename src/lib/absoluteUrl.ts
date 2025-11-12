// src/lib/absoluteUrl.ts
import { headers } from "next/headers";

export function absoluteUrl(path: string) {
  // Prioridad: env -> headers -> fallback http://localhost:3000
  const envBase =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL;

  if (envBase) return new URL(path, envBase).toString();

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const base = `${proto}://${host}`;
  return new URL(path, base).toString();
}
