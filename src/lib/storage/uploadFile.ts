"use client";
import { firebaseStorage } from "@/lib/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadFileToStorage(
  file: File,
  path: string
): Promise<string> {
  const storageRef = ref(firebaseStorage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "public,max-age=3600",
  });

  return await getDownloadURL(storageRef);
}
