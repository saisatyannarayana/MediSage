"use client";

import { useState, useRef } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { analyzeDocumentAction, translateContent } from '@/app/actions';
import type { DocumentAnalysisOutput } from '@/ai/flows';
import type { TranslationFunction } from '@/lib/translations';

type DocumentAnalyzerProps = {
  onNewQuery: (query: { type: 'document', query: string }) => void;
  language: string;
  t: TranslationFunction;
};

export default function DocumentAnalyzer({ onNewQuery, language, t }: DocumentAnalyzerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DocumentAnalysisOutput | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Limit file size to 5MB
      if (selectedFile.size > 5 * 1024 * 1024) {
          toast({
              variant: "destructive",
              title: t('ERROR_TITLE'),
              description: "File is too large. Please upload a file smaller than 5MB.",
          });
          return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setResult(null); // Clear previous results
    }
  };

  const handleAnalyze = async () => {
    if (!file || !filePreview) {
      toast({
        variant: "destructive",
        title: t('ERROR_TITLE'),
        description: t('ERROR_NO_FILE'),
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    const response = await analyzeDocumentAction(filePreview);

    if ('error' in response) {
      toast({
        variant: "destructive",
        title: t('ERROR_TITLE'),
        description: response.error,
      });
    } else {
      if (language !== 'en') {
        const translatedResponse = await translateContent(response.analysis, t('LANGUAGE_NAME'));
        if ('error' in translatedResponse) {
            toast({ variant: "destructive", title: t('ERROR_TITLE'), description: translatedResponse.error });
            setResult(response); // Show original if translation fails
        } else {
            setResult({ analysis: translatedResponse.translatedText });
        }
      } else {
        setResult(response);
      }
      onNewQuery({ type: 'document', query: file.name });
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div 
        className="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
        />
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <UploadCloud className="w-12 h-12" />
          <h3 className="text-lg font-semibold">{t('UPLOAD_PROMPT')}</h3>
          <p className="text-sm">{t('UPLOAD_BUTTON_TEXT')}</p>
        </div>
      </div>

       {filePreview && (
        <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Selected file: {file?.name}</p>
            <img src={filePreview} alt="Selected document preview" className="max-h-60 mx-auto rounded-md shadow-md" />
        </div>
      )}

      <Button onClick={handleAnalyze} disabled={isLoading || !file} className="w-full">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {t('BUTTON_ANALYZE_DOCUMENT')}
      </Button>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {result && (
        <Card className="mt-6 shadow-md">
          <CardHeader>
            <CardTitle>{t('CARD_TITLE_ANALYSIS_REPORT')}</CardTitle>
          </CardHeader>
          <CardContent className="text-base whitespace-pre-wrap">
            <p>{result.analysis}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
