// src/lib/mclp/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { ProgramaCumplimiento, RequisitoDocumento } from "@/types/pcg";

// --- Helper Functions ---
async function handleAction(action: Function) {
  try {
    const result = await action();
    return { success: true, data: result ?? null };
  } catch (error: any)    {
    console.error(`[MCLP Action Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// NOTE: The Firestore Admin SDK logic has been moved to API routes.
// These server actions are deprecated for direct use from client components.

export async function getComplianceProgramAction(companyId: string) {
  throw new Error("This server action is deprecated. Use the API route.");
}

export async function updateComplianceProgramAction(companyId: string, data: Partial<ProgramaCumplimiento>) {
  throw new Error("This server action is deprecated. Use the API route.");
}

export async function listRequirementsAction(companyId: string) {
    throw new Error("This server action is deprecated. Use the API route.");
}

export async function createRequirementAction(companyId: string, data: Omit<RequisitoDocumento, 'id' | 'activo'>) {
    throw new Error("This server action is deprecated. Use the API route.");
}

export async function updateRequirementAction(companyId: string, reqId: string, data: Partial<Omit<RequisitoDocumento, 'id'>>) {
    throw new Error("This server action is deprecated. Use the API route.");
}

export async function deactivateRequirementAction(companyId: string, reqId: string) {
    throw new Error("This server action is deprecated. Use the API route.");
}
