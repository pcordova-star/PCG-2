// src/lib/comparacion-planos/storage.ts
import admin from "@/server/firebaseAdmin";

/**
 * Downloads a file from Firebase Storage and converts it to a Data URI.
 * @param storagePath The full path to the file in the bucket.
 * @returns A promise that resolves to the Data URI string.
 */
export async function getPlanoAsDataUri(storagePath: string): Promise<string> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`El archivo no se encontró en la ruta de Storage: ${storagePath}`);
  }

  const [metadata] = await file.getMetadata();
  const contentType = metadata.contentType || 'application/octet-stream';

  const [buffer] = await file.download();
  const base64 = buffer.toString('base64');
  
  return `data:${contentType};base64,${base64}`;
}

/**
 * Copies the analysis files from an old job to a new job folder in Storage.
 * @param oldJobId The ID of the job to copy from.
 * @param newJobId The ID of the new job to copy to.
 * @returns An object with the new storage paths.
 */
export async function copyPlanoFiles(oldJobId: string, newJobId: string): Promise<{ newPathA: string; newPathB: string }> {
    const bucket = admin.storage().bucket();
    const oldPathA = `comparacion-planos/${oldJobId}/A.jpg`;
    const oldPathB = `comparacion-planos/${oldJobId}/B.jpg`;
    const newPathA = `comparacion-planos/${newJobId}/A.jpg`;
    const newPathB = `comparacion-planos/${newJobId}/B.jpg`;

    // Verify old files exist before copying
    const [existsA] = await bucket.file(oldPathA).exists();
    const [existsB] = await bucket.file(oldPathB).exists();
    if (!existsA || !existsB) {
        throw new Error(`Los archivos del job original (ID: ${oldJobId}) no fueron encontrados en Storage.`);
    }

    // Perform copy operations
    await bucket.file(oldPathA).copy(bucket.file(newPathA));
    await bucket.file(oldPathB).copy(bucket.file(newPathB));

    return { newPathA, newPathB };
}
