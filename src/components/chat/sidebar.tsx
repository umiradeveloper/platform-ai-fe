'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, LayoutDashboard, LogOut, MessageSquare, MoreHorizontal, Pencil, Search, Settings, SquarePen, Trash2, X } from 'lucide-react';
import { api, logout } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useChatStore } from '@/lib/chat-store';
import { cn, groupByDate } from '@/lib/utils';
import { Logo, ThemeToggle } from '@/components/ui/basics';

export function Sidebar() {
  const { conversations, loading, upsert, remove, sidebarOpen, setSidebarOpen } = useChatStore();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<typeof conversations | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [userMenu, setUserMenu] = useState(false);

  const list = results ?? conversations;
  const groups = useMemo(() => groupByDate(list), [list]);
  const activeId = pathname.startsWith('/c/') ? pathname.split('/')[2] : null;

  async function search(value: string) {
    setQ(value);
    if (!value.trim()) return setResults(null);
    // Pencarian di server (judul + isi pesan) — CHAT-11
    try {
      const r = await api<{ items: typeof conversations }>(`/conversations?q=${encodeURIComponent(value.trim())}&limit=50`);
      setResults(r.items);
    } catch {
      /* ignore */
    }
  }

  async function rename(id: string) {
    const t = title.trim();
    setEditing(null);
    if (!t) return;
    try {
      await api(`/conversations/${id}`, { method: 'PATCH', json: { title: t } });
      upsert({ id, title: t, updatedAt: conversations.find((c) => c.id === id)?.updatedAt });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function del(id: string) {
    setMenu(null);
    if (!confirm('Hapus percakapan ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await api(`/conversations/${id}`, { method: 'DELETE' });
      remove(id);
      setResults((r) => r?.filter((x) => x.id !== id) ?? null);
      if (activeId === id) router.push('/');
      toast.success('Percakapan dihapus');
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const close = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={close} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <Link href="/" onClick={close}>
            <Logo variant="light" />
          </Link>
          <button className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-muted lg:hidden" onClick={close} aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 px-3">
          <Link
            href="/"
            onClick={close}
            className="flex w-full items-center gap-2 rounded-lg bg-copper-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-copper-400"
          >
            <SquarePen className="h-4 w-4" /> Chat baru
          </Link>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
            <input
              value={q}
              onChange={(e) => search(e.target.value)}
              placeholder="Cari riwayat chat…"
              className="w-full rounded-lg border border-white/10 bg-sidebar-muted/70 py-2 pl-8 pr-3 text-sm text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/45 focus:border-copper-400/60"
            />
          </div>
        </div>

        <nav className="sidebar-scroll mt-3 flex-1 overflow-y-auto px-2 pb-3">
          {loading && <div className="px-3 py-2 text-xs text-sidebar-foreground/60">Memuat…</div>}
          {!loading && list.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-sidebar-foreground/60">{results ? 'Tidak ditemukan.' : 'Belum ada percakapan.'}</div>
          )}
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-copper-300/80">{g.label}</div>
              {g.items.map((c) => (
                <div key={c.id} className="group relative">
                  {editing === c.id ? (
                    <div className="flex items-center gap-1 px-1 py-0.5">
                      <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') rename(c.id);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        onBlur={() => rename(c.id)}
                        className="w-full rounded-md bg-sidebar-muted px-2 py-1.5 text-sm outline-none ring-1 ring-copper-400/60"
                      />
                      <button className="rounded p-1 hover:bg-sidebar-muted" onMouseDown={() => rename(c.id)}>
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={`/c/${c.id}`}
                      onClick={close}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 pr-8 text-sm transition',
                        activeId === c.id ? 'bg-white/10 font-medium text-white' : 'text-sidebar-foreground/80 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <MessageSquare className={cn('h-3.5 w-3.5 shrink-0', activeId === c.id ? 'text-copper-300' : 'opacity-50')} />
                      <span className="truncate">{c.title}</span>
                    </Link>
                  )}
                  {editing !== c.id && (
                    <button
                      onClick={() => setMenu(menu === c.id ? null : c.id)}
                      className={cn(
                        'absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-sidebar-foreground/70 hover:bg-white/10 hover:text-white',
                        menu === c.id || activeId === c.id ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
                      )}
                      aria-label="Opsi percakapan"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                  {menu === c.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                      <div className="absolute right-1 top-9 z-20 w-40 overflow-hidden rounded-lg border border-border bg-card py-1 text-sm text-card-foreground shadow-xl">
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted"
                          onClick={() => {
                            setMenu(null);
                            setTitle(c.title);
                            setEditing(c.id);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Ubah judul
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-destructive hover:bg-muted" onClick={() => del(c.id)}>
                          <Trash2 className="h-4 w-4" /> Hapus
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Menu akun */}
        <div className="relative border-t border-white/10 p-2">
          {userMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
              <div className="absolute bottom-full left-2 right-2 z-20 mb-1 overflow-hidden rounded-lg border border-border bg-card py-1 text-sm text-card-foreground shadow-xl">
                <Link href="/settings" onClick={() => { setUserMenu(false); close(); }} className="flex items-center gap-2 px-3 py-2 hover:bg-muted">
                  <Settings className="h-4 w-4" /> Profil & penggunaan
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link href="/admin" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-muted">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard admin
                  </Link>
                )}
                <ThemeToggle className="w-full px-3 py-2 hover:bg-muted" />
                <button
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-destructive hover:bg-muted"
                  onClick={async () => {
                    await logout();
                    router.replace('/login');
                  }}
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </div>
            </>
          )}
          <button onClick={() => setUserMenu(!userMenu)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-copper-400 to-copper-600 text-sm font-bold text-white">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{user?.name}</span>
              <span className="block truncate text-xs text-sidebar-foreground/60">{user?.role === 'ADMIN' ? 'Administrator' : user?.email}</span>
            </span>
            <MoreHorizontal className="h-4 w-4 opacity-60" />
          </button>
        </div>
      </aside>
    </>
  );
}
