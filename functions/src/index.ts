// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({
  region: "southamerica-west1",
  // OJO: no declares serviceAccount acá a menos que exista realmente.
  // serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com",
});

export { createCompanyUser } from "./createCompanyUser";
export { setSuperAdminClaim } from "./setSuperAdmin";
export { registrarAvanceRapido } from "./registrarAvanceRapido";
export { convertHeicToJpg } from "./convertHeic";
export { notifyDocumentDistribution } from "./notifyDocumentDistribution";
export { getSecureDownloadUrl } from "./secureDownload";
export { processItemizadoJob } from "./processItemizadoJob";
export { testGoogleAi } from "./test-google-ai";
