'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, ChevronRight, File, FileSearch, FileSpreadsheet, FileText, Folder, FolderPlus, HardDrive, Info, Loader2, Search, X } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';
import { AttachmentRef, fmtSize, FolderPreview, SynoItem, synoErrorCode, synology } from '@/lib/synology';
import { cn } from '@/lib/utils';

const MAX_FILES = 5;
const MAX_FOLDERS = 2;

function FileIcon({ item }: { item: SynoItem }) {
  if (item.isdir) return <Folder className="h-4 w-4 shrink-0 fill-copper-200 text-copper-500 dark:fill-copper-900/60" />;
  const ext = item.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'csv' || ext === 'tsv') return <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (ext === 'pdf' || ext === 'docx' || ext === 'txt' || ext === 'md') return <FileText className="h-4 w-4 shrink-0 text-primary" />;
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

type SearchMode = 'name' | 'content';
type PreviewState = { loading: true } | { loading: false; data?: FolderPreview; error?: string };

/**
 * Penjelajah file Synology.
 *  - mode "files":  pilih hingga 5 file dan/atau 2 folder (dibaca rekursif) untuk dilampirkan ke chat
 *  - mode "folder": pilih satu folder (simpan jawaban ke NAS, atau tambahkan ke basis pengetahuan)
 * Pencarian: "Nama file" (File Station, di folder aktif) atau "Isi & nama" (Universal Search, se-NAS).
 */
export function SynologyPicker({
  mode,
  onClose,
  onPickFiles,
  onPickFolder,
  initialSelected = [],
  folderAction,
  title,
  subtitle,
  confirmLabel,
}: {
  mode: 'files' | 'folder';
  onClose: () => void;
  onPickFiles?: (files: AttachmentRef[]) => void;
  onPickFolder?: (path: string) => void;
  initialSelected?: AttachmentRef[];
  folderAction?: React.ReactNode;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
}) {
  const { syno } = useChatStore();
  const [path, setPath] = useState('/');
  const [items, setItems] = useState<SynoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [q, setQ] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>(syno?.universalSearch ? 'content' : 'name');
  const [searching, setSearching] = useState<{ q: string; mode: SearchMode; total: number; contentIndexed: boolean } | null>(null);
  const [selected, setSelected] = useState<AttachmentRef[]>(initialSelected);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});

  const files = selected.filter((s) => s.kind !== 'folder');
  const folders = selected.filter((s) => s.kind === 'folder');

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

  // pratinjau folder terpilih: berapa file yang akan dibaca AI
  const loadPreview = useCallback(async (p: string) => {
    setPreviews((prev) => ({ ...prev, [p]: { loading: true } }));
    try {
      const data = await synology.folderPreview(p);
      setPreviews((prev) => ({ ...prev, [p]: { loading: false, data } }));
    } catch (e: any) {
      setPreviews((prev) => ({ ...prev, [p]: { loading: false, error: e.message } }));
    }
  }, []);
  useEffect(() => {
    for (const f of folders) if (!previews[f.path]) loadPreview(f.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders.length]);

  const canNameSearch = path !== '/';
  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    if (searchMode === 'name' && !canNameSearch) return;
    setLoading(true);
    setError(null);
    try {
      if (searchMode === 'content') {
        const r = await synology.contentSearch(term, path);
        setItems(r.files);
        const inScope = path === '/' ? r.contentIndexedFolders.length > 0 : r.contentIndexedFolders.some((f) => path === f || path.startsWith(`${f}/`) || f.startsWith(`${path}/`));
        setSearching({ q: term, mode: 'content', total: r.total, contentIndexed: inScope });
      } else {
        const r = await synology.search(path, term);
        setItems(r.files);
        setSearching({ q: term, mode: 'name', total: r.files.length, contentIndexed: false });
      }
    } catch (err: any) {
      if (synoErrorCode(err) === 'finder_unavailable') setSearchMode('name');
      setError({ message: err.message, code: synoErrorCode(err) });
    } finally {
      setLoading(false);
    }
  }

  const toggleFile = (it: SynoItem) =>
    setSelected((prev) => {
      if (prev.some((p) => p.path === it.path)) return prev.filter((p) => p.path !== it.path);
      if (prev.filter((p) => p.kind !== 'folder').length >= MAX_FILES) return prev;
      return [...prev, { name: it.name, path: it.path, size: it.size, kind: 'file' }];
    });

  const toggleFolder = (p: string, name: string) =>
    setSelected((prev) => {
      if (prev.some((x) => x.path === p)) return prev.filter((x) => x.path !== p);
      if (prev.filter((x) => x.kind === 'folder').length >= MAX_FOLDERS) return prev;
      return [...prev, { name, path: p, kind: 'folder' }];
    });

  const crumbs = path === '/' ? [] : path.split('/').filter(Boolean);
  const isShareRoot = crumbs.length === 0;
  const needsConnect = error?.code === 'not_connected' || error?.code === 'session_expired';
  const currentFolderSelected = folders.some((f) => f.path === path);

  const summary = [files.length ? `${files.length} file` : '', folders.length ? `${folders.length} folder` : ''].filter(Boolean).join(' + ');

  // Portal ke <body>: modal tidak ikut terpengaruh transform/opacity elemen induk (mis. aksi pesan).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card flex h-[88dvh] w-full animate-rise flex-col overflow-hidden rounded-b-none sm:h-[74vh] sm:max-w-2xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-primary dark:bg-teal-900/50">
            <HardDrive className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold">{title ?? (mode === 'files' ? 'Lampirkan dari Synology' : 'Simpan ke folder Synology')}</h2>
            <p className="text-xs text-muted-foreground">
              {subtitle ??
                (mode === 'files'
                  ? `Hingga ${MAX_FILES} file atau ${MAX_FOLDERS} folder (seluruh isinya dibaca, maks. ${syno?.folderMaxFiles ?? 25} file/folder)`
                  : 'Buka folder tujuan, lalu klik "Simpan di sini"')}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Breadcrumb + cari */}
        <div className="space-y-2 border-b border-border px-4 py-2.5">
          <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm">
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
            <form onSubmit={runSearch} className="flex gap-2">
              {syno?.universalSearch && (
                <div className="flex shrink-0 rounded-lg border border-input p-0.5 text-[11px] font-semibold">
                  {(
                    [
                      ['content', 'Isi & nama'],
                      ['name', 'Nama file'],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSearchMode(m)}
                      className={cn('rounded-md px-2 py-1 transition', searchMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative min-w-0 flex-1">
                {searchMode === 'content' ? (
                  <FileSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                )}
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  disabled={searchMode === 'name' && !canNameSearch}
                  placeholder={
                    searchMode === 'content'
                      ? path === '/'
                        ? 'Cari kata di seluruh NAS…'
                        : `Cari kata di ${crumbs[crumbs.length - 1]}…`
                      : canNameSearch
                        ? 'Cari nama file di folder ini…'
                        : 'Buka shared folder dulu…'
                  }
                  className="input h-8 py-1 pl-8 text-xs"
                />
              </div>
            </form>
          )}
        </div>

        {/* Isi */}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {searching && (
            <div className="border-b border-border/70 bg-muted/60 px-4 py-1.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {searching.mode === 'content' ? 'Universal Search' : 'Nama file'} “{searching.q}” {path === '/' ? 'di seluruh NAS' : `di ${path}`} ·{' '}
                  {searching.total > items.length ? `${items.length} dari ${searching.total}` : items.length} hasil
                </span>
                <button className="shrink-0 font-semibold text-primary hover:underline" onClick={() => load(path)}>
                  Kembali ke folder
                </button>
              </div>
              {searching.mode === 'content' && !searching.contentIndexed && (
                <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  Di lokasi ini NAS baru mengindeks nama file. Agar isi dokumen ikut dicari, admin NAS perlu mengaktifkan “Indeks konten file” di Universal Search — atau tambahkan foldernya ke Basis Pengetahuan.
                </p>
              )}
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
          ) : items.filter((it) => mode === 'files' || it.isdir).length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{searching ? 'Tidak ada hasil.' : 'Folder kosong.'}</div>
          ) : (
            <ul className="divide-y divide-border/70">
              {items
                .filter((it) => mode === 'files' || it.isdir)
                .map((it) => {
                  const checked = selected.some((s) => s.path === it.path);
                  const disabled = !it.isdir && (!it.supported || it.tooLarge || (!checked && files.length >= MAX_FILES));
                  // folder level shared-folder (root NAS) tidak bisa dilampirkan utuh — terlalu besar
                  const folderPickable = mode === 'files' && it.isdir && it.path.split('/').filter(Boolean).length >= 2;
                  return (
                    <li key={it.path} className={cn('flex items-center', checked && 'bg-teal-50 dark:bg-teal-900/30')}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => (it.isdir ? load(it.path) : toggleFile(it))}
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-45"
                        title={!it.isdir && !it.supported ? 'Format belum didukung' : it.tooLarge ? 'File terlalu besar' : undefined}
                      >
                        {mode === 'files' && !it.isdir && (
                          <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-primary bg-primary text-white' : 'border-input')}>
                            {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                        )}
                        <FileIcon item={it} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{it.name}</span>
                          {searching && <span className="block truncate text-[11px] text-muted-foreground">{it.path}</span>}
                        </span>
                        {!it.isdir && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{it.tooLarge ? 'terlalu besar' : !it.supported ? 'tidak didukung' : fmtSize(it.size)}</span>}
                        {it.isdir && !folderPickable && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      </button>
                      {folderPickable && (
                        <button
                          type="button"
                          onClick={() => toggleFolder(it.path, it.name)}
                          disabled={!checked && folders.length >= MAX_FOLDERS}
                          className={cn(
                            'mr-3 flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40',
                            checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-muted-foreground hover:border-primary hover:text-primary',
                          )}
                          title="Lampirkan seluruh isi folder ini"
                        >
                          {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : <FolderPlus className="h-3 w-3" />}
                          {checked ? 'Folder dipilih' : 'Pilih folder'}
                        </button>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        {/* Ringkasan folder terpilih */}
        {mode === 'files' && folders.length > 0 && (
          <div className="space-y-1 border-t border-border bg-muted/40 px-4 py-2 text-xs">
            {folders.map((f) => {
              const pv = previews[f.path];
              return (
                <div key={f.path} className="flex items-center gap-2">
                  <Folder className="h-3.5 w-3.5 shrink-0 text-copper-500" />
                  <span className="min-w-0 flex-1 truncate" title={f.path}>
                    <b>{f.name}</b>{' '}
                    <span className="text-muted-foreground">
                      {!pv || pv.loading
                        ? '· menelusuri subfolder…'
                        : pv.error
                          ? `· ${pv.error}`
                          : `· ${pv.data!.willRead} dari ${pv.data!.totalFiles}${pv.data!.scanTruncated ? '+' : ''} file akan dibaca AI${pv.data!.readableFiles > pv.data!.willRead ? ' (terbaru diutamakan)' : ''}`}
                    </span>
                  </span>
                  {pv?.loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  <button className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground" onClick={() => toggleFolder(f.path, f.name)} aria-label={`Batal pilih ${f.name}`}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          {mode === 'files' ? (
            <>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {summary ? `${summary} dipilih` : !isShareRoot && !searching ? 'Pilih file, atau lampirkan folder ini →' : 'Belum ada yang dipilih'}
              </span>
              {!isShareRoot && !searching && crumbs.length >= 2 && !currentFolderSelected && (
                <button className="btn-outline hidden sm:inline-flex" disabled={folders.length >= MAX_FOLDERS} onClick={() => toggleFolder(path, crumbs[crumbs.length - 1])}>
                  <FolderPlus className="h-4 w-4" /> Folder ini
                </button>
              )}
              <button className="btn-outline" onClick={onClose}>
                Batal
              </button>
              <button className="btn-primary" disabled={!selected.length || folders.some((f) => previews[f.path]?.loading)} onClick={() => onPickFiles?.(selected)}>
                Lampirkan{summary ? ` (${summary})` : ''}
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">{folderAction}</div>
              <button className="btn-outline" onClick={onClose}>
                Batal
              </button>
              <button className="btn-primary" disabled={path === '/' || !!error} onClick={() => onPickFolder?.(path)}>
                <FolderPlus className="h-4 w-4" /> {confirmLabel ?? 'Simpan di sini'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
