import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { getNavCounts } from '@/lib/server/nav-counts';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, navCounts] = await Promise.all([
    requireAppViewer(),
    getNavCounts(),
  ]);

  return (
    <div className="min-h-screen">
      <Sidebar counts={navCounts} />
      <div className="md:pl-[18rem]">
        <Header counts={navCounts} />
        <main className="pb-24 pt-4 md:pb-8 md:pt-6">
          <div className="app-grid px-4 md:px-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNav counts={navCounts} />
    </div>
  );
}
