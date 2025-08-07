import { Pill } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Pill className="h-6 w-6 text-primary" />
      <h1 className="text-2xl font-bold font-headline text-foreground">
        MediSage
      </h1>
    </div>
  );
}
