"use client";

import { History, Pill, HeartPulse, Trash2, FileScan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
} from '@/components/ui/sidebar';
import type { HistoryItem } from '@/app/page';

type HistorySidebarProps = {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
};

export default function HistorySidebar({ history, onSelect, onClear }: HistorySidebarProps) {
    const getIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'info':
        return <Pill className="h-4 w-4 mt-1 shrink-0 text-sidebar-foreground/70" />;
      case 'interaction':
        return <HeartPulse className="h-4 w-4 mt-1 shrink-0 text-sidebar-foreground/70" />;
      case 'document':
        return <FileScan className="h-4 w-4 mt-1 shrink-0 text-sidebar-foreground/70" />;
      default:
        return null;
    }
  };
  
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <History className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Query History</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarGroup>
            {history.length === 0 ? (
              <p className="p-4 text-sm text-center text-sidebar-foreground/70">
                Your search history will appear here.
              </p>
            ) : (
              <ul className="space-y-1">
                {history.map((item) => (
                  <li key={item.id}>
                    <Button
                      variant="ghost"
                      className="w-full h-auto justify-start text-left flex items-start p-2"
                      onClick={() => onSelect(item)}
                    >
                      {getIcon(item.type)}
                      <div className="flex flex-col ml-3">
                        <span className="font-semibold break-all capitalize leading-tight">
                          {Array.isArray(item.query) ? item.query.join(', ') : item.query}
                        </span>
                        <span className="text-xs text-sidebar-foreground/60">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
      {history.length > 0 && (
        <SidebarFooter>
          <Button variant="outline" onClick={onClear} className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear History
          </Button>
        </SidebarFooter>
      )}
    </>
  );
}
