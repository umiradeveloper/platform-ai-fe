'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUp, FileText, Folder, FolderUp, HardDrive, Library, Loader2, Square, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useChatStore } from '@/lib/chat-store';
import { AttachmentRef } from '@/lib/synology';
import { cn } from '@/lib/utils';
import { SynologyPicker } from './synology-picker';
import { isReadable, UPLOAD_MAX_FILES, UPLOAD_MAX_MB, uploads } from '@/lib/uploads';

const KB_KEY = 'umira.useKnowledge';

export function PromptInput({
  onSend,
  onStop,
  busy,
  autoFocus,
}: {
  onSend: (text: string, files: AttachmentRef[], opts: { useKnowledge: boolean }) => void;
  onStop: () => void;
  busy: boolean;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<AttachmentRef[]>([]);
  const [picker, setPicker] = useState(false);
  const { syno, kb } = useChatStore();
  const kbReady = !!kb?.enabled && kb.indexes.some((i) => i.chunkCount > 0);
  const [useKb, setUseKb] = useState(false);
  useEffect(() => {
    try {
      setUseKb(localStorage.getItem(KB_KEY) === '1');
    } catch {
      /* abaikan */
    }
  }, []);
  const toggleKb = () => {
    const next = !useKb;
    setUseKb(next);
    try {
      localStorage.setItem(KB_KEY, next ? '1' : '0');
    } catch {
      /* abaikan */
    }
    toast.message(next ? 'Basis pengetahuan aktif' : 'Basis pengetahuan nonaktif', {
      description: next ? 'Umira AI akan mencari jawaban di folder Synology yang sudah Anda indeks.' : undefined,
    });
  };
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const [dragging, setDragging] = useState(false);

  // ---- upload dari komputer: tiap file diunggah sendiri-sendiri dengan progres
  const patch = (key: string, p: Partial<AttachmentRef>) => setFiles((prev) => prev.map((f) => (f.path === key ? { ...f, ...p } : f)));
  const addLocal = (list: { file: File; name: string }[]) => {
    const current = files.filter((f) => f.kind === 'upload').length;
    const room = UPLOAD_MAX_FILES - current;
    if (room <= 0) return toast.error(`Maksimal ${UPLOAD_MAX_FILES} file upload per pesan.`);
    if (list.length > room) toast.warning(`Hanya ${room} file pertama yang diunggah (maks. ${UPLOAD_MAX_FILES} per pesan).`);
    const picked = list.slice(0, room);
    const tooBig = picked.filter((x) => x.file.size > UPLOAD_MAX_MB * 1024 * 1024);
    if (tooBig.length) toast.error(`${tooBig.map((x) => x.file.name).join(', ')} lebih dari ${UPLOAD_MAX_MB} MB — dilewati.`);
    const ok = picked.filter((x) => x.file.size <= UPLOAD_MAX_MB * 1024 * 1024);
    const entries = ok.map((x) => ({
      key: `local:${crypto.randomUUID()}`,
      ...x,
    }));
    setFiles((prev) => [
      ...prev,
      ...entries.map((e) => ({ name: e.name, path: e.key, size: e.file.size, kind: 'upload' as const, progress: 0, readable: isReadable(e.name) })),
    ]);
    entries.forEach(async (e) => {
      try {
        const r = await uploads.upload(e.file, e.name, (pct) => patch(e.key, { progress: pct }));
        patch(e.key, { uploadId: r.id, progress: 100, readable: r.readable });
      } catch (err: any) {
        patch(e.key, { error: err.message, progress: undefined });
      }
    });
  };
  const onPickLocal = (list: FileList | null, folder: boolean) => {
    if (!list?.length) return;
    addLocal(Array.from(list).map((file) => ({ file, name: folder && file.webkitRelativePath ? file.webkitRelativePath : file.name })));
  };
  const removeFile = (f: AttachmentRef) => {
    setFiles((prev) => prev.filter((x) => x.path !== f.path));
    if (f.uploadId) uploads.remove(f.uploadId);
  };
  // seret & lepas: file maupun folder (webkitGetAsEntry)
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const items = Array.from(e.dataTransfer.items ?? []);
    const entries = items.map((i) => (i as any).webkitGetAsEntry?.()).filter(Boolean);
    if (!entries.length) return onPickLocal(e.dataTransfer.files, false);
    const out: { file: File; name: string }[] = [];
    const walk = async (entry: any, prefix: string): Promise<void> => {
      if (out.length >= UPLOAD_MAX_FILES * 3) return;
      if (entry.isFile) {
        const file: File = await new Promise((res, rej) => entry.file(res, rej));
        if (!file.name.startsWith('.')) out.push({ file, name: prefix + file.name });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        for (;;) {
          const batch: any[] = await new Promise((res, rej) => reader.readEntries(res, rej));
          if (!batch.length) break;
          for (const c of batch) await walk(c, `${prefix}${entry.name}/`);
        }
      }
    };
    for (const en of entries) await walk(en, '');
    addLocal(out);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus && window.matchMedia('(min-width: 1024px)').matches) ref.current?.focus();
  }, [autoFocus]);

  const uploading = files.some((f) => f.kind === 'upload' && !f.uploadId && !f.error);
  const canSend = (text.trim().length > 0 || files.length > 0) && !busy && !uploading;

  const submit = () => {
    if (!canSend) return;
    const ready = files.filter((f) => f.kind !== 'upload' || f.uploadId); // upload gagal tidak ikut
    const hasFolder = ready.some((f) => f.kind === 'folder' || (f.kind === 'upload' && f.name.includes('/')));
    const t = text.trim() || (hasFolder ? 'Tolong ringkas isi folder terlampir.' : ready.length === 1 ? 'Tolong ringkas file terlampir.' : 'Tolong ringkas file-file terlampir.');
    onSend(t, ready, { useKnowledge: kbReady && useKb });
    setText('');
    setFiles([]);
  };

  const openAttach = () => {
    if (!syno?.enabled) {
      toast.info('Lampiran dari Synology belum diaktifkan admin. Gunakan tombol Upload untuk file dari komputer.');
      return;
    }
    setPicker(true);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4 sm:pb-5">
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative rounded-2xl border border-input bg-card shadow-[0_8px_30px_-12px_rgba(2,71,90,0.25)] transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10',
          dragging && 'border-primary ring-4 ring-primary/15',
        )}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-2xl bg-teal-50/90 text-sm font-semibold text-primary dark:bg-teal-950/80">
            <Upload className="h-4 w-4" /> Lepaskan file atau folder untuk diunggah
          </div>
        )}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {files.map((f) => (
              <span
                key={f.path}
                className={cn(
                  'relative flex max-w-[260px] items-center gap-1.5 overflow-hidden rounded-lg border bg-muted/60 py-1 pl-2 pr-1 text-xs',
                  f.error ? 'border-destructive/50 text-destructive' : 'border-border',
                )}
                title={
                  f.error
                    ? `${f.name}: ${f.error}`
                    : f.kind === 'upload'
                      ? `${f.name}${f.uploadId && !f.readable ? ' — isi file ini tidak bisa dibaca AI (hanya dilampirkan)' : ''}`
                      : f.path
                }
              >
                {f.kind === 'upload' && !f.uploadId && !f.error && (
                  <span className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${f.progress ?? 0}%` }} />
                )}
                {f.kind === 'folder' ? (
                  <Folder className="h-3.5 w-3.5 shrink-0 text-copper-500" />
                ) : f.error ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                ) : f.kind === 'upload' && !f.uploadId ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                ) : f.kind === 'upload' ? (
                  <Upload className="h-3.5 w-3.5 shrink-0 text-copper-500" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <span className="relative truncate">{f.name}</span>
                {f.kind === 'folder' && <span className="shrink-0 text-muted-foreground">folder</span>}
                {f.kind === 'upload' && !f.uploadId && !f.error && <span className="relative shrink-0 tabular-nums text-muted-foreground">{f.progress ?? 0}%</span>}
                {f.kind === 'upload' && f.uploadId && !f.readable && <span className="relative shrink-0 text-muted-foreground">tidak dibaca AI</span>}
                <button className="relative rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground" onClick={() => removeFile(f)} aria-label={`Hapus ${f.name}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            // tempel file / screenshot langsung dari clipboard
            const pasted = Array.from(e.clipboardData.files ?? []);
            if (pasted.length) {
              e.preventDefault();
              addLocal(pasted.map((file) => ({ file, name: file.name === 'image.png' ? `tempel-${Date.now()}.png` : file.name })));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            files.length
              ? files.some((f) => f.kind === 'folder')
                ? 'Apa yang ingin dilakukan dengan folder ini?'
                : 'Apa yang ingin dilakukan dengan file ini?'
              : kbReady && useKb
                ? 'Tanya dari basis pengetahuan Anda…'
                : 'Tanyakan apa saja ke Umira AI…'
          }
          className="scroll-thin block max-h-60 w-full resize-none bg-transparent px-4 pb-2 pt-3.5 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <div className="flex items-center gap-1">
            <div className="relative">
              <button type="button" className="btn-icon w-auto gap-1.5 px-2 text-xs" title="Upload file atau folder dari komputer" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
                  <div className="absolute bottom-full left-0 z-30 mb-2 w-60 overflow-hidden rounded-xl border border-border bg-card p-1 text-sm shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setMenu(false);
                        fileInput.current?.click();
                      }}
                    >
                      <FileText className="h-4 w-4 text-primary" /> File dari komputer
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setMenu(false);
                        folderInput.current?.click();
                      }}
                    >
                      <FolderUp className="h-4 w-4 text-copper-500" /> Folder dari komputer
                    </button>
                    <p className="border-t border-border px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                      Semua jenis file, maks. {UPLOAD_MAX_MB} MB/file & {UPLOAD_MAX_FILES} file. Bisa juga seret-lepas atau tempel (Ctrl+V).
                    </p>
                  </div>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  onPickLocal(e.target.files, false);
                  e.target.value = '';
                }}
              />
              <input
                ref={folderInput}
                type="file"
                multiple
                hidden
                {...({ webkitdirectory: '', directory: '' } as any)}
                onChange={(e) => {
                  onPickLocal(e.target.files, true);
                  e.target.value = '';
                }}
              />
            </div>
            {syno?.enabled && (
              <button type="button" className={cn('btn-icon w-auto gap-1.5 px-2 text-xs', syno?.connected && 'text-primary')} title="Lampirkan file atau folder dari Synology" onClick={openAttach}>
                <HardDrive className="h-4 w-4" />
                <span className="hidden sm:inline">Synology</span>
              </button>
            )}
            {kbReady && (
              <button
                type="button"
                onClick={toggleKb}
                aria-pressed={useKb}
                title={useKb ? 'Basis pengetahuan aktif — klik untuk menonaktifkan' : 'Cari jawaban di folder Synology yang sudah diindeks'}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition',
                  useKb ? 'bg-teal-50 text-primary ring-1 ring-primary/30 dark:bg-teal-900/40' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Library className="h-4 w-4" />
                <span className="hidden sm:inline">Basis pengetahuan</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">Enter kirim · Shift+Enter baris baru</span>
            {busy ? (
              <button type="button" onClick={onStop} className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-80" title="Hentikan respons">
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                className={cn('flex h-9 w-9 items-center justify-center rounded-full transition', canSend ? 'bg-accent text-white hover:bg-copper-600' : 'bg-muted text-muted-foreground')}
                title="Kirim"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">AI dapat membuat kesalahan. Periksa kembali informasi penting.</p>
      {picker && (
        <SynologyPicker
          mode="files"
          initialSelected={files.filter((f) => f.kind !== 'upload')}
          onClose={() => setPicker(false)}
          onPickFiles={(sel) => {
            setFiles((prev) => [...prev.filter((f) => f.kind === 'upload'), ...sel]);
            setPicker(false);
            ref.current?.focus();
          }}
        />
      )}
    </div>
  );
}
