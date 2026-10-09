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
  const [viewer, navCounts] = await Promise.all([
    requireAppViewer(),
    getNavCounts(),
  ]);

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-card focus:px-4 focus:py-3 focus:text-primary focus:outline-2 focus:outline-ring">Zum Inhalt</a>
      <Sidebar counts={navCounts} isAdmin={viewer.isAdmin} />
      <div className="md:pl-[15rem]">
        <Header counts={navCounts} />
        <main id="main-content" className="pb-24 pt-6 md:pb-12 md:pt-8">
          <div className="app-grid px-4 md:px-8 lg:px-12">
            {children}
          </div>
        </main>
      </div>
      <BottomNav counts={navCounts} isAdmin={viewer.isAdmin} />
    </div>
  );
}
