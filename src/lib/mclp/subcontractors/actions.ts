"use server";

import { createSubcontractor as create } from "./createSubcontractor";
import { listSubcontractors as list } from "./listSubcontractors";
import { deactivateSubcontractor as deactivate } from "./deactivateSubcontractor";
import { inviteContractor as invite } from "./inviteContractor";
import { revalidatePath } from "next/cache";

async function handleAction(action: Function, params: any) {
    try {
        const result = await action(params);
        revalidatePath('/cumplimiento/admin/subcontratistas');
        return { success: true, data: result || null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function listSubcontractorsAction(companyId: string) {
    try {
        const data = await list(companyId);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createSubcontractorAction(params: { companyId: string, razonSocial: string, rut: string, contactoNombre: string, contactoEmail: string }) {
    return handleAction(() => create(params.companyId, {
        razonSocial: params.razonSocial,
        rut: params.rut,
        contactoPrincipal: {
            nombre: params.contactoNombre,
            email: params.contactoEmail
        }
    }), params);
}

export async function deactivateSubcontractorAction(companyId: string, id: string) {
    return handleAction(() => deactivate(companyId, id), { companyId, id });
}

export async function inviteContractorAction(params: { companyId: string, subcontractorId: string, nombre: string, email: string }) {
     return handleAction(() => invite(params), params);
}
