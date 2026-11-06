'use client';

import { Sidebar } from '@/components/chat/sidebar';
import { FullScreenLoader } from '@/components/ui/basics';
import { useRequireAuth } from '@/lib/auth';
import { ChatStoreProvider } from '@/lib/chat-store';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireAuth();
  if (!ready) return <FullScreenLoader />;
  return (
    <ChatStoreProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ChatStoreProvider>
  );
}
