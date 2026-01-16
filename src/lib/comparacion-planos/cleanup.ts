// src/lib/comparacion-planos/cleanup.ts

/**
 * Placeholder para la función que eliminará los archivos de un job en Firebase Storage.
 * @param jobId El ID del trabajo a limpiar.
 */
export async function cleanupJobFiles(jobId: string) {
    console.log(`TODO: Implementar limpieza de archivos para el job ${jobId}`);
    // Lógica para borrar /comparacion-planos/{jobId}/A.jpg y B.jpg
}

/**
 * Placeholder para la función que limpiará los resultados de un job en Firestore.
 * @param jobId El ID del trabajo a limpiar.
 */
export async function cleanupPartialResults(jobId: string) {
    console.log(`TODO: Implementar limpieza de resultados parciales para el job ${jobId}`);
    // Lógica para setear el campo 'results' a null o un objeto vacío.
}
