'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader, Section, useData } from '@/components/admin/common';
import { Spinner, Toggle } from '@/components/ui/basics';
import { api } from '@/lib/api';

interface Settings {
  appName: string; systemPrompt: string; allowRegistration: boolean; defaultDailyTokenLimit: number;
  maxMessageChars: number; maxHistoryMessages: number; autoTitle: boolean;
}

export default function SettingsPage() {
  const { data, loading, setData } = useData<Settings>('/admin/settings');
  const [f, setF] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(data), [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setBusy(true);
    try {
      const s = await api<Settings>('/admin/settings', {
        method: 'PATCH',
        json: { ...f, defaultDailyTokenLimit: Number(f.defaultDailyTokenLimit), maxMessageChars: Number(f.maxMessageChars), maxHistoryMessages: Number(f.maxHistoryMessages) },
      });
      setData(s);
      toast.success('Pengaturan disimpan');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !f) return <div className="flex justify-center py-12"><Spinner /></div>;
  return (
    <>
      <PageHeader title="Pengaturan sistem" description="Konfigurasi perilaku aplikasi untuk semua pengguna." />
      <form onSubmit={save} className="space-y-5">
        <Section title="Umum">
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="label">Nama aplikasi</label><input className="input" value={f.appName} onChange={(e) => setF({ ...f, appName: e.target.value })} /></div>
            <div className="flex items-center gap-3 pt-6 text-sm"><Toggle checked={f.allowRegistration} onChange={(v) => setF({ ...f, allowRegistration: v })} /> Izinkan registrasi mandiri</div>
            <div className="flex items-center gap-3 text-sm"><Toggle checked={f.autoTitle} onChange={(v) => setF({ ...f, autoTitle: v })} /> Judul percakapan otomatis</div>
          </div>
        </Section>
        <Section title="Perilaku AI">
          <label className="label">System prompt</label>
          <textarea rows={6} className="input font-mono text-xs leading-relaxed" value={f.systemPrompt} onChange={(e) => setF({ ...f, systemPrompt: e.target.value })} />
          <p className="mt-1 text-xs text-muted-foreground">Dikirim di awal setiap percakapan ke semua model, termasuk Hermes Agent.</p>
        </Section>
        <Section title="Batas & context management">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label">Batas token harian default / pengguna</label>
              <input type="number" min={0} className="input" value={f.defaultDailyTokenLimit} onChange={(e) => setF({ ...f, defaultDailyTokenLimit: Number(e.target.value) })} />
              <p className="mt-1 text-xs text-muted-foreground">0 = tanpa batas.</p>
            </div>
            <div><label className="label">Maks. karakter per pesan</label><input type="number" className="input" value={f.maxMessageChars} onChange={(e) => setF({ ...f, maxMessageChars: Number(e.target.value) })} /></div>
            <div>
              <label className="label">Maks. pesan riwayat dikirim</label>
              <input type="number" className="input" value={f.maxHistoryMessages} onChange={(e) => setF({ ...f, maxHistoryMessages: Number(e.target.value) })} />
              <p className="mt-1 text-xs text-muted-foreground">Dipangkas lagi sesuai batas konteks model.</p>
            </div>
          </div>
        </Section>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Simpan pengaturan</button>
        </div>
      </form>
    </>
  );
}
