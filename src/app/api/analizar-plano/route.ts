// src/app/api/analizar-plano/route.ts
import { NextResponse } from 'next/server';
import { analizarPlano } from '@/ai/flows/analisis-planos-flow';
import { AnalisisPlanoInputSchema, AnalisisPlanoInput } from '@/types/analisis-planos';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { sha256DataUrl } from '@/lib/hash/sha256DataUrl';

export const runtime = "nodejs";
export const maxDuration = 60; // 60 segundos de timeout

const db = getAdminDb();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validationResult = AnalisisPlanoInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Los datos de entrada son inválidos.", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const validatedInput: AnalisisPlanoInput = validationResult.data;

    const { companyId, obraId, cache } = body;

    // Lógica de Cache
    if (cache?.cacheKey && companyId && obraId) {
      const cacheRef = db
        .collection("companies").doc(companyId)
        .collection("obras").doc(obraId)
        .collection("cubicacion_cache").doc(cache.cacheKey);

      const cachedSnap = await cacheRef.get();

      if (cachedSnap.exists()) {
        await cacheRef.update({
          hitCount: FieldValue.increment(1),
          lastHitAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
          cached: true,
          cacheKey: cache.cacheKey,
          result: cachedSnap.data()?.result,
        });
      }
    }

    // Si no hay cache, ejecutar IA
    const analisisOutput = await analizarPlano(validatedInput);

    // Guardar en cache
    if (cache?.cacheKey && companyId && obraId) {
        const { hash, cacheKey, modelId, promptVersion, presetVersion } = cache;
        const { planType, imageMeta } = body;
        
        const cacheRef = db
            .collection("companies").doc(companyId)
            .collection("obras").doc(obraId)
            .collection("cubicacion_cache").doc(cacheKey);

        await cacheRef.set({
            cacheKey,
            hash,
            modelId,
            promptVersion,
            presetVersion,
            planType,
            imageMeta, // sizeMb, width, height
            result: analisisOutput,
            createdAt: FieldValue.serverTimestamp(),
            lastHitAt: FieldValue.serverTimestamp(),
            hitCount: 0,
        });
    }

    return NextResponse.json({ cached: false, cacheKey: cache?.cacheKey, result: analisisOutput });

  } catch (error: any) {
    console.error("[API /analizar-plano] Error:", error);
    return NextResponse.json(
      { error: error.message || "Ocurrió un error inesperado en el servidor." },
      { status: 500 }
    );
  }
}
