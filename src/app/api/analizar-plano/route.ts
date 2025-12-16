// src/app/api/analizar-plano/route.ts
import { NextResponse } from 'next/server';
import { analizarPlano } from '@/ai/flows/analisis-planos-flow';
import { AnalisisPlanoInputSchema, AnalisisPlanoInput } from '@/types/analisis-planos';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

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
    
    const validatedInput = validationResult.data;
    const { companyId, obraId, cache, planType, imageMeta } = validatedInput;

    // Lógica de Cache
    if (cache?.cacheKey && companyId && obraId) {
      if (cache.cacheKey.length > 200) {
        throw new Error("cacheKey inválido: demasiado largo.");
      }
      
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
          hitCount: cachedSnap.data()?.hitCount + 1 || 1,
          result: cachedSnap.data()?.result,
        });
      }
    }

    // Si no hay cache, ejecutar IA
    const analisisOutput = await analizarPlano(validatedInput);

    // Guardar en cache si los datos necesarios están presentes
    if (cache?.cacheKey && companyId && obraId && planType && imageMeta) {
        const { hash, cacheKey, modelId, promptVersion, presetVersion } = cache;
        
        const cacheRef = db
            .collection("companies").doc(companyId)
            .collection("obras").doc(obraId)
            .collection("cubicacion_cache").doc(cacheKey);
        
        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + 90);

        await cacheRef.set({
            cacheKey,
            hash,
            modelId,
            promptVersion,
            presetVersion,
            planType,
            imageMeta,
            result: analisisOutput,
            createdAt: FieldValue.serverTimestamp(),
            lastHitAt: FieldValue.serverTimestamp(),
            hitCount: 0,
            expireAt,
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
