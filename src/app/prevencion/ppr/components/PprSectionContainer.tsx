"use client";
// src/app/prevencion/ppr/components/PprSectionContainer.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PprSectionContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PprSectionContainer({ title, description, children }: PprSectionContainerProps) {
  return (
    <section>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{description}</p>
      </header>
      <Card>
        <CardContent className="p-6">
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

export function PprSectionHeader({ title }: { title: string }) {
    return <h3 className="text-lg font-semibold mb-4 border-b pb-2">{title}</h3>;
}

export function PprPlaceholderField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="w-full rounded-md border border-dashed bg-muted/50 p-2 text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}
