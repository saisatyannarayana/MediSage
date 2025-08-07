"use client";

import { useState, useMemo } from 'react';
import { AlertCircle, Pill, HeartPulse, Languages, FileScan } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import MedicationInfo from '@/components/medication-info';
import InteractionChecker from '@/components/interaction-checker';
import DocumentAnalyzer from '@/components/document-analyzer';
import HistorySidebar from '@/components/history-sidebar';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { IttLogo } from '@/components/itt-logo';
import { translations, TranslationKeys } from '@/lib/translations';

export type HistoryItem = {
  id: string;
  type: 'info' | 'interaction' | 'document';
  query: string | string[];
  timestamp: string;
};

export default function Home() {
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('medisage-history', []);
  const [activeTab, setActiveTab] = useState('info');
  const [language, setLanguage] = useState('en');

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: new Date().toISOString() + Math.random(),
      timestamp: new Date().toISOString(),
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50 queries
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setActiveTab(item.type);
  };
  
  const t = (key: TranslationKeys) => {
    return translations[key][language] || translations[key]['en'];
  };

  const availableLanguages = useMemo(() => {
    return Object.keys(translations.LANGUAGE_NAME);
  }, []);

  return (
    <SidebarProvider>
      <Sidebar>
        <HistorySidebar history={history} onSelect={handleSelectHistory} onClear={clearHistory} />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-background">
          <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b shrink-0 bg-background/80 backdrop-blur-sm md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Logo />
            </div>
            <div className="flex items-center gap-4">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-auto gap-2">
                  <Languages className="h-4 w-4" />
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {translations.LANGUAGE_NAME[lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <IttLogo />
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center p-4 md:p-8 lg:p-12">
            <div className="w-full max-w-4xl space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">
                  {t('TITLE')}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {t('SUBTITLE')}
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">
                    <Pill className="mr-2 h-4 w-4" /> {t('TAB_MED_INFO')}
                  </TabsTrigger>
                  <TabsTrigger value="interaction">
                    <HeartPulse className="mr-2 h-4 w-4" /> {t('TAB_INTERACTION_CHECK')}
                  </TabsTrigger>
                   <TabsTrigger value="document">
                    <FileScan className="mr-2 h-4 w-4" /> {t('TAB_DOCUMENT_ANALYSIS')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle>{t('CARD_TITLE_MED_INFO')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MedicationInfo onNewQuery={addToHistory} language={language} t={t} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="interaction">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle>{t('CARD_TITLE_INTERACTION_CHECK')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InteractionChecker onNewQuery={addToHistory} language={language} t={t} />
                    </CardContent>
                  </Card>
                </TabsContent>
                 <TabsContent value="document">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle>{t('CARD_TITLE_DOCUMENT_ANALYSIS')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DocumentAnalyzer onNewQuery={addToHistory} language={language} t={t} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>

          <div className="w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-12 pb-8">
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 text-destructive dark:bg-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('DISCLAIMER_TITLE')}</AlertTitle>
              <AlertDescription>
                {t('DISCLAIMER_TEXT')}
              </AlertDescription>
            </Alert>
          </div>

          <footer className="py-4 text-center text-sm text-muted-foreground border-t">
            © {new Date().getFullYear()} MediSage. {t('FOOTER_ALL_RIGHTS_RESERVED')}
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
