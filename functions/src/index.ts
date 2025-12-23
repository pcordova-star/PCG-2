// src/functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";

// Define la región para todas las funciones v2 exportadas desde este archivo.
setGlobalOptions({ region: "southamerica-west1" });

// Exporta ÚNICAMENTE la función requerida para aislar el despliegue.
export { createCompanyUser } from "./createCompanyUser";
