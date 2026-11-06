'use client';

import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Copy, RefreshCw, Wrench } from 'lucide-react';
import { Markdown } from './markdown';
import { ProviderBadge } from '@/components/ui/basics';
import { cn, fmtNum } from '@/lib/utils';
import type { ToolEvent } from '@/lib/stream';

export interface UIMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  model?: { displayName: string; provider: string } | null;
  toolEvents?: ToolEvent[] | null;
  inputTokens?: number;
  outputTokens?: number;
  streaming?: boolean;
  error?: string;
  notice?: string;
  cancelled?: boolean;
}

const TOOL_NAME: Record<string, string> = {
  web_search: 'Pencarian web',
  web_extract: 'Membaca halaman',
  terminal: 'Terminal',
  read_file: 'Membaca file',
  write_file: 'Menulis file',
  patch: 'Mengubah file',
  search_files: 'Mencari file',
  browser_navigate: 'Browser',
  execute_code: 'Menjalankan kode',
  vision_analyze: 'Analisis gambar',
  image_generate: 'Membuat gambar',
  memory: 'Memori agent',
  todo: 'Daftar tugas',
  delegate_task: 'Sub-agent',
};
const toolName = (t: string) => TOOL_NAME[t] ?? t.replace(/_/g, ' ');
const isRunning = (e: ToolEvent) => !e.status || /running|start|waiting|pending/i.test(e.status);

function ToolTrace({ events, live }: { events: ToolEvent[]; live?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!events.length) return null;
  const running = live ? [...events].reverse().find(isRunning) : undefined;
  const shown = running ?? events[events.length - 1];
  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-copper-200 bg-copper-50/70 text-xs dark:border-copper-800/60 dark:bg-copper-900/20">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-copper-800 dark:text-copper-200">
        {shown.emoji ? <span className={cn('text-sm leading-none', running && 'animate-pulse')}>{shown.emoji}</span> : <Wrench className={cn('h-3.5 w-3.5 shrink-0', running && 'animate-pulse')} />}
        <span className="min-w-0 flex-1 truncate">
          {running ? (
            <>
              <b className="font-semibold">{toolName(running.tool)}</b>
              {running.label && <span className="opacity-80"> — {running.label}</span>}
              <span className="opacity-70">…</span>
            </>
          ) : (
            <>Agent memakai {events.length} tool · <b className="font-semibold">{events.map((e) => toolName(e.tool)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</b></>
          )}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ol className="space-y-1 border-t border-copper-200/70 px-3 py-2 text-[11px] text-copper-900/85 dark:border-copper-800/50 dark:text-copper-100/80">
          {events.map((e, i) => (
            <li key={e.id ?? i} className="flex items-center gap-2">
              <span className="w-4 text-center">{e.emoji ?? '•'}</span>
              <span className="font-semibold">{toolName(e.tool)}</span>
              {e.label && <span className="min-w-0 truncate opacity-80">— {e.label}</span>}
              <span className={cn('ml-auto shrink-0 rounded px-1.5 py-px text-[10px] font-semibold', isRunning(e) ? 'bg-copper-200/70 text-copper-800 dark:bg-copper-800/50 dark:text-copper-100' : 'bg-success/15 text-success')}>
                {isRunning(e) ? (live ? 'berjalan' : 'terhenti') : 'selesai'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function MessageView({ m, isLast, onRegenerate, busy }: { m: UIMessage; isLast: boolean; onRegenerate: () => void; busy: boolean }) {
  const [copied, setCopied] = useState(false);

  if (m.role === 'USER') {
    return (
      <div className="flex animate-rise justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground shadow-sm sm:max-w-[75%]">
          {m.content}
        </div>
      </div>
    );
  }

  const showCursor = m.streaming && !m.error;
  return (
    <div className="group flex animate-rise gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/umira-mark.png" alt="" className={cn('mt-0.5 h-7 w-7 shrink-0', m.streaming && 'animate-[spin_6s_linear_infinite]')} />
      <div className="min-w-0 flex-1">
        {m.notice && <div className="mb-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">{m.notice}</div>}
        {!!m.toolEvents?.length && <ToolTrace events={m.toolEvents} live={m.streaming} />}
        {m.content ? (
          <div className={cn(showCursor && '[&_.prose-chat>*:last-child]:after:ml-0.5 [&_.prose-chat>*:last-child]:after:inline-block [&_.prose-chat>*:last-child]:after:h-4 [&_.prose-chat>*:last-child]:after:w-2 [&_.prose-chat>*:last-child]:after:animate-blink [&_.prose-chat>*:last-child]:after:bg-accent [&_.prose-chat>*:last-child]:after:align-middle [&_.prose-chat>*:last-child]:after:content-[\'\']')}>
            <Markdown content={m.content} />
          </div>
        ) : (
          m.streaming && (
            <div className="flex items-center gap-1.5 py-2" aria-label="AI sedang menjawab">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/80 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
              <span className="ml-2 text-xs text-muted-foreground">{m.model?.provider === 'HERMES' ? 'Hermes sedang bekerja…' : 'Sedang berpikir…'}</span>
            </div>
          )
        )}
        {m.error && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{m.error}</span>
          </div>
        )}
        {m.cancelled && <div className="mt-1 text-xs italic text-muted-foreground">Respons dihentikan.</div>}

        {!m.streaming && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
            {m.content && (
              <button
                className="btn-icon h-7 w-7"
                title="Salin jawaban"
                onClick={async () => {
                  await navigator.clipboard.writeText(m.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
            {isLast && (
              <button className="btn-icon h-7 w-7" title="Generate ulang" onClick={onRegenerate} disabled={busy}>
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            {m.model && (
              <span className="ml-1 flex items-center gap-1.5">
                <ProviderBadge provider={m.model.provider} />
                <span>{m.model.displayName}</span>
              </span>
            )}
            {!!(m.inputTokens || m.outputTokens) && (
              <span className="ml-1 tabular-nums">· {fmtNum((m.inputTokens ?? 0) + (m.outputTokens ?? 0))} token</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
