"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Volume2, StopCircle, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { fetchMedicationInfo, generateSpeechFromText, translateContent } from '@/app/actions';
import type { MedicationInfoOutput } from '@/ai/flows';
import type { TranslationFunction } from '@/lib/translations';

const formSchema = z.object({
  medicationName: z.string().min(2, {
    message: "Medication name must be at least 2 characters.",
  }),
});

// Declare SpeechRecognition types for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type MedicationInfoProps = {
    onNewQuery: (query: { type: 'info', query: string }) => void;
    language: string;
    t: TranslationFunction;
};

export default function MedicationInfo({ onNewQuery, language, t }: MedicationInfoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<MedicationInfoOutput | null>(null);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicationName: "",
    },
  });
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = language; 
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        form.setValue('medicationName', transcript);
        stopListening();
        // Automatically submit the form after successful voice input
        form.handleSubmit(onSubmit)();
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        toast({
            variant: "destructive",
            title: t('ERROR_TITLE'),
            description: `Speech recognition error: ${event.error}`,
        });
        stopListening();
      };

      recognitionRef.current.onend = () => {
        stopListening();
      };
    }
  }, [language, form, t, toast, onSubmit]);
  
  useEffect(() => {
    if (recognitionRef.current) {
        recognitionRef.current.lang = language;
    }
  }, [language]);


  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Could not start speech recognition:", error);
        toast({
            variant: "destructive",
            title: t('ERROR_TITLE'),
            description: "Could not start microphone. Please check permissions.",
        });
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  const generateAudio = async (text: string) => {
    const response = await generateSpeechFromText(text);
    if ('error' in response) {
      toast({
        variant: "destructive",
        title: t('ERROR_SPEECH_TITLE'),
        description: response.error,
      });
      setAudioDataUri(null);
    } else {
      setAudioDataUri(response.audioDataUri);
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    setAudioDataUri(null);
    stopSpeaking();

    const response = await fetchMedicationInfo(values.medicationName);

    if ('error' in response) {
      toast({
        variant: "destructive",
        title: t('ERROR_TITLE'),
        description: response.error,
      });
      setIsLoading(false);
      return;
    }
    
    let processedResult = response;

    if (language !== 'en') {
      const [uses, sideEffects, dosageGuidelines] = await Promise.all([
          translateContent(response.uses, t('LANGUAGE_NAME')),
          translateContent(response.sideEffects, t('LANGUAGE_NAME')),
          translateContent(response.dosageGuidelines, t('LANGUAGE_NAME')),
      ]);

      if ('error' in uses || 'error' in sideEffects || 'error' in dosageGuidelines) {
          toast({ variant: "destructive", title: t('ERROR_TITLE'), description: "Failed to translate content." });
          // Fallback to original response
      } else {
          processedResult = {
              uses: uses.translatedText,
              sideEffects: sideEffects.translatedText,
              dosageGuidelines: dosageGuidelines.translatedText,
          };
      }
    } 
    
    setResult(processedResult);
    onNewQuery({ type: 'info', query: values.medicationName });
    setIsLoading(false);
    
    const textToSpeak = `
      ${t('TTS_INFO_FOR')} ${values.medicationName}.
      ${t('ACCORDION_TITLE_USES')}: ${processedResult.uses}.
      ${t('ACCORDION_TITLE_SIDE_EFFECTS')}: ${processedResult.sideEffects}.
      ${t('ACCORDION_TITLE_DOSAGE')}: ${processedResult.dosageGuidelines}.
    `;
    generateAudio(textToSpeak);
  }

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  async function handleReadAloud() {
    if (isSpeaking) {
        stopSpeaking();
        return;
    }

    if (!audioDataUri) {
        toast({
            variant: "destructive",
            title: t('ERROR_SPEECH_TITLE'),
            description: "Audio is still being prepared. Please try again in a moment.",
        });
        return;
    }
    
    setIsSpeaking(true);
    const audio = new Audio(audioDataUri);
    audioRef.current = audio;
    audio.play();
    audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
    };
    audio.onerror = () => {
        setIsSpeaking(false);
        toast({
            variant: "destructive",
            title: t('ERROR_SPEECH_TITLE'),
            description: "Could not play the audio.",
        });
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="medicationName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('FORM_LABEL_MED_NAME')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder={t('PLACEHOLDER_MED_INFO_INPUT')} {...field} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={handleMicClick}
                      aria-label={isListening ? 'Stop listening' : 'Start listening'}
                    >
                      {isListening ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('BUTTON_GET_INFO')}
          </Button>
        </form>
      </Form>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {result && (
        <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline capitalize">
                    {form.getValues("medicationName")}
                </h3>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleReadAloud}
                    disabled={!audioDataUri && !isSpeaking}
                    aria-label={isSpeaking ? t('ARIA_LABEL_STOP_READING') : t('ARIA_LABEL_READ_ALOUD')}
                >
                    {isSpeaking ? <StopCircle className="h-5 w-5" /> : (audioDataUri ? <Volume2 className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />) }
                </Button>
            </div>
            <Accordion type="single" collapsible defaultValue="uses" className="w-full">
                <AccordionItem value="uses">
                    <AccordionTrigger className="text-lg font-semibold">{t('ACCORDION_TITLE_USES')}</AccordionTrigger>
                    <AccordionContent className="text-base whitespace-pre-wrap">
                        {result.uses}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="side-effects">
                    <AccordionTrigger className="text-lg font-semibold">{t('ACCORDION_TITLE_SIDE_EFFECTS')}</AccordionTrigger>
                    <AccordionContent className="text-base whitespace-pre-wrap">
                        {result.sideEffects}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="dosage">
                    <AccordionTrigger className="text-lg font-semibold">{t('ACCORDION_TITLE_DOSAGE')}</AccordionTrigger>
                    <AccordionContent className="text-base whitespace-pre-wrap">
                        {result.dosageGuidelines}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
      )}
    </div>
  );
}
