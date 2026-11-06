'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ArrowLeft, Bot, Coins, Gauge, KeyRound, Menu, ScrollText, Settings2, Users, X } from 'lucide-react';
import { FullScreenLoader, Logo, ThemeToggle } from '@/components/ui/basics';
import { useRequireAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Overview', icon: Gauge },
  { href: '/admin/users', label: 'Pengguna', icon: Users },
  { href: '/admin/models', label: 'Model AI', icon: Bot },
  { href: '/admin/providers', label: 'Konfigurasi API', icon: KeyRound },
  { href: '/admin/usage', label: 'Penggunaan', icon: Activity },
  { href: '/admin/costs', label: 'Biaya AI', icon: Coins },
  { href: '/admin/logs', label: 'Log aktivitas', icon: ScrollText },
  { href: '/admin/settings', label: 'Pengaturan sistem', icon: Settings2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireAuth('ADMIN');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (!ready) return <FullScreenLoader />;

  return (
    <div className="flex h-dvh overflow-hidden">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <Logo variant="light" />
          <button className="rounded p-1 lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-copper-300/80">Administrator</div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {NAV.map((n) => {
            const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition', active ? 'bg-white/10 font-semibold text-white' : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-white')}
              >
                <n.icon className={cn('h-4 w-4', active && 'text-copper-300')} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-2 text-sm">
          <ThemeToggle className="w-full rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-white/5" />
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" /> Kembali ke chat
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 lg:hidden">
          <button className="btn-icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">{NAV.find((n) => (n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)))?.label}</span>
        </header>
        <main className="scroll-thin flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
