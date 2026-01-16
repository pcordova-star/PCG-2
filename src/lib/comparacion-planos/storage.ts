// src/lib/comparacion-planos/storage.ts
// Este archivo contendrá la lógica para interactuar con Firebase Storage
// para el módulo de Comparación de Planos.

/*
Estructura de carpetas recomendada en Firebase Storage:

/comparacion-planos/{jobId}/A.jpg
/comparacion-planos/{jobId}/B.jpg
/comparacion-planos/{jobId}/aux/{...otros archivos}

*/

export async function uploadPlanoA(jobId: string, file: File | Blob) {
  // TODO: implementar subida de archivo A
  console.log(`Subiendo Plano A para el job ${jobId}`);
  return null;
}

export async function uploadPlanoB(jobId: string, file: File | Blob) {
  // TODO: implementar subida de archivo B
  console.log(`Subiendo Plano B para el job ${jobId}`);
  return null;
}

export async function getPlanoAUrl(jobId: string) {
  // TODO: obtener URL del archivo A
  console.log(`Obteniendo URL del Plano A para el job ${jobId}`);
  return null;
}

export async function getPlanoBUrl(jobId: string) {
  // TODO: obtener URL del archivo B
  console.log(`Obteniendo URL del Plano B para el job ${jobId}`);
  return null;
}
