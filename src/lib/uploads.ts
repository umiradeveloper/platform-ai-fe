import { API_BASE, ApiError, api, authFetch, getAccessToken, refreshSession } from './api';

export interface UploadResult {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  readable: boolean;
  truncated: boolean;
}

export const UPLOAD_MAX_MB = 25;
export const UPLOAD_MAX_FILES = 20;

/** Format yang isinya bisa dibaca AI (sama dengan backend/src/synology/extract.ts). */
const READABLE = new Set(
  ('pdf docx xlsx txt md csv tsv json xml log yml yaml ini toml conf env sql html htm css scss js jsx ts tsx vue py php java kt go rs rb c h cpp cs swift dart sh bat ps1').split(' '),
);
export const isReadable = (name: string) => READABLE.has((name.split('.').pop() ?? '').toLowerCase());

function send(file: File, name: string, onProgress: (pct: number) => void): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('files', file, name.split('/').pop() || file.name);
    fd.append('names', JSON.stringify([name]));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/uploads`);
    xhr.withCredentials = true;
    const token = getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* bukan JSON */
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new ApiError('Koneksi terputus saat mengunggah.', 0));
    xhr.send(fd);
  });
}

export const uploads = {
  /** Unggah satu file (XHR agar progres terlihat). `name` boleh berisi subfolder saat mengunggah folder. */
  async upload(file: File, name: string, onProgress: (pct: number) => void): Promise<UploadResult> {
    if (file.size > UPLOAD_MAX_MB * 1024 * 1024) throw new ApiError(`Lebih dari ${UPLOAD_MAX_MB} MB`, 413);
    let r = await send(file, name, onProgress);
    if (r.status === 401 && (await refreshSession())) r = await send(file, name, onProgress);
    if (r.status >= 400) {
      const m = r.body?.message;
      throw new ApiError(r.status === 413 ? `Lebih dari ${UPLOAD_MAX_MB} MB` : (Array.isArray(m) ? m.join(', ') : m) || `Upload gagal (${r.status})`, r.status);
    }
    return r.body.files[0];
  },
  /** Batalkan upload yang belum terkirim (file dihapus dari server). */
  remove: (id: string) => api(`/uploads/${id}`, { method: 'DELETE' }).catch(() => undefined),
  async download(id: string, name: string) {
    const r = await authFetch(`/uploads/${id}`);
    if (!r.ok) {
      let msg = `Kesalahan ${r.status}`;
      try {
        msg = (await r.json()).message ?? msg;
      } catch {
        /* bukan JSON */
      }
      throw new ApiError(msg, r.status);
    }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = name.split('/').pop() || name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};
