'use server';
/**
 * @fileOverview Flujo de Genkit para convertir texto a voz.
 *
 * - textToSpeech: Función principal que recibe texto y devuelve un audio data URI.
 */

import { ai } from '@/genkit';
import { z } from 'zod';
import wav from 'wav';

const TextToSpeechInputSchema = z.string();
const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe("El audio generado como un data URI en formato WAV."),
});

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async (text) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'es-CL-Standard-A' },
          },
        },
      },
      prompt: text,
    });

    if (!media) {
      throw new Error('La IA no generó una respuesta de audio válida.');
    }
    
    // El audio viene en PCM, hay que convertirlo a WAV para que sea reproducible en web.
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);

export async function textToSpeech(text: string): Promise<{ audioDataUri: string }> {
  return await textToSpeechFlow(text);
}
