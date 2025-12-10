import { firebaseStorage } from "@/lib/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadPlanoToStorage(
  file: File,
  companyId: string,
  userId: string
): Promise<{ url: string; contentType: string }> {
  const safeName = file.name.replace(/\s+/g, "_");
  const storagePath = `analisis-planos/${companyId}/${userId}/${Date.now()}-${safeName}`;

  const storageRef = ref(firebaseStorage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    contentType: file.type || "application/octet-stream",
  };
}
