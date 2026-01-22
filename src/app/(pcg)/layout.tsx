"use client";

import ClientLayoutShell from "../layoutClient";

export default function PCGLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayoutShell>{children}</ClientLayoutShell>;
}
