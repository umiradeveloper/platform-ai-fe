import { api } from './api';

export interface KnowledgeIndex {
  id: string;
  path: string;
  name: string;
  status: 'queued' | 'indexing' | 'ready' | 'error';
  progress: number;
  fileCount: number;
  chunkCount: number;
  skippedCount: number;
  error: string | null;
  autoRefresh: boolean;
  lastIndexedAt: string | null;
  createdAt: string;
}

export interface KnowledgeState {
  enabled: boolean;
  semantic: boolean;
  embeddingModel: string | null;
  embeddingError: string | null;
  maxIndexes: number;
  maxFilesPerIndex: number;
  refreshHours: number;
  indexes: KnowledgeIndex[];
}

export interface KnowledgeHit {
  chunkId: string;
  name: string;
  path: string;
  ordinal: number;
  text: string;
  score: number;
}

export const knowledge = {
  list: () => api<KnowledgeState>('/knowledge'),
  add: (path: string) => api<KnowledgeIndex>('/knowledge', { method: 'POST', json: { path } }),
  reindex: (id: string) => api<KnowledgeIndex>(`/knowledge/${id}/reindex`, { method: 'POST' }),
  setAutoRefresh: (id: string, autoRefresh: boolean) => api<KnowledgeIndex>(`/knowledge/${id}`, { method: 'PATCH', json: { autoRefresh } }),
  remove: (id: string) => api(`/knowledge/${id}`, { method: 'DELETE' }),
  search: (q: string) => api<{ q: string; hits: KnowledgeHit[] }>(`/knowledge/search?q=${encodeURIComponent(q)}`),
};
