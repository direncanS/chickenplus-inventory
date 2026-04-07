import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { requireAppViewer } from '@/lib/supabase/app-viewer';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAppViewer();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-56">
        <Header />
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
