'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Folder, Library, Loader2, Plus, RefreshCw, Search, Sparkles, Trash2 } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';
import { knowledge, KnowledgeHit, KnowledgeIndex } from '@/lib/knowledge';
import { SynologyPicker } from '@/components/chat/synology-picker';
import { cn, fmtDate } from '@/lib/utils';

const STATUS: Record<KnowledgeIndex['status'], { label: string; cls: string }> = {
  queued: { label: 'Mengantre', cls: 'bg-muted text-muted-foreground' },
  indexing: { label: 'Mengindeks', cls: 'bg-teal-50 text-primary dark:bg-teal-900/40' },
  ready: { label: 'Siap', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  error: { label: 'Gagal', cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

/** Cuplikan dimulai dari baris pertama yang memuat kata pencarian (baris judul file dibuang). */
function snippet(text: string, query: string) {
  const lines = text.split('\n').slice(1).filter((l) => l.trim() && !/^--- (Halaman|Sheet)/.test(l));
  const terms = query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  const i = lines.findIndex((l) => terms.some((t) => l.toLowerCase().includes(t)));
  return lines.slice(Math.max(0, i)).join('\n');
}

/**
 * Kartu "Basis Pengetahuan" (RAG) di halaman Profil: pilih folder Synology untuk diindeks,
 * pantau progres, uji pencarian. Aktifkan lewat tombol "Basis pengetahuan" di kolom chat.
 */
export function KnowledgeCard() {
  const { syno, kb, refreshKb } = useChatStore();
  const [picker, setPicker] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const active = kb?.indexes.some((i) => i.status === 'queued' || i.status === 'indexing');
  const poll = useCallback(() => refreshKb(), [refreshKb]);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [active, poll]);

  if (!syno?.enabled || !kb?.enabled) return null;
  const connected = syno.connected;

  async function add(path: string) {
    setPicker(false);
    try {
      await knowledge.add(path);
      toast.success('Folder ditambahkan — pengindeksan berjalan di latar.');
      await refreshKb();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function act(id: string, fn: () => Promise<unknown>, ok?: string) {
    setBusyId(id);
    try {
      await fn();
      if (ok) toast.success(ok);
      await refreshKb();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function test(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setSearching(true);
    try {
      setHits((await knowledge.search(q.trim())).hits);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  }

  const ready = kb.indexes.filter((i) => i.chunkCount > 0);

  return (
    <section id="knowledge" className="card p-5 text-sm">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Library className="h-4 w-4 text-primary" /> Basis Pengetahuan
        </h2>
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground" title={kb.embeddingModel ?? undefined}>
          {kb.semantic ? <Sparkles className="h-3 w-3" /> : <Search className="h-3 w-3" />}
          {kb.semantic ? 'Pencarian semantik' : 'Pencarian kata kunci'}
        </span>
      </div>
      <p className="mb-4 text-muted-foreground">
        Indeks folder Synology agar Umira AI bisa menjawab dari ribuan dokumen sekaligus — misalnya “kontrak mana yang mengatur denda keterlambatan?”. Hanya Anda yang
        bisa mencari isi indeks ini, dan isinya diperbarui otomatis tiap {kb.refreshHours} jam.
      </p>

      {!connected ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">Hubungkan akun Synology di atas terlebih dahulu.</p>
      ) : (
        <>
          {kb.indexes.length > 0 && (
            <ul className="mb-3 divide-y divide-border/70 rounded-lg border border-border">
              {kb.indexes.map((i) => {
                const st = STATUS[i.status];
                const working = i.status === 'queued' || i.status === 'indexing';
                return (
                  <li key={i.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Folder className="h-4 w-4 shrink-0 fill-copper-200 text-copper-500 dark:fill-copper-900/60" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium" title={i.path}>
                          {i.name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground" title={i.path}>
                          {i.path}
                        </div>
                      </div>
                      <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', st.cls)}>
                        {working && <Loader2 className="h-3 w-3 animate-spin" />}
                        {i.status === 'ready' && <CheckCircle2 className="h-3 w-3" />}
                        {i.status === 'error' && <AlertTriangle className="h-3 w-3" />}
                        {st.label}
                        {i.status === 'indexing' && i.progress > 0 ? ` ${i.progress}%` : ''}
                      </span>
                      <button
                        className="btn-icon h-7 w-7"
                        title="Indeks ulang sekarang"
                        disabled={working || busyId === i.id}
                        onClick={() => act(i.id, () => knowledge.reindex(i.id))}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="btn-icon h-7 w-7 hover:text-red-600"
                        title="Hapus dari basis pengetahuan"
                        disabled={busyId === i.id}
                        onClick={() => confirm(`Hapus "${i.name}" dari basis pengetahuan? File di Synology tidak terhapus.`) && act(i.id, () => knowledge.remove(i.id), 'Folder dihapus dari basis pengetahuan')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6 text-[11px] text-muted-foreground">
                      <span>
                        {i.fileCount} file · {i.chunkCount} potongan
                        {i.skippedCount ? ` · ${i.skippedCount} dilewati` : ''}
                      </span>
                      {i.lastIndexedAt && <span>Diperbarui {fmtDate(i.lastIndexedAt)}</span>}
                      <label className="flex cursor-pointer items-center gap-1">
                        <input type="checkbox" className="h-3 w-3 accent-[hsl(var(--primary))]" checked={i.autoRefresh} disabled={busyId === i.id} onChange={(e) => act(i.id, () => knowledge.setAutoRefresh(i.id, e.target.checked))} />
                        Perbarui otomatis
                      </label>
                    </div>
                    {i.error && <p className={cn('mt-1 pl-6 text-[11px]', i.status === 'error' ? 'text-red-600' : 'text-amber-600')}>{i.error}</p>}
                  </li>
                );
              })}
            </ul>
          )}

          <button className="btn-outline" onClick={() => setPicker(true)} disabled={kb.indexes.length >= kb.maxIndexes}>
            <Plus className="h-4 w-4" /> Tambah folder
          </button>
          <span className="ml-3 text-[11px] text-muted-foreground">
            {kb.indexes.length}/{kb.maxIndexes} folder · maks. {kb.maxFilesPerIndex.toLocaleString('id-ID')} file per folder
          </span>

          {ready.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <form onSubmit={test} className="flex gap-2">
                <input className="input h-9 text-sm" placeholder="Uji pencarian, mis. denda keterlambatan" value={q} onChange={(e) => setQ(e.target.value)} />
                <button className="btn-outline h-9 shrink-0" disabled={searching || q.trim().length < 2}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Cari
                </button>
              </form>
              {hits && (
                <ul className="mt-3 space-y-2">
                  {hits.length === 0 && <li className="text-muted-foreground">Tidak ada potongan yang cocok.</li>}
                  {hits.map((h) => (
                    <li key={h.chunkId} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                      <div className="truncate text-xs font-semibold" title={h.path}>
                        {h.name} <span className="font-normal text-muted-foreground">· potongan {h.ordinal + 1}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{snippet(h.text, q)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                Di chat, nyalakan tombol <b>Basis pengetahuan</b> di samping tombol Synology agar Umira AI memakai folder ini saat menjawab.
              </p>
            </div>
          )}
        </>
      )}

      {picker && (
        <SynologyPicker
          mode="folder"
          title="Tambah ke basis pengetahuan"
          subtitle="Buka folder yang ingin diindeks (beserta subfoldernya), lalu klik “Indeks folder ini”"
          confirmLabel="Indeks folder ini"
          onClose={() => setPicker(false)}
          onPickFolder={add}
        />
      )}
    </section>
  );
}
