import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ServiceUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verbindung vorübergehend nicht verfügbar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Die Verbindung zum Server ist derzeit nicht möglich. Bitte versuchen Sie es in einer Minute erneut. Wenn das Problem bestehen bleibt, wenden Sie sich an einen Administrator.</p>
          <Link className="font-semibold text-primary underline" href="/login" prefetch={false}>
            Erneut versuchen
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
