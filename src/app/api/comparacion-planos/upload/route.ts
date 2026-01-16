// src/app/api/comparacion-planos/upload/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // ARQUITECTURA DEL ENDPOINT DE UPLOAD:
  try {
    // 1. Validar que el usuario esté autenticado y tenga permisos para el módulo.

    // 2. Extraer los archivos `planoA` y `planoB` del FormData.
    //    const formData = await req.formData();
    //    const planoA = formData.get('planoA');
    //    const planoB = formData.get('planoB');
    //    if (!planoA || !planoB) throw new Error("UPLOAD_MISSING_FILES", "Faltan archivos.");

    // 3. Generar un `jobId` único.
    //    const jobId = crypto.randomUUID();

    // 4. Llamar a la función de la librería de Firestore para crear el documento del job.
    //    await createComparacionJob(jobId, { status: "pending-upload", userId: "..." });

    // 5. Convertir los archivos a JPEG (si son PDF) usando la función `convertToJpeg`.
    //    const jpegBufferA = await convertToJpeg(planoA);
    //    const jpegBufferB = await convertToJpeg(planoB);

    // 6. Subir los JPEGs resultantes a Firebase Storage.
    //    await uploadPlanoA(jobId, jpegBufferA);
    //    await uploadPlanoB(jobId, jpegBufferB);

    // 7. Actualizar el estado del job en Firestore a "uploaded".
    //    await updateComparacionJobStatus(jobId, "uploaded");

    // 8. Devolver el ID del job para que el frontend pueda iniciar el análisis y el polling.
    //    return NextResponse.json({ jobId, status: "uploaded" });

  } catch (error: any) {
    // En caso de cualquier error en esta etapa:
    // a. Si el job ya fue creado, actualizar su estado a 'error' y guardar el mensaje.
    //    if (jobId) {
    //        await updateComparacionJobStatus(jobId, "error");
    //        await setComparacionJobError(jobId, { code: error.code, message: error.message });
    //    }
    // b. Devolver una respuesta de error al cliente.
    //    return NextResponse.json({ status: "error", code: error.code, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "upload endpoint placeholder" });
}
