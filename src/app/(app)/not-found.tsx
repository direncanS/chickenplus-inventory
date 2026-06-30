import { de } from '@/i18n/de';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{de.errors.pageNotFound}</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {de.errors.pageNotFoundDescription}
      </p>
      <Link href="/dashboard">
        <Button variant="outline">
          {de.errors.backToDashboard}
        </Button>
      </Link>
    </div>
  );
}
