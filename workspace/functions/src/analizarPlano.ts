// workspace/functions/src/analizarPlano.ts
// Esta función ahora es obsoleta, su lógica se ha movido a /src/app/api/analizar-plano/route.ts
// Se puede eliminar de index.ts y de este archivo.
import * as functions from "firebase-functions";

export const analizarPlano = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    throw new functions.https.HttpsError(
      "unimplemented", 
      "Esta función ha sido movida a una API Route de Next.js."
    );
  });
