import { ApiError, api, authFetch } from './api';

/** File yang dibuat Hermes Agent dan bisa diunduh pengguna. */
export interface GeneratedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

async function blobOf(id: string, inline = false) {
  const r = await authFetch(`/files/${id}${inline ? '?inline=1' : ''}`);
  if (!r.ok) {
    let msg = `Kesalahan ${r.status}`;
    try {
      msg = (await r.json()).message ?? msg;
    } catch {
      /* bukan JSON */
    }
    throw new ApiError(msg, r.status);
  }
  return r.blob();
}

export const files = {
  /** Unduh lewat fetch berotorisasi (token ada di memori, jadi tidak bisa memakai <a href> biasa). */
  async download(f: GeneratedFile) {
    const url = URL.createObjectURL(await blobOf(f.id));
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
  /** URL objek untuk pratinjau gambar (panggil URL.revokeObjectURL setelah selesai). */
  async previewUrl(f: GeneratedFile) {
    return URL.createObjectURL(await blobOf(f.id, true));
  },
  saveToSynology: (id: string, folder: string) => api<{ ok: true; path: string }>(`/files/${id}/save-to-synology`, { method: 'POST', json: { folder } }),
};
