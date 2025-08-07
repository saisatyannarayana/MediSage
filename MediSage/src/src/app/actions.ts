"use server";

import { 
  getMedicationInfo, 
  MedicationInfoOutput,
  drugInteractionChecker, 
  DrugInteractionCheckerOutput,
  analyzeDocument,
  DocumentAnalysisOutput,
  generateSpeech,
  GenerateSpeechOutput,
  translateText,
  TranslateTextOutput
} from '@/ai/flows';

export async function fetchMedicationInfo(medicationName: string): Promise<MedicationInfoOutput | { error: string }> {
  if (!medicationName) {
    return { error: 'Medication name cannot be empty.' };
  }
  try {
    const result = await getMedicationInfo({ medicationName });
    return result;
  } catch (e) {
    console.error(e);
    return { error: 'An unexpected error occurred while fetching medication information. Please try again later.' };
  }
}

export async function checkInteractions(medications: string[]): Promise<DrugInteractionCheckerOutput | { error: string }> {
  if (!medications || medications.length < 2) {
    return { error: 'Please provide at least two medications to check for interactions.' };
  }
  try {
    const result = await drugInteractionChecker({ medications });
    return result;
  } catch (e) {
    console.error(e);
    return { error: 'An unexpected error occurred while checking for interactions. Please try again later.' };
  }
}

export async function analyzeDocumentAction(documentDataUri: string): Promise<DocumentAnalysisOutput | { error: string }> {
  if (!documentDataUri) {
    return { error: 'Document data cannot be empty.' };
  }
  try {
    const result = await analyzeDocument({ documentDataUri });
    return result;
  } catch (e) {
    console.error(e);
    return { error: 'An unexpected error occurred during document analysis. Please try again later.' };
  }
}


export async function generateSpeechFromText(text: string): Promise<GenerateSpeechOutput | { error: string }> {
  if (!text) {
    return { error: 'Text to speak cannot be empty.' };
  }
  try {
    const result = await generateSpeech({ text });
    return result;
  } catch (e) {
    console.error(e);
    return { error: 'An unexpected error occurred while generating speech. Please try again later.' };
  }
}

export async function translateContent(text: string, targetLanguage: string): Promise<TranslateTextOutput | { error: string }> {
  if (!text || !targetLanguage) {
    return { error: 'Text and target language cannot be empty.' };
  }
  try {
    const result = await translateText({ text, targetLanguage });
    return result;
  } catch (e) {
    console.error(e);
    return { error: 'An unexpected error occurred during translation. Please try again later.' };
  }
}
