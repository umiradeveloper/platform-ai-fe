'use client';

import { useState } from 'react';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import type { ModelOption } from '@/lib/chat-store';
import { ProviderBadge } from '@/components/ui/basics';
import { cn } from '@/lib/utils';

export function ModelSelector({ models, value, onChange, disabled }: { models: ModelOption[]; value: string | null; onChange: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = models.find((m) => m.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || !models.length}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="max-w-[46vw] truncate sm:max-w-none">{current?.displayName ?? (models.length ? 'Pilih model' : 'Tidak ada model aktif')}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 w-[min(22rem,90vw)] animate-rise overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
            <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Model AI</div>
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={cn('flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted', m.id === value && 'bg-muted')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{m.displayName}</span>
                    <ProviderBadge provider={m.provider} />
                  </div>
                  {m.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}
                </div>
                {m.id === value && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
