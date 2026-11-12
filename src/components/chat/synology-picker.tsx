'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ChevronRight, File, FileSpreadsheet, FileText, Folder, FolderPlus, HardDrive, Loader2, Search, X } from 'lucide-react';
import { AttachmentRef, fmtSize, SynoItem, synoErrorCode, synology } from '@/lib/synology';
import { cn } from '@/lib/utils';

const MAX_FILES = 5;

function FileIcon({ item }: { item: SynoItem }) {
  if (item.isdir) return <Folder className="h-4 w-4 shrink-0 fill-copper-200 text-copper-500 dark:fill-copper-900/60" />;
  const ext = item.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'csv' || ext === 'tsv') return <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (ext === 'pdf' || ext === 'docx' || ext === 'txt' || ext === 'md') return <FileText className="h-4 w-4 shrink-0 text-primary" />;
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

/**
 * Penjelajah file Synology.
 *  - mode "files":  pilih hingga 5 file untuk dilampirkan ke chat
 *  - mode "folder": pilih folder tujuan (simpan jawaban ke NAS)
 */
export function SynologyPicker({
  mode,
  onClose,
  onPickFiles,
  onPickFolder,
  initialSelected = [],
  folderAction,
}: {
  mode: 'files' | 'folder';
  onClose: () => void;
  onPickFiles?: (files: AttachmentRef[]) => void;
  onPickFolder?: (path: string) => void;
  initialSelected?: AttachmentRef[];
  folderAction?: React.ReactNode;
}) {
  const [path, setPath] = useState('/');
  const [items, setItems] = useState<SynoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState<string | null>(null);
  const [selected, setSelected] = useState<AttachmentRef[]>(initialSelected);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    setSearching(null);
    try {
      const r = await synology.browse(p);
      setItems(r.files);
      setPath(r.path);
    } catch (e: any) {
      setError({ message: e.message, code: synoErrorCode(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('/');
  }, [load]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2 || path === '/') return;
    setLoading(true);
    setError(null);
    try {
      const r = await synology.search(path, q.trim());
      setItems(r.files);
      setSearching(q.trim());
    } catch (err: any) {
      setError({ message: err.message, code: synoErrorCode(err) });
    } finally {
      setLoading(false);
    }
  }

  const toggle = (it: SynoItem) => {
    setSelected((prev) => {
      if (prev.some((p) => p.path === it.path)) return prev.filter((p) => p.path !== it.path);
      if (prev.length >= MAX_FILES) return prev;
      return [...prev, { name: it.name, path: it.path, size: it.size }];
    });
  };

  const crumbs = path === '/' ? [] : path.split('/').filter(Boolean);
  const needsConnect = error?.code === 'not_connected' || error?.code === 'session_expired';

  // Portal ke <body>: modal tidak ikut terpengaruh transform/opacity elemen induk (mis. aksi pesan).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card flex h-[85dvh] w-full animate-rise flex-col overflow-hidden rounded-b-none sm:h-[70vh] sm:max-w-2xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-primary dark:bg-teal-900/50">
            <HardDrive className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold">{mode === 'files' ? 'Lampirkan file dari Synology' : 'Simpan ke folder Synology'}</h2>
            <p className="text-xs text-muted-foreground">{mode === 'files' ? `Pilih hingga ${MAX_FILES} file · PDF, Word, Excel, CSV, teks` : 'Buka folder tujuan, lalu klik "Simpan di sini"'}</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Breadcrumb + cari */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5 sm:flex-row sm:items-center">
          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-sm">
            <button onClick={() => load('/')} className={cn('shrink-0 rounded px-1.5 py-0.5 hover:bg-muted', path === '/' && 'font-semibold')}>
              NAS
            </button>
            {crumbs.map((c, i) => {
              const p = '/' + crumbs.slice(0, i + 1).join('/');
              return (
                <span key={p} className="flex shrink-0 items-center">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <button onClick={() => load(p)} className={cn('max-w-[160px] truncate rounded px-1.5 py-0.5 hover:bg-muted', i === crumbs.length - 1 && 'font-semibold')}>
                    {c}
                  </button>
                </span>
              );
            })}
          </nav>
          {mode === 'files' && (
            <form onSubmit={runSearch} className="relative sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={path === '/'}
                placeholder={path === '/' ? 'Buka shared folder dulu…' : 'Cari di folder ini…'}
                className="input h-8 py-1 pl-8 text-xs"
              />
            </form>
          )}
        </div>

        {/* Isi */}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {searching && (
            <div className="flex items-center justify-between bg-muted/60 px-4 py-1.5 text-xs text-muted-foreground">
              <span>
                Hasil pencarian “{searching}” di {path} ({items.length})
              </span>
              <button className="font-semibold text-primary hover:underline" onClick={() => load(path)}>
                Kembali ke folder
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <p className="max-w-sm text-muted-foreground">{error.message}</p>
              {needsConnect ? (
                <Link href="/settings#synology" className="btn-primary" onClick={onClose}>
                  {error.code === 'session_expired' ? 'Hubungkan ulang' : 'Hubungkan Synology'}
                </Link>
              ) : (
                <button className="btn-outline" onClick={() => load(path === '/' ? '/' : path)}>
                  Coba lagi
                </button>
              )}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Folder kosong.</div>
          ) : (
            <ul className="divide-y divide-border/70">
              {items
                .filter((it) => mode === 'files' || it.isdir)
                .map((it) => {
                  const checked = selected.some((s) => s.path === it.path);
                  const disabled = !it.isdir && (!it.supported || it.tooLarge || (!checked && selected.length >= MAX_FILES));
                  return (
                    <li key={it.path}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => (it.isdir ? load(it.path) : toggle(it))}
                        className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-45', checked && 'bg-teal-50 dark:bg-teal-900/30')}
                        title={!it.isdir && !it.supported ? 'Format belum didukung' : it.tooLarge ? 'File terlalu besar' : undefined}
                      >
                        {mode === 'files' && !it.isdir && (
                          <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-primary bg-primary text-white' : 'border-input')}>
                            {checked && <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
                          </span>
                        )}
                        <FileIcon item={it} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{it.name}</span>
                          {searching && <span className="block truncate text-[11px] text-muted-foreground">{it.path}</span>}
                        </span>
                        {!it.isdir && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{it.tooLarge ? 'terlalu besar' : !it.supported ? 'tidak didukung' : fmtSize(it.size)}</span>}
                        {it.isdir && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border px-4 py-3">
          {mode === 'files' ? (
            <>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {selected.length ? `${selected.length} file dipilih: ${selected.map((s) => s.name).join(', ')}` : 'Belum ada file dipilih'}
              </span>
              <button className="btn-outline" onClick={onClose}>
                Batal
              </button>
              <button className="btn-primary" disabled={!selected.length} onClick={() => onPickFiles?.(selected)}>
                Lampirkan{selected.length ? ` (${selected.length})` : ''}
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">{folderAction}</div>
              <button className="btn-outline" onClick={onClose}>
                Batal
              </button>
              <button className="btn-primary" disabled={path === '/' || !!error} onClick={() => onPickFolder?.(path)}>
                <FolderPlus className="h-4 w-4" /> Simpan di sini
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
