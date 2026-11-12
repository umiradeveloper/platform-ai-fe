import type { AttachmentRef } from './synology';
import { ApiError, authFetch } from './api';

export type ChatEvent =
  | { event: 'meta'; data: { conversationId: string; userMessageId: string; model: ModelRef; regenerate?: boolean; attachments?: AttachmentRef[]; knowledgeUsed?: boolean } }
  | { event: 'title'; data: { conversationId: string; title: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'tool'; data: ToolEvent }
  | { event: 'fallback'; data: { from: ModelRef; to: ModelRef; reason: string } }
  | { event: 'done'; data: DoneData }
  | { event: 'error'; data: { message: string } };

export interface ModelRef {
  id: string;
  displayName: string;
  provider: string;
}
export interface ToolEvent {
  id?: string;
  emoji?: string;
  tool: string;
  label?: string;
  status?: string;
  at: string;
}
export interface DoneData {
  conversationId: string;
  assistantMessageId: string | null;
  model: ModelRef;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  status: 'SUCCESS' | 'CANCELLED' | 'ERROR';
  latencyMs: number;
}

/** POST + baca SSE dari backend (EventSource tidak mendukung POST/Authorization). */
export async function streamChat(path: string, body: unknown, onEvent: (e: ChatEvent) => void, signal?: AbortSignal) {
  const r = await authFetch(path, { method: 'POST', body: JSON.stringify(body), signal, headers: { Accept: 'text/event-stream' } });
  if (!r.ok) {
    let msg = `Kesalahan ${r.status}`;
    let code: string | undefined;
    try {
      const j = await r.json();
      msg = Array.isArray(j.message) ? j.message.join(', ') : j.message ?? msg;
      code = typeof j.code === 'string' ? j.code : undefined;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, r.status, code);
  }
  if (!r.body) return;
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (!data.length) continue;
      try {
        onEvent({ event, data: JSON.parse(data.join('\n')) } as ChatEvent);
      } catch {
        /* abaikan blok rusak */
      }
    }
  }
}
