// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import { analizarPlano } from "@/ai/flows/analisis-planos-flow";
import { AnalisisPlanoInputSchema } from "@/types/analisis-planos";
import type { AnalisisPlanoInput } from "@/types/analisis-planos";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validationResult = AnalisisPlanoInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Los datos de entrada son inválidos.",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const validatedInput: AnalisisPlanoInput = validationResult.data;
    const { companyId, obraId, cache, planType, imageMeta } = validatedInput;

    // ✅ Import dinámico para evitar que Vercel/Turbopack evalúe firebase-admin en build-time
    const { getAdminDb } = await import("@/lib/firebaseAdmin");
    const { FieldValue } = await import("firebase-admin/firestore");
    const db = getAdminDb();

    // ===== CACHE LOOKUP =====
    if (cache?.cacheKey && companyId && obraId) {
      if (cache.cacheKey.length > 180) {
        throw new Error("cacheKey inválida: demasiado larga.");
      }

      const cacheRef = db
        .collection("companies")
        .doc(companyId)
        .collection("obras")
        .doc(obraId)
        .collection("cubicacion_cache")
        .doc(cache.cacheKey);

      const cachedSnap = await cacheRef.get();

      if (cachedSnap.exists) {
        await cacheRef.update({
          hitCount: FieldValue.increment(1),
          lastHitAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
          cached: true,
          cacheKey: cache.cacheKey,
          result: cachedSnap.data()!.result,
        });
      }
    }

    // ===== EJECUTAR IA =====
    const analisisOutput = await analizarPlano(validatedInput);

    // ===== GUARDAR CACHE =====
    if (cache?.cacheKey && companyId && obraId) {
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + 90);

      const cacheRef = db
        .collection("companies")
        .doc(companyId)
        .collection("obras")
        .doc(obraId)
        .collection("cubicacion_cache")
        .doc(cache.cacheKey);

      await cacheRef.set({
        cacheKey: cache.cacheKey,
        hash: cache.hash,
        modelId: cache.modelId,
        promptVersion: cache.promptVersion,
        presetVersion: cache.presetVersion,
        planType: planType ?? null,
        imageMeta: imageMeta ?? null,
        result: analisisOutput,
        createdAt: FieldValue.serverTimestamp(),
        lastHitAt: FieldValue.serverTimestamp(),
        hitCount: 0,
        expireAt,
      });
    }

    return NextResponse.json({
      cached: false,
      cacheKey: cache?.cacheKey ?? null,
      result: analisisOutput,
    });
  } catch (error: any) {
    console.error("[API /analizar-plano] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Ocurrió un error inesperado en el servidor." },
      { status: 500 }
    );
  }
}
