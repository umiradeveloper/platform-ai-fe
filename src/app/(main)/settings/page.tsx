'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Menu } from 'lucide-react';
import { api, updateUser, User } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useChatStore } from '@/lib/chat-store';
import { ProviderBadge, Spinner, ThemeToggle } from '@/components/ui/basics';
import { SynologyCard } from '@/components/synology-card';
import { cn, fmtCompact, fmtNum, fmtUsd } from '@/lib/utils';

interface MyUsage {
  totals: { requests: number; inputTokens: number; outputTokens: number; cost: number };
  today: { tokens: number; limit: number | null };
  byModel: { modelId: string; displayName: string; provider: string; requests: number; inputTokens: number; outputTokens: number; cost: number }[];
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { setSidebarOpen } = useChatStore();
  const [name, setName] = useState(user?.name ?? '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [usage, setUsage] = useState<MyUsage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<MyUsage>('/usage/me?days=30').then(setUsage).catch(() => undefined);
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy('profile');
    try {
      const u = await api<User>('/me', { method: 'PATCH', json: { name } });
      updateUser(u);
      toast.success('Profil diperbarui');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy('pw');
    try {
      await api('/me/password', { method: 'POST', json: pw });
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password diubah');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const pct = usage?.today.limit ? Math.min(100, (usage.today.tokens / usage.today.limit) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 px-3 sm:px-4">
        <button className="btn-icon lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
        <Link href="/" className="btn-ghost hidden px-2 lg:inline-flex"><ArrowLeft className="h-4 w-4" /> Chat</Link>
        <h1 className="font-semibold">Profil & penggunaan</h1>
      </header>
      <div className="scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-bold">Penggunaan AI (30 hari)</h2>
            {!usage ? <Spinner /> : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div><div className="text-xs text-muted-foreground">Request</div><div className="text-xl font-extrabold tabular-nums">{fmtNum(usage.totals.requests)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Token input</div><div className="text-xl font-extrabold tabular-nums">{fmtCompact(usage.totals.inputTokens)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Token output</div><div className="text-xl font-extrabold tabular-nums">{fmtCompact(usage.totals.outputTokens)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Estimasi biaya</div><div className="text-xl font-extrabold tabular-nums">{fmtUsd(usage.totals.cost)}</div></div>
                </div>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium">Kuota token hari ini</span>
                    <span className="tabular-nums text-muted-foreground">{fmtNum(usage.today.tokens)} / {usage.today.limit ? fmtNum(usage.today.limit) : 'tanpa batas'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full transition-all', pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-accent' : 'bg-primary')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {!!usage.byModel.length && (
                  <ul className="mt-5 divide-y divide-border text-sm">
                    {usage.byModel.map((m) => (
                      <li key={m.modelId} className="flex items-center gap-2 py-2">
                        <ProviderBadge provider={m.provider} />
                        <span className="font-medium">{m.displayName}</span>
                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{fmtNum(m.requests)} req · {fmtCompact(m.inputTokens + m.outputTokens)} token</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <SynologyCard />

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-bold">Profil</h2>
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Nama</label><input className="input disabled:opacity-70" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required disabled={user?.authSource === 'SUPERAPPS'} title={user?.authSource === 'SUPERAPPS' ? 'Nama mengikuti SuperApps' : undefined} /></div>
              <div><label className="label">Email</label><input className="input opacity-70" value={user?.email ?? ''} disabled /></div>
              <div className="flex items-center gap-3 text-sm"><span className="font-medium">Tampilan:</span><ThemeToggle className="btn-outline py-1.5 text-xs" /></div>
              <div className="flex justify-end sm:col-span-1">
                {user?.authSource === 'SUPERAPPS' ? (
                  <span className="self-center text-xs text-muted-foreground">Nama mengikuti SuperApps</span>
                ) : (
                  <button className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' && <Spinner />} Simpan</button>
                )}
              </div>
            </form>
          </section>

          {user?.authSource === 'SUPERAPPS' ? (
            <section className="card p-5 text-sm">
              <h2 className="mb-2 text-sm font-bold">Akun SuperApps</h2>
              <p className="text-muted-foreground">
                Anda masuk dengan akun SuperApps{user.externalRole ? <> (role <b className="text-foreground">{user.externalRole}</b>)</> : null}. Password dan role dikelola di aplikasi SuperApps.
              </p>
            </section>
          ) : (
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-bold">Ubah password</h2>
            <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Password saat ini</label><input type="password" required className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></div>
              <div><label className="label">Password baru</label><input type="password" required minLength={8} className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" /></div>
              <div className="flex justify-end sm:col-span-2"><button className="btn-outline" disabled={busy === 'pw'}>{busy === 'pw' && <Spinner />} Ubah password</button></div>
            </form>
          </section>
          )}
        </div>
      </div>
    </div>
  );
}
