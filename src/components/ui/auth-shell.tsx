'use client';

import { ThemeToggle } from './basics';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Panel brand */}
      <aside className="umira-pattern relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/umira-mark.png" alt="" aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] opacity-[0.12]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/umira-mark.png" alt="" aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-[360px] w-[360px] rotate-12 opacity-[0.08]" />
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/umira-mark.png" alt="" className="h-11 w-11" />
          <div>
            <div className="text-2xl font-extrabold tracking-tight">umira</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-100/80">Construction · Development · Investment</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-copper-300">Umira AI Assistant</p>
          <h1 className="text-4xl font-extrabold leading-tight">Satu tempat untuk bertanya, menulis, dan menganalisis.</h1>
          <p className="mt-4 text-teal-100/80">
            Asisten AI internal yang terhubung ke Hermes Agent dan berbagai model AI — aman, tercatat, dan terkendali biayanya.
          </p>
        </div>
        <p className="relative text-xs text-teal-100/60">© {new Date().getFullYear()} PT Umira. Penggunaan internal.</p>
      </aside>

      {/* Form */}
      <main className="relative flex items-center justify-center px-5 py-10">
        <ThemeToggle className="btn-ghost absolute right-4 top-4 text-xs" />
        <div className="w-full max-w-sm animate-rise">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/umira-logo.png" alt="Umira — Construction . Development . Investment" className="mb-8 h-12 w-auto dark:brightness-[1.6] dark:saturate-[.8] lg:hidden" />
          <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
