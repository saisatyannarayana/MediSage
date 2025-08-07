'use server';

/**
 * @fileOverview A centralized module for all AI-powered functionalities in the application.
 *
 * This file exports functions for handling various AI tasks, including:
 * - Fetching detailed information about medications.
 * - Checking for potential drug interactions.
 * - Analyzing user-uploaded documents (e.g., prescriptions).
 * - Converting text to speech for accessibility.
 * - Translating text into different languages.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

// --- Medication Information ---

const MedicationInfoInputSchema = z.object({
  medicationName: z
    .string()
    .describe('The name of the medication to get information about.'),
});
export type MedicationInfoInput = z.infer<typeof MedicationInfoInputSchema>;

const MedicationInfoOutputSchema = z.object({
  uses: z.string().describe('The common uses of the medication.'),
  sideEffects: z
    .string()
    .describe('A summary of potential side effects.'),
  dosageGuidelines: z
    .string()
    .describe('General dosage guidelines for the medication.'),
});
export type MedicationInfoOutput = z.infer<typeof MedicationInfoOutputSchema>;

const medicationInfoPrompt = ai.definePrompt({
  name: 'medicationInfoPrompt',
  input: {schema: MedicationInfoInputSchema},
  output: {schema: MedicationInfoOutputSchema},
  prompt: `
    You are MediSage, a friendly, clear, and highly intelligent pharmaceutical voice assistant. 
    Your role is to help users understand medications through natural, conversational speech. 
    Speak like an experienced pharmacist who is warm, respectful, and easy to follow, especially for elderly or non-technical users.
    
    A user is asking about a medication. Provide a summarized, easy-to-understand overview.

    Medication Name: {{{medicationName}}}

    Include key information to prevent dangerous omissions, but keep it concise and clear.
  `,
});

const medicationInfoFlow = ai.defineFlow(
  {
    name: 'medicationInfoFlow',
    inputSchema: MedicationInfoInputSchema,
    outputSchema: MedicationInfoOutputSchema,
  },
  async (input) => {
    const {output} = await medicationInfoPrompt(input);
    return output!;
  }
);

export async function getMedicationInfo(
  input: MedicationInfoInput
): Promise<MedicationInfoOutput> {
  return medicationInfoFlow(input);
}


// --- Drug Interaction Checker ---

const DrugInteractionCheckerInputSchema = z.object({
  medications: z
    .array(z.string())
    .describe('A list of medications to check for interactions.'),
});
export type DrugInteractionCheckerInput = z.infer<
  typeof DrugInteractionCheckerInputSchema
>;

const DrugInteractionCheckerOutputSchema = z.object({
  report: z
    .string()
    .describe(
      'A report of potential drug interactions, including guidance on consulting with a healthcare professional.'
    ),
});
export type DrugInteractionCheckerOutput = z.infer<
  typeof DrugInteractionCheckerOutputSchema
>;

const drugInteractionCheckerPrompt = ai.definePrompt({
  name: 'drugInteractionCheckerPrompt',
  input: {schema: DrugInteractionCheckerInputSchema},
  output: {schema: DrugInteractionCheckerOutputSchema},
  prompt: `
    You are MediSage, a friendly, clear, and highly intelligent pharmaceutical voice assistant. 
    Your role is to help users understand medications through natural, conversational speech. 
    Speak like an experienced pharmacist who is warm, respectful, and easy to follow, especially for elderly or non-technical users.

    A user has provided a list of medications and wants to check for interactions. 
    Your task is to analyze them and provide a detailed report.
    
    Prioritize patient safety above all else. Never provide a diagnosis or prescription. 
    Always conclude your report by strongly advising the user to consult with a certified healthcare professional for any medical decisions.

    Medications: {{{medications}}}

    Begin the report with a clear, conversational summary, then provide the details.
  `,
});

const drugInteractionCheckerFlow = ai.defineFlow(
  {
    name: 'drugInteractionCheckerFlow',
    inputSchema: DrugInteractionCheckerInputSchema,
    outputSchema: DrugInteractionCheckerOutputSchema,
  },
  async (input) => {
    const {output} = await drugInteractionCheckerPrompt(input);
    return output!;
  }
);

export async function drugInteractionChecker(
  input: DrugInteractionCheckerInput
): Promise<DrugInteractionCheckerOutput> {
  return drugInteractionCheckerFlow(input);
}


// --- Document Analysis ---

const DocumentAnalysisInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "An image of a document (like a prescription), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DocumentAnalysisInput = z.infer<typeof DocumentAnalysisInputSchema>;

const DocumentAnalysisOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      'A summary and analysis of the document, identifying medications and providing suggestions.'
    ),
});
export type DocumentAnalysisOutput = z.infer<
  typeof DocumentAnalysisOutputSchema
>;

const documentAnalysisPrompt = ai.definePrompt({
  name: 'documentAnalysisPrompt',
  input: {schema: DocumentAnalysisInputSchema},
  output: {schema: DocumentAnalysisOutputSchema},
  prompt: `
    You are MediSage, a friendly, clear, and highly intelligent pharmaceutical voice assistant.
    A user has uploaded a document, likely a prescription or a list of medications.
    Your task is to analyze the document, identify any medications listed, and provide a clear, concise summary.

    - Identify each medication.
    - Briefly explain what each medication is typically used for.
    - Check for any potential interactions between the identified medications.
    - Provide a summary that is easy for a non-technical user to understand.
    - IMPORTANT: Conclude your analysis by strongly advising the user to consult with their doctor or a pharmacist for confirmation and any medical decisions. This is for informational purposes only.

    Document: {{media url=documentDataUri}}
  `,
});

const documentAnalysisFlow = ai.defineFlow(
  {
    name: 'documentAnalysisFlow',
    inputSchema: DocumentAnalysisInputSchema,
    outputSchema: DocumentAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await documentAnalysisPrompt(input);
    return output!;
  }
);

export async function analyzeDocument(
  input: DocumentAnalysisInput
): Promise<DocumentAnalysisOutput> {
  return documentAnalysisFlow(input);
}


// --- Text-to-Speech (TTS) ---

const GenerateSpeechInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
});
export type GenerateSpeechInput = z.infer<typeof GenerateSpeechInputSchema>;

const GenerateSpeechOutputSchema = z.object({
  audioDataUri: z
    .string()
    .describe('The generated audio as a data URI.'),
});
export type GenerateSpeechOutput = z.infer<typeof GenerateSpeechOutputSchema>;

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

const ttsFlow = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: GenerateSpeechInputSchema,
    outputSchema: GenerateSpeechOutputSchema,
  },
  async ({text}) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: text,
    });

    if (!media) {
      throw new Error('No audio was generated.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

export async function generateSpeech(
  input: GenerateSpeechInput
): Promise<GenerateSpeechOutput> {
  return ttsFlow(input);
}


// --- Text Translation ---

const TranslateTextInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLanguage: z
    .string()
    .describe('The target language to translate to (e.g., "Spanish").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

const translateTextPrompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `
    Translate the following text to {{targetLanguage}}. Only return the
    translated text, without any additional comments or formatting.

    Text: {{{text}}}
  `,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    const {output} = await translateTextPrompt(input);
    return output!;
  }
);

export async function translateText(
  input: TranslateTextInput
): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}
