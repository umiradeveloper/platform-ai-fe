import { api, ApiError } from './api';

export interface SynologyStatus {
  enabled: boolean;
  /** Universal Search (SYNO.Finder) terpasang di NAS → pencarian isi & nama file se-NAS */
  universalSearch: boolean;
  folderMaxFiles: number;
  nasHost: string | null;
  allowRemember: boolean;
  supportedExtensions: string[];
  maxFileMb: number;
  connected: boolean;
  status: 'connected' | 'expired' | 'disconnected';
  account: string | null;
  remember: boolean;
  connectedAt: string | null;
}

export interface SynoItem {
  path: string;
  name: string;
  isdir: boolean;
  size?: number;
  mtime?: number;
  supported: boolean;
  tooLarge: boolean;
}

export interface AttachmentRef {
  name: string;
  path: string;
  size?: number;
  truncated?: boolean;
  /** synology = file, folder = daftar isi folder, knowledge = potongan dari basis pengetahuan */
  source?: 'synology' | 'folder' | 'knowledge';
  /** saat memilih: file tunggal atau seluruh folder */
  kind?: 'file' | 'folder';
}

export interface FolderPreview {
  path: string;
  name: string;
  totalFiles: number;
  readableFiles: number;
  willRead: number;
  maxFiles: number;
  scanTruncated: boolean;
  files: { name: string; path: string; size?: number }[];
}

export interface ContentSearchResult {
  q: string;
  path: string;
  total: number;
  contentIndexedFolders: string[];
  files: (SynoItem & { score?: number })[];
}

export const synology = {
  status: () => api<SynologyStatus>('/synology/status'),
  connect: (body: { account: string; password: string; otp?: string; remember?: boolean }) =>
    api<SynologyStatus>('/synology/connect', { method: 'POST', json: body }),
  disconnect: () => api('/synology/connect', { method: 'DELETE' }),
  browse: (path?: string) => api<{ path: string; total: number; files: SynoItem[] }>(`/synology/browse${path && path !== '/' ? `?path=${encodeURIComponent(path)}` : ''}`),
  search: (path: string, q: string) =>
    api<{ finished: boolean; files: SynoItem[] }>(`/synology/search?path=${encodeURIComponent(path)}&q=${encodeURIComponent(q)}`),
  folderPreview: (path: string) => api<FolderPreview>(`/synology/folder-preview?path=${encodeURIComponent(path)}`),
  contentSearch: (q: string, path?: string) =>
    api<ContentSearchResult>(`/synology/content-search?q=${encodeURIComponent(q)}${path && path !== '/' ? `&path=${encodeURIComponent(path)}` : ''}`),
  saveMessage: (messageId: string, folder: string, filename: string) =>
    api<{ ok: boolean; path: string }>('/synology/save-message', { method: 'POST', json: { messageId, folder, filename } }),
};

/** Kode error dari backend (mis. otp_required, session_expired, not_connected). */
export function synoErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined;
}

export const fmtSize = (n?: number) => {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
};
