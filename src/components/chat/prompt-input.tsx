'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Paperclip, Square } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PromptInput({ onSend, onStop, busy, autoFocus }: { onSend: (text: string) => void; onStop: () => void; busy: boolean; autoFocus?: boolean }) {
  const [text, setText] = useState('');
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

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText('');
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4 sm:pb-5">
      <div className="rounded-2xl border border-input bg-card shadow-[0_8px_30px_-12px_rgba(2,71,90,0.25)] transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
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
          placeholder="Tanyakan apa saja ke Umira AI…"
          className="scroll-thin block max-h-60 w-full resize-none bg-transparent px-4 pb-2 pt-3.5 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <button
            type="button"
            className="btn-icon"
            title="Lampirkan file (segera hadir)"
            onClick={() => toast.info('Upload PDF, DOCX, XLSX, CSV, TXT & gambar akan hadir di fase berikutnya.')}
          >
            <Paperclip className="h-4 w-4" />
          </button>
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
                disabled={!text.trim()}
                className={cn('flex h-9 w-9 items-center justify-center rounded-full transition', text.trim() ? 'bg-accent text-white hover:bg-copper-600' : 'bg-muted text-muted-foreground')}
                title="Kirim"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">AI dapat membuat kesalahan. Periksa kembali informasi penting.</p>
    </div>
  );
}
