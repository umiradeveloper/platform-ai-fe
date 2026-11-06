'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, PlugZap, XCircle } from 'lucide-react';
import { PageHeader, useData } from '@/components/admin/common';
import { ProviderBadge, Spinner, Toggle } from '@/components/ui/basics';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ProviderInfo {
  type: string; displayName: string; baseUrl: string; baseUrlSource: 'database' | 'env' | 'default';
  apiKeyMasked: string | null; apiKeySource: 'database' | 'env' | 'none';
  extraHeaders: Record<string, string>; isEnabled: boolean; envKeys: { apiKey: string; baseUrl: string };
}

const HINTS: Record<string, React.ReactNode> = {
  HERMES: (
    <>
      Aktifkan API server di Hermes: tambahkan <code>API_SERVER_ENABLED=true</code> dan <code>API_SERVER_KEY=…</code> ke <code>~/.hermes/.env</code>, lalu jalankan <code>hermes gateway</code>.
      Base URL default <code>http://localhost:8642/v1</code> (dari Docker: <code>http://host.docker.internal:8642/v1</code>). API key = nilai <code>API_SERVER_KEY</code>.
    </>
  ),
  OPENAI: <>Base URL <code>https://api.openai.com/v1</code>. Key dari platform.openai.com.</>,
  ANTHROPIC: <>Base URL <code>https://api.anthropic.com</code>. Key dari console.anthropic.com.</>,
  GEMINI: <>Base URL <code>https://generativelanguage.googleapis.com</code>. Key dari Google AI Studio.</>,
  OPENAI_COMPATIBLE: <>Untuk server kompatibel OpenAI lain: Ollama, vLLM, LiteLLM, dsb. (mis. <code>http://localhost:11434/v1</code>).</>,
};

export default function ProvidersPage() {
  const { data, loading, reload } = useData<ProviderInfo[]>('/admin/providers');
  const ordered = data ? [...data].sort((a, b) => (a.type === 'HERMES' ? -1 : b.type === 'HERMES' ? 1 : 0)) : [];
  return (
    <>
      <PageHeader title="Konfigurasi API" description="Atur endpoint & API key provider AI. Key disimpan terenkripsi (AES-256-GCM) dan tidak pernah dikirim ke browser." />
      {loading && !data ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ordered.map((p) => <ProviderCard key={p.type} p={p} onSaved={reload} />)}
        </div>
      )}
    </>
  );
}

function ProviderCard({ p, onSaved }: { p: ProviderInfo; onSaved: () => void }) {
  const [baseUrl, setBaseUrl] = useState(p.baseUrlSource === 'database' ? p.baseUrl : '');
  const [apiKey, setApiKey] = useState('');
  const [headers, setHeaders] = useState('');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);
  const hermes = p.type === 'HERMES';

  async function save(extra?: Record<string, unknown>) {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { baseUrl, ...extra };
      if (apiKey) body.apiKey = apiKey;
      if (headers.trim()) body.extraHeaders = JSON.parse(headers);
      await api(`/admin/providers/${p.type}`, { method: 'PATCH', json: body });
      toast.success(`${p.displayName} disimpan`);
      setApiKey('');
      onSaved();
    } catch (e: any) {
      toast.error(e instanceof SyntaxError ? 'Header tambahan harus JSON valid' : e.message);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      setResult(await api(`/admin/providers/${p.type}/test`, { method: 'POST' }));
    } catch (e: any) {
      setResult({ ok: false, detail: e.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className={cn('card p-5', hermes && 'border-copper-300 ring-1 ring-copper-200 dark:border-copper-700 dark:ring-copper-900 lg:col-span-2')}>
      <div className="mb-3 flex items-center gap-3">
        <ProviderBadge provider={p.type} />
        <h2 className="font-bold">{p.displayName}</h2>
        {hermes && <span className="badge bg-copper-500 text-white">Agent milik sendiri</span>}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {p.isEnabled ? 'Aktif' : 'Nonaktif'}
          <Toggle checked={p.isEnabled} onChange={(v) => save({ isEnabled: v })} disabled={busy} />
        </div>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono">{HINTS[p.type]}</p>
      <div className={cn('grid gap-3', hermes && 'md:grid-cols-2')}>
        <div>
          <label className="label">Base URL</label>
          <input className="input font-mono text-xs" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={p.baseUrl} />
          <p className="mt-1 text-[11px] text-muted-foreground">Aktif: <span className="font-mono">{p.baseUrl}</span> ({p.baseUrlSource === 'database' ? 'dashboard' : p.baseUrlSource === 'env' ? `env ${p.envKeys.baseUrl}` : 'default'})</p>
        </div>
        <div>
          <label className="label">API key</label>
          <input type="password" autoComplete="off" className="input font-mono text-xs" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={p.apiKeyMasked ? `Tersimpan: ${p.apiKeyMasked}` : 'Belum ada key'} />
          <p className="mt-1 text-[11px] text-muted-foreground">Sumber: {p.apiKeySource === 'database' ? 'dashboard (terenkripsi)' : p.apiKeySource === 'env' ? `env ${p.envKeys.apiKey}` : 'belum diatur'}. Kosongkan untuk tidak mengubah.</p>
        </div>
        {hermes && (
          <div className="md:col-span-2">
            <label className="label">Header tambahan (opsional, JSON)</label>
            <input className="input font-mono text-xs" value={headers} onChange={(e) => setHeaders(e.target.value)} placeholder='{"X-Hermes-Session-Key": "umira-web"}' />
            {Object.keys(p.extraHeaders).length > 0 && <p className="mt-1 text-[11px] text-muted-foreground">Tersimpan: {Object.keys(p.extraHeaders).join(', ')}</p>}
          </div>
        )}
      </div>
      {result && (
        <div className={cn('mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm', result.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
          {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{result.detail}</span>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-outline" onClick={test} disabled={testing}>{testing ? <Spinner /> : <PlugZap className="h-4 w-4" />} Test koneksi</button>
        <button className="btn-primary" onClick={() => save()} disabled={busy}>{busy && <Spinner />} Simpan</button>
      </div>
    </section>
  );
}
