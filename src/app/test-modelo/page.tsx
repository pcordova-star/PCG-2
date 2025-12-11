
import { ai } from '@/ai/genkit';
import { Button } from '@/components/ui/button';

export default async function TestModeloPage({
  searchParams,
}: {
  searchParams: { result?: string };
}) {

  async function testModelo() {
    'use server';
    try {
      console.log("Ejecutando testModelo Server Action...");
      const response = await ai.generate({
        model: 'gemini-1.5-flash-latest',
        prompt: "Di 'funcionando' si puedes ejecutar modelos multimodales.",
      });

      const textResult = response.text();
      console.log("Respuesta del modelo:", textResult);
      return textResult;

    } catch (error: any) {
      console.error("[testModelo Server Action] Error:", error);
      return `Error: ${error.message}`;
    }
  }

  let result = '';
  if (searchParams.result) {
    result = searchParams.result;
  }
  
  // This is a pattern to handle form submission in a server component
  // The form action calls the server action, but we need a way to get the result back.
  // A redirect with search params is one way, but let's try a simpler direct return.
  // The below structure is more complex than needed. A simple form action will suffice.

  async function formAction() {
    'use server';
    const actionResult = await testModelo();
    // We can't directly render the result here, so we redirect or re-render.
    // For simplicity, we're not using state. We'll just let the user see the console.
    // A better approach would be to use a client component wrapper.
    // But sticking to the "server component" request:
    console.log("Resultado para el usuario:", actionResult);
  }


  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Página de Prueba del Modelo de IA</h1>
      <p className="text-muted-foreground">
        Esta página contiene una Server Action para verificar si el modelo multimodal de Genkit está funcionando correctamente.
      </p>
      
      <form action={async () => {
          'use server';
          // This pattern is not ideal for displaying results without a client component,
          // but it fulfills the request of having a server-side action.
          // The result will be logged on the server console.
          await testModelo();
      }}>
        <Button type="submit">Probar modelo (Revisar consola del servidor)</Button>
      </form>

       <div className="mt-6 p-4 border rounded-lg bg-slate-50">
        <h2 className="font-semibold">Instrucciones</h2>
        <ol className="list-decimal list-inside text-sm text-muted-foreground mt-2">
            <li>Haz clic en el botón "Probar modelo".</li>
            <li>Revisa la consola de tu servidor de Next.js (el terminal donde ejecutaste `npm run dev`).</li>
            <li>Deberías ver un mensaje como `Respuesta del modelo: funcionando`.</li>
            <li>Si ves un error, significa que el modelo aún no está configurado correctamente.</li>
        </ol>
      </div>

    </div>
  );
}
