import { getAdminApp } from '../firebaseAdmin';

const adminApp = getAdminApp();
const bucket = adminApp.storage().bucket();

export async function getPlanoAsDataUri(storagePath: string): Promise<{data: string, mimeType: string}> {
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File not found in Storage: ${storagePath}`);
  }
  
  const [metadata] = await file.getMetadata();
  const contentType = metadata.contentType || 'application/octet-stream';

  const [buffer] = await file.download();
  const base64 = buffer.toString('base64');
  
  return {
      data: base64,
      mimeType: contentType
  };
}
