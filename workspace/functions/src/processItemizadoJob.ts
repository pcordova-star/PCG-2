// TEMP: Disabled for deploy. Genkit prompt types caused TS2589 in build.
// We keep a callable function so imports/exports remain stable.

export async function processItemizadoJob() {
  throw new Error("processItemizadoJob temporalmente deshabilitado para deploy.");
}
