// src/server/genkit.ts
import { genkit as genkitCore } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

// This is a server-only module and must not be imported into any client-side code.

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn(
      `[Genkit] The GEMINI_API_KEY environment variable is not set. AI features may fail. ` +
      `This is expected during the build process, but should be set in your production environment.`
    );
}

// NOTE: The API key is now explicitly passed from environment variables.
// This is necessary for server environments like Vercel API routes that
// do not inherit Firebase Functions secrets.
export const ai = genkitCore({
  plugins: [
    googleAI({ apiKey })
  ]
});
