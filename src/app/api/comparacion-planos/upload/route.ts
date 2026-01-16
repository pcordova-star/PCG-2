// src/app/api/comparacion-planos/upload/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // ARQUITECTURA DEL ENDPOINT DE UPLOAD:
  // 1. Validar que el usuario esté autenticado y tenga permisos para el módulo.

  // 2. Extraer los archivos `planoA` y `planoB` del FormData.
  //    const formData = await req.formData();
  //    const planoA = formData.get('planoA');
  //    const planoB = formData.get('planoB');

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

  return NextResponse.json({ message: "upload endpoint placeholder" });
}
