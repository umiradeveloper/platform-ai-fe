'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Loader2, Monitor, Moon, Sun, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Tanda bintang Umira + wordmark. variant "light" untuk latar gelap (sidebar). */
export function Logo({ variant = 'light', size = 'md', withText = true }: { variant?: 'light' | 'dark'; size?: 'sm' | 'md'; withText?: boolean }) {
  const s = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/umira-mark.png" alt="" className={cn(s, 'shrink-0 object-contain')} />
      {withText && (
        <span className="leading-none">
          <span className={cn('block font-extrabold tracking-tight', size === 'sm' ? 'text-[15px]' : 'text-lg', variant === 'light' ? 'text-white' : 'text-teal-700 dark:text-teal-200')}>
            umira<span className="text-copper-400"> AI</span>
          </span>
          {size === 'md' && (
            <span className={cn('mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em]', variant === 'light' ? 'text-teal-200/70' : 'text-muted-foreground')}>
              Assistant Platform
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
}

export function FullScreenLoader() {
  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/umira-mark.png" alt="" className="h-12 w-12 animate-pulse" />
        <Spinner className="text-primary" />
      </div>
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const order = ['light', 'dark', 'system'] as const;
  const next = order[(order.indexOf((theme as (typeof order)[number]) ?? 'system') + 1) % 3];
  const Icon = !mounted ? Monitor : theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = !mounted ? 'Tema' : theme === 'dark' ? 'Mode gelap' : theme === 'light' ? 'Mode terang' : 'Ikuti sistem';
  return (
    <button type="button" onClick={() => setTheme(next)} className={cn('flex items-center gap-2', className)} title={`${label} — klik untuk ganti`}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn('card max-h-[92dvh] w-full animate-rise overflow-y-auto rounded-b-none p-5 sm:rounded-xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-primary' : 'bg-input')}
    >
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function ProviderBadge({ provider }: { provider: string }) {
  const styles: Record<string, string> = {
    HERMES: 'bg-copper-100 text-copper-700 dark:bg-copper-900/50 dark:text-copper-200',
    OPENAI: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
    ANTHROPIC: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
    GEMINI: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
    OPENAI_COMPATIBLE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  };
  const label: Record<string, string> = { HERMES: 'Hermes', OPENAI: 'OpenAI', ANTHROPIC: 'Anthropic', GEMINI: 'Gemini', OPENAI_COMPATIBLE: 'Compatible' };
  return <span className={cn('badge', styles[provider] ?? styles.OPENAI_COMPATIBLE)}>{label[provider] ?? provider}</span>;
}
