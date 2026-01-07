// src/lib/mclp/calendarActions.ts
"use server";

import { revalidatePath } from "next/cache";

// --- Helper Functions ---
async function handleAction(action: Function) {
  try {
    const result = await action();
    // For client-side mutations that need revalidation, this is the way.
    revalidatePath('/cumplimiento/admin/calendario');
    return { success: true, data: result ?? null };
  } catch (error: any) {
    console.error(`[MCLP Calendar Action Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// NOTE: The actual Firestore logic for these actions has been moved to API routes
// to avoid bundling firebase-admin in the Next.js client build.
// These functions are now wrappers that would call the API endpoints.
// For this refactor, we will have the client components call the API directly.
// These server actions are now deprecated and will be removed or repurposed.

export async function getOrCreateCalendarAction(companyId: string, year: number) {
    // This logic is now in /api/mclp/calendar
    throw new Error("This server action is deprecated. Use the API route.");
}

export async function listCalendarMonthsAction(companyId: string, year: number) {
  // This logic is now in /api/mclp/calendar
  throw new Error("This server action is deprecated. Use the API route.");
}

export async function updateCalendarMonthAction(companyId: string, year: number, monthId: string, data: { corteCarga: string, limiteRevision: string, fechaPago: string }) {
    // This logic is now in /api/mclp/calendar
    throw new Error("This server action is deprecated. Use the API route.");
}
