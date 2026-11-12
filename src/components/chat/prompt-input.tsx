'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, FileText, Folder, HardDrive, Library, Paperclip, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { useChatStore } from '@/lib/chat-store';
import { AttachmentRef } from '@/lib/synology';
import { cn } from '@/lib/utils';
import { SynologyPicker } from './synology-picker';

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus && window.matchMedia('(min-width: 1024px)').matches) ref.current?.focus();
  }, [autoFocus]);

  const canSend = (text.trim().length > 0 || files.length > 0) && !busy;

  const submit = () => {
    if (!canSend) return;
    const hasFolder = files.some((f) => f.kind === 'folder');
    const t = text.trim() || (hasFolder ? 'Tolong ringkas isi folder terlampir.' : files.length === 1 ? 'Tolong ringkas file terlampir.' : 'Tolong ringkas file-file terlampir.');
    onSend(t, files, { useKnowledge: kbReady && useKb });
    setText('');
    setFiles([]);
  };

  const openAttach = () => {
    if (!syno?.enabled) {
      toast.info('Lampiran dari Synology belum diaktifkan admin. Upload file langsung akan hadir di fase berikutnya.');
      return;
    }
    setPicker(true);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4 sm:pb-5">
      <div className="rounded-2xl border border-input bg-card shadow-[0_8px_30px_-12px_rgba(2,71,90,0.25)] transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {files.map((f) => (
              <span key={f.path} className="flex max-w-[260px] items-center gap-1.5 rounded-lg border border-border bg-muted/60 py-1 pl-2 pr-1 text-xs" title={f.path}>
                {f.kind === 'folder' ? <Folder className="h-3.5 w-3.5 shrink-0 text-copper-500" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />}
                <span className="truncate">{f.name}</span>
                {f.kind === 'folder' && <span className="shrink-0 text-muted-foreground">folder</span>}
                <button className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground" onClick={() => setFiles(files.filter((x) => x.path !== f.path))} aria-label={`Hapus ${f.name}`}>
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
            <button type="button" className={cn('btn-icon w-auto gap-1.5 px-2 text-xs', syno?.connected && 'text-primary')} title="Lampirkan file atau folder dari Synology" onClick={openAttach}>
              {syno?.enabled ? <HardDrive className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
              {syno?.enabled && <span className="hidden sm:inline">Synology</span>}
            </button>
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
          initialSelected={files}
          onClose={() => setPicker(false)}
          onPickFiles={(sel) => {
            setFiles(sel);
            setPicker(false);
            ref.current?.focus();
          }}
        />
      )}
    </div>
  );
}
