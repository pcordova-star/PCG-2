import { genkit } from 'genkit';
import { googleAI, gemini25Flash } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini25Flash,
});

export const geminiFlashModel = gemini25Flash;
