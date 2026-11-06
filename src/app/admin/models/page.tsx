'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Empty, PageHeader, useData } from '@/components/admin/common';
import { Modal, ProviderBadge, Spinner, Toggle } from '@/components/ui/basics';
import { api } from '@/lib/api';
import { fmtCompact, PROVIDER_LABEL } from '@/lib/utils';

interface AdminModel {
  id: string; provider: string; modelName: string; displayName: string; description: string | null;
  isActive: boolean; isDefault: boolean; maxContextTokens: number; maxOutputTokens: number;
  inputPricePer1M: string; outputPricePer1M: string; fallbackModelId: string | null; sortOrder: number;
  fallbackModel: { id: string; displayName: string } | null; _count: { messages: number };
}

const EMPTY = {
  provider: 'HERMES', modelName: 'hermes-agent', displayName: '', description: '', isActive: true, isDefault: false,
  maxContextTokens: 128000, maxOutputTokens: 4096, inputPricePer1M: 0, outputPricePer1M: 0, fallbackModelId: '', sortOrder: 0,
};

export default function ModelsPage() {
  const { data, loading, reload } = useData<AdminModel[]>('/admin/models');
  const [form, setForm] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      await api(`/admin/models/${id}`, { method: 'PATCH', json: body });
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    const { id, provider, ...rest } = form;
    const body = { ...rest, fallbackModelId: rest.fallbackModelId || null, maxContextTokens: Number(rest.maxContextTokens), maxOutputTokens: Number(rest.maxOutputTokens), inputPricePer1M: Number(rest.inputPricePer1M), outputPricePer1M: Number(rest.outputPricePer1M), sortOrder: Number(rest.sortOrder) };
    try {
      if (id) await api(`/admin/models/${id}`, { method: 'PATCH', json: body });
      else await api('/admin/models', { method: 'POST', json: { ...body, provider, fallbackModelId: body.fallbackModelId ?? undefined } });
      toast.success('Model disimpan');
      setForm(null);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function del(m: AdminModel) {
    if (!confirm(`Hapus model "${m.displayName}"?`)) return;
    try {
      const r = await api<{ deactivated: boolean; message?: string }>(`/admin/models/${m.id}`, { method: 'DELETE' });
      toast.success(r.deactivated ? r.message! : 'Model dihapus');
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => form && setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Model AI"
        description="Aktifkan, nonaktifkan, dan atur harga, batas token, serta fallback setiap model."
        actions={<button className="btn-primary" onClick={() => setForm({ ...EMPTY })}><Plus className="h-4 w-4" /> Tambah model</button>}
      />
      <div className="card overflow-x-auto">
        {loading && !data ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.length ? <Empty>Belum ada model.</Empty> : (
          <table className="table-base">
            <thead><tr><th>Model</th><th>Provider</th><th>Aktif</th><th className="text-right">Konteks / Output</th><th className="text-right">Harga /1M (in · out)</th><th>Fallback</th><th></th></tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-1.5 font-medium">
                      {m.displayName}
                      {m.isDefault && <Star className="h-3.5 w-3.5 fill-copper-400 text-copper-400" aria-label="Default" />}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{m.modelName}</div>
                  </td>
                  <td><ProviderBadge provider={m.provider} /></td>
                  <td><Toggle checked={m.isActive} onChange={(v) => patch(m.id, { isActive: v })} /></td>
                  <td className="text-right tabular-nums">{fmtCompact(m.maxContextTokens)} / {fmtCompact(m.maxOutputTokens)}</td>
                  <td className="text-right tabular-nums">${Number(m.inputPricePer1M)} · ${Number(m.outputPricePer1M)}</td>
                  <td className="text-xs">{m.fallbackModel?.displayName ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="whitespace-nowrap text-right">
                    {!m.isDefault && <button className="btn-icon" title="Jadikan default" onClick={() => patch(m.id, { isDefault: true })}><Star className="h-4 w-4" /></button>}
                    <button className="btn-icon" title="Ubah" onClick={() => setForm({ ...EMPTY, ...m, description: m.description ?? '', inputPricePer1M: Number(m.inputPricePer1M), outputPricePer1M: Number(m.outputPricePer1M), fallbackModelId: m.fallbackModelId ?? '' })}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-icon hover:text-destructive" title="Hapus" onClick={() => del(m)}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah model' : 'Tambah model'} wide>
        {form && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Provider</label>
              <select className="input" value={form.provider} onChange={set('provider')} disabled={!!form.id}>
                {Object.entries(PROVIDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nama model (API)</label>
              <input required className="input font-mono" value={form.modelName} onChange={set('modelName')} placeholder={form.provider === 'HERMES' ? 'hermes-agent' : 'gpt-4o-mini'} />
              {form.provider === 'HERMES' && <p className="mt-1 text-xs text-muted-foreground">Nama profil Hermes (default <code>hermes-agent</code>).</p>}
            </div>
            <div className="sm:col-span-2"><label className="label">Nama tampilan</label><input required className="input" value={form.displayName} onChange={set('displayName')} /></div>
            <div className="sm:col-span-2"><label className="label">Deskripsi singkat</label><input className="input" value={form.description} onChange={set('description')} /></div>
            <div><label className="label">Maks. token konteks</label><input type="number" className="input" value={form.maxContextTokens} onChange={set('maxContextTokens')} /></div>
            <div><label className="label">Maks. token output</label><input type="number" className="input" value={form.maxOutputTokens} onChange={set('maxOutputTokens')} /></div>
            <div><label className="label">Harga input (USD / 1 juta token)</label><input type="number" step="0.0001" min={0} className="input" value={form.inputPricePer1M} onChange={set('inputPricePer1M')} /></div>
            <div><label className="label">Harga output (USD / 1 juta token)</label><input type="number" step="0.0001" min={0} className="input" value={form.outputPricePer1M} onChange={set('outputPricePer1M')} /></div>
            <div>
              <label className="label">Model fallback</label>
              <select className="input" value={form.fallbackModelId} onChange={set('fallbackModelId')}>
                <option value="">Tidak ada</option>
                {data?.filter((m) => m.id !== form.id).map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Dipakai otomatis bila provider utama gagal sebelum menjawab.</p>
            </div>
            <div><label className="label">Urutan tampil</label><input type="number" className="input" value={form.sortOrder} onChange={set('sortOrder')} /></div>
            <label className="flex items-center gap-2 text-sm"><Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /> Aktif</label>
            <label className="flex items-center gap-2 text-sm"><Toggle checked={form.isDefault} onChange={(v) => setForm({ ...form, isDefault: v })} /> Model default</label>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
              <button type="button" className="btn-outline" onClick={() => setForm(null)}>Batal</button>
              <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Simpan</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
