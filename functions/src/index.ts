// functions/src/index.ts
import * as admin from "firebase-admin";
admin.initializeApp();

export { createCompanyUser } from "./createCompanyUser";
export { analizarPlano } from "./analizarPlano";
export { processItemizadoJob } from "./processItemizadoJob";
