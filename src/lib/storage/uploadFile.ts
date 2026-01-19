// src/lib/storage/uploadFile.ts
"use client";
import { firebaseStorage } from "@/lib/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Sube un archivo a Firebase Storage usando el SDK oficial.
 * @param file El archivo a subir.
 * @param path La ruta completa en el bucket donde se guardará el archivo.
 * @returns La URL de descarga pública del archivo.
 */
export async function uploadFileToStorage(
  file: File,
  path: string
): Promise<string> {
  const storageRef = ref(firebaseStorage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}
