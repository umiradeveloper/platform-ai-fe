'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

export interface ConversationItem {
  id: string;
  title: string;
  modelId: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ModelOption {
  id: string;
  provider: string;
  displayName: string;
  description: string | null;
  isDefault: boolean;
  maxContextTokens: number;
}

interface Store {
  conversations: ConversationItem[];
  loading: boolean;
  models: ModelOption[];
  reload: () => Promise<void>;
  upsert: (c: Partial<ConversationItem> & { id: string }) => void;
  remove: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function ChatStoreProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await api<{ items: ConversationItem[] }>('/conversations?limit=100');
      setConversations(r.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => undefined);
    api<ModelOption[]>('/models').then(setModels).catch(() => undefined);
  }, [reload]);

  const upsert = useCallback((c: Partial<ConversationItem> & { id: string }) => {
    setConversations((prev) => {
      const now = new Date().toISOString();
      const existing = prev.find((x) => x.id === c.id);
      const merged = { title: 'New Chat', modelId: null, createdAt: now, ...existing, ...c, updatedAt: c.updatedAt ?? now } as ConversationItem;
      return [merged, ...prev.filter((x) => x.id !== c.id)];
    });
  }, []);

  const remove = useCallback((id: string) => setConversations((prev) => prev.filter((x) => x.id !== id)), []);

  return (
    <Ctx.Provider value={{ conversations, loading, models, reload, upsert, remove, sidebarOpen, setSidebarOpen }}>{children}</Ctx.Provider>
  );
}

export function useChatStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChatStore harus di dalam ChatStoreProvider');
  return c;
}
