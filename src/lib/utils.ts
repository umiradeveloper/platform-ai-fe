import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

export const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));
export const fmtCompact = (n: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: n < 1 ? 4 : 2, maximumFractionDigits: n < 1 ? 4 : 2 }).format(n);
export const fmtIdr = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
export const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
export const fmtDay = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d));

export const PROVIDER_LABEL: Record<string, string> = {
  HERMES: 'Hermes Agent',
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Google Gemini',
  OPENAI_COMPATIBLE: 'OpenAI-compatible',
};

/** Kelompokkan percakapan sidebar berdasarkan waktu. */
export function groupByDate<T extends { updatedAt: string }>(items: T[]) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  const groups: { label: string; items: T[] }[] = [
    { label: 'Hari ini', items: [] },
    { label: 'Kemarin', items: [] },
    { label: '7 hari terakhir', items: [] },
    { label: '30 hari terakhir', items: [] },
    { label: 'Lebih lama', items: [] },
  ];
  for (const it of items) {
    const t = new Date(it.updatedAt).getTime();
    if (t >= startToday) groups[0].items.push(it);
    else if (t >= startToday - day) groups[1].items.push(it);
    else if (t >= startToday - 7 * day) groups[2].items.push(it);
    else if (t >= startToday - 30 * day) groups[3].items.push(it);
    else groups[4].items.push(it);
  }
  return groups.filter((g) => g.items.length);
}
