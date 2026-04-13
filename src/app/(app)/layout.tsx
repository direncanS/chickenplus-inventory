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
      <div className="md:pl-[18rem]">
        <Header />
        <main className="pb-24 pt-4 md:pb-8 md:pt-6">
          <div className="app-grid px-4 md:px-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
