'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, Menu, SquarePen } from 'lucide-react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useChatStore } from '@/lib/chat-store';
import { ChatEvent, streamChat } from '@/lib/stream';
import { MessageView, UIMessage } from './message';
import { ModelSelector } from './model-selector';
import { PromptInput } from './prompt-input';
import type { AttachmentRef } from '@/lib/synology';
import { Spinner } from '@/components/ui/basics';

const MODEL_KEY = 'umira.lastModel';

const SUGGESTIONS = [
  { title: 'Ringkas dokumen', prompt: 'Bantu saya membuat ringkasan eksekutif dari laporan progres proyek konstruksi. Apa saja poin yang perlu ada?' },
  { title: 'Draft email', prompt: 'Buatkan draft email formal ke vendor untuk meminta revisi penawaran harga material.' },
  { title: 'Analisis risiko', prompt: 'Apa saja risiko utama pada proyek pembangunan gedung dan cara mitigasinya?' },
  { title: 'Bantu coding', prompt: 'Jelaskan cara membuat REST API sederhana dengan NestJS dan Prisma.' },
];

interface ConversationDetail {
  id: string;
  title: string;
  modelId: string | null;
  messages: (UIMessage & { createdAt: string })[];
}

export function ChatView({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { models, upsert, setSidebarOpen } = useChatStore();
  const [convId, setConvId] = useState<string | undefined>(conversationId);
  const [title, setTitle] = useState<string>('');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(!!conversationId);
  const [busy, setBusy] = useState(false);
  const [modelId, setModelId] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const convRef = useRef<string | undefined>(conversationId);
  const pathname = usePathname();

  // Kembali (back/forward) ke entri riwayat yang URL-nya /c/:id tetapi pohon halamannya "/" →
  // arahkan ke route yang benar agar percakapan dimuat dari server.
  useEffect(() => {
    if (!conversationId && !convRef.current && pathname.startsWith('/c/')) {
      router.replace(pathname);
    }
  }, [conversationId, router, pathname]);

  // Di halaman "/" yang URL-nya diganti ke /c/:id saat streaming, klik "Chat baru" harus mereset state.
  useEffect(() => {
    if (!conversationId && pathname === '/' && convRef.current && !abortRef.current) {
      convRef.current = undefined;
      setConvId(undefined);
      setMessages([]);
      setTitle('');
    }
  }, [pathname, conversationId]);

  // Muat percakapan
  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    setLoading(true);
    api<ConversationDetail>(`/conversations/${conversationId}`)
      .then((c) => {
        if (!alive) return;
        setTitle(c.title);
        setMessages(
          c.messages
            .filter((m) => m.role !== 'SYSTEM')
            .map((m) => ((m as { isError?: boolean }).isError ? { ...m, error: 'Jawaban ini bermasalah dan tidak dipakai sebagai konteks. Coba generate ulang.' } : m)),
        );
        if (c.modelId) setModelId(c.modelId);
      })
      .catch((e: ApiError) => {
        toast.error(e.status === 404 ? 'Percakapan tidak ditemukan' : e.message);
        router.replace('/');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [conversationId, router]);

  // Pilih model default bila belum ada / model lama sudah nonaktif
  useEffect(() => {
    if (!models.length) return;
    if (modelId && models.some((m) => m.id === modelId)) return;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(MODEL_KEY) : null;
    setModelId((models.find((m) => m.id === saved) ?? models.find((m) => m.isDefault) ?? models[0]).id);
  }, [models, modelId]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [messages, atBottom, scrollToBottom]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  const patchLast = (fn: (m: UIMessage) => UIMessage) =>
    setMessages((prev) => {
      const copy = [...prev];
      const i = copy.length - 1;
      if (i >= 0 && copy[i].role === 'ASSISTANT') copy[i] = fn(copy[i]);
      return copy;
    });

  const handleEvent = (e: ChatEvent) => {
    switch (e.event) {
      case 'meta': {
        const id = e.data.conversationId;
        if (!convRef.current) {
          convRef.current = id;
          setConvId(id);
          upsert({ id, title: 'New Chat', modelId: e.data.model.id });
          // Ubah URL tanpa me-remount komponen agar streaming tidak terputus
          window.history.replaceState(null, '', `/c/${id}`);
        }
        setMessages((prev) => {
          const copy = [...prev];
          const lastUser = [...copy].reverse().find((m) => m.role === 'USER' && m.id.startsWith('tmp-'));
          if (lastUser) {
            lastUser.id = e.data.userMessageId;
            if (e.data.attachments?.length) lastUser.attachments = e.data.attachments;
          }
          return copy;
        });
        patchLast((m) => ({ ...m, model: e.data.model }));
        break;
      }
      case 'title':
        setTitle(e.data.title);
        upsert({ id: e.data.conversationId, title: e.data.title });
        break;
      case 'delta':
        patchLast((m) => ({ ...m, content: m.content + e.data.text }));
        break;
      case 'tool':
        patchLast((m) => {
          const list = m.toolEvents ?? [];
          const i = e.data.id ? list.findIndex((t) => t.id === e.data.id) : -1;
          if (i < 0) return { ...m, toolEvents: [...list, e.data] };
          const next = [...list];
          next[i] = { ...next[i], ...e.data, label: e.data.label ?? next[i].label, emoji: e.data.emoji ?? next[i].emoji };
          return { ...m, toolEvents: next };
        });
        break;
      case 'fallback':
        patchLast((m) => ({ ...m, model: e.data.to, notice: `${e.data.from.displayName} tidak tersedia — dialihkan ke ${e.data.to.displayName}.` }));
        break;
      case 'done':
        patchLast((m) => ({
          ...m,
          id: e.data.assistantMessageId ?? m.id,
          streaming: false,
          model: e.data.model,
          inputTokens: e.data.inputTokens,
          outputTokens: e.data.outputTokens,
          cancelled: e.data.status === 'CANCELLED',
        }));
        upsert({ id: e.data.conversationId, modelId: e.data.model.id });
        break;
      case 'error':
        patchLast((m) => ({ ...m, streaming: false, error: e.data.message }));
        break;
    }
  };

  async function run(path: string, body: unknown) {
    setBusy(true);
    setAtBottom(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const model = models.find((m) => m.id === modelId);
    setMessages((prev) => [...prev, { id: `tmp-a-${Date.now()}`, role: 'ASSISTANT', content: '', streaming: true, model: model ? { displayName: model.displayName, provider: model.provider } : null }]);
    try {
      await streamChat(path, body, handleEvent, ctrl.signal);
    } catch (err: any) {
      if (err?.name === 'AbortError') patchLast((m) => ({ ...m, cancelled: true }));
      else patchLast((m) => ({ ...m, error: err.message ?? 'Gagal menghubungi server' }));
    } finally {
      patchLast((m) => ({ ...m, streaming: false }));
      setBusy(false);
      abortRef.current = null;
    }
  }

  function send(text: string, files: AttachmentRef[] = []) {
    // modelId boleh null (daftar model belum termuat) — backend memakai model default.
    if (modelId) localStorage.setItem(MODEL_KEY, modelId);
    setMessages((prev) => [...prev, { id: `tmp-u-${Date.now()}`, role: 'USER', content: text, attachments: files }]);
    run('/chat/completions/stream', {
      conversationId: convRef.current,
      content: text,
      modelId: modelId ?? undefined,
      synologyFiles: files.length ? files.map((f) => f.path) : undefined,
    });
  }

  function regenerate() {
    if (!convRef.current || busy) return;
    setMessages((prev) => {
      const copy = [...prev];
      while (copy.length && copy[copy.length - 1].role === 'ASSISTANT') copy.pop();
      return copy;
    });
    run(`/chat/${convRef.current}/regenerate`, { modelId: modelId ?? undefined });
  }

  async function stop() {
    const id = convRef.current;
    if (id) await api(`/chat/${id}/stop`, { method: 'POST' }).catch(() => undefined);
    else abortRef.current?.abort();
    // Jika server tidak merespons stop dalam 3 detik, putuskan koneksi dari sisi klien
    setTimeout(() => abortRef.current?.abort(), 3000);
  }

  const empty = !loading && messages.length === 0;
  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf('ASSISTANT');

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header: pemilihan model */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/80 px-2 backdrop-blur sm:px-4">
        <button className="btn-icon lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
          <Menu className="h-5 w-5" />
        </button>
        <ModelSelector models={models} value={modelId} onChange={setModelId} disabled={busy} />
        <div className="ml-auto hidden min-w-0 truncate text-sm text-muted-foreground md:block">{convId ? title : ''}</div>
        <Link href="/" className="btn-icon ml-auto md:ml-2" title="Chat baru">
          <SquarePen className="h-4 w-4" />
        </Link>
      </header>

      <div ref={scroller} onScroll={onScroll} className="scroll-thin relative min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : empty ? (
          <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/umira-mark.png" alt="" className="h-14 w-14" />
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Halo{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! <span className="text-accent">Ada yang bisa dibantu?</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Tanyakan apa saja, minta dibuatkan dokumen, atau analisis teknis — Umira AI siap membantu.</p>
            <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s.title} onClick={() => send(s.prompt)} className="card group p-3.5 text-left transition hover:border-primary/40 hover:shadow-md">
                  <div className="text-sm font-semibold group-hover:text-primary">{s.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.prompt}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
            {messages.map((m, i) => (
              <MessageView key={m.id} m={m} isLast={i === lastAssistantIdx && i === messages.length - 1} onRegenerate={regenerate} busy={busy} />
            ))}
          </div>
        )}
        {!atBottom && !empty && (
          <button
            onClick={() => {
              setAtBottom(true);
              scrollToBottom(true);
            }}
            className="sticky bottom-3 left-1/2 mx-auto flex h-9 w-9 -translate-x-0 items-center justify-center rounded-full border border-border bg-card shadow-lg"
            aria-label="Gulir ke bawah"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>

      <PromptInput onSend={send} onStop={stop} busy={busy} autoFocus />
    </div>
  );
}
