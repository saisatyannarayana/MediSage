"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, X, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { checkInteractions, translateContent } from '@/app/actions';
import type { DrugInteractionCheckerOutput } from '@/ai/flows';
import type { TranslationFunction } from '@/lib/translations';

const formSchema = z.object({
  medicationName: z.string().min(2, "Too short").max(50, "Too long"),
});

// Declare SpeechRecognition types for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type InteractionCheckerProps = {
  onNewQuery: (query: { type: 'interaction', query: string[] }) => void;
  language: string;
  t: TranslationFunction;
};

export default function InteractionChecker({ onNewQuery, language, t }: InteractionCheckerProps) {
  const [medications, setMedications] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<DrugInteractionCheckerOutput | null>(null);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { medicationName: "" },
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
        form.handleSubmit(handleAddMedication)();
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
  }, [language, form, t, toast, handleAddMedication]);

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


  function handleAddMedication(values: z.infer<typeof formSchema>) {
    const newMed = values.medicationName.trim();
    if (newMed && !medications.map(m => m.toLowerCase()).includes(newMed.toLowerCase())) {
      setMedications([...medications, newMed]);
      form.reset();
    } else if (!newMed) {
        form.setError("medicationName", { type: "manual", message: t('ERROR_CANNOT_BE_EMPTY') });
    } else {
        form.setError("medicationName", { type: "manual", message: t('ERROR_MED_ALREADY_ADDED') });
    }
  }

  function removeMedication(index: number) {
    setMedications(medications.filter((_, i) => i !== index));
  }

  async function handleCheckInteractions() {
    if (medications.length < 2) {
      toast({
        variant: "destructive",
        title: t('ERROR_TITLE'),
        description: t('ERROR_NOT_ENOUGH_MEDS'),
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    const response = await checkInteractions(medications);

    if ('error' in response) {
      toast({
        variant: "destructive",
        title: t('ERROR_TITLE'),
        description: response.error,
      });
    } else {
       if (language !== 'en') {
        const translatedResponse = await translateContent(response.report, t('LANGUAGE_NAME'));
        if ('error' in translatedResponse) {
            toast({ variant: "destructive", title: t('ERROR_TITLE'), description: translatedResponse.error });
            setResult(response); // Show original if translation fails
        } else {
            setResult({ report: translatedResponse.translatedText });
        }
      } else {
        setResult(response);
      }
      onNewQuery({ type: 'interaction', query: medications });
    }

    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAddMedication)} className="flex items-start gap-2">
          <FormField
            control={form.control}
            name="medicationName"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">{t('FORM_LABEL_MED_NAME')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder={t('PLACEHOLDER_INTERACTION_INPUT')} {...field} />
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
                 <FormMessage className="pt-1" />
              </FormItem>
            )}
          />
          <Button type="submit" variant="outline" size="icon" aria-label={t('ARIA_LABEL_ADD_MED')}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </Form>

      <div className="space-y-4">
        <h4 className="font-semibold">{t('HEADING_MED_LIST')}</h4>
        <div className="min-h-[6rem] p-4 border-dashed border-2 rounded-lg flex flex-wrap gap-2 items-start">
          {medications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('EMPTY_STATE_MED_LIST')}</p>
          ) : (
            medications.map((med, index) => (
              <Badge key={index} variant="secondary" className="text-base py-1 pl-3 pr-2 capitalize">
                {med}
                <button onClick={() => removeMedication(index)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors">
                  <X className="h-3 w-3" />
                  <span className="sr-only">{t('SR_ONLY_REMOVE_MED')} {med}</span>
                </button>
              </Badge>
            ))
          )}
        </div>
        <Button onClick={handleCheckInteractions} disabled={isLoading || medications.length < 2} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('BUTTON_CHECK_INTERACTIONS')}
        </Button>
      </div>
      
      {isLoading && (
        <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {result && (
        <Card className="mt-6 shadow-md">
            <CardHeader>
                <CardTitle>{t('CARD_TITLE_INTERACTION_REPORT')}</CardTitle>
            </CardHeader>
            <CardContent className="text-base whitespace-pre-wrap">
                <p>{result.report}</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
