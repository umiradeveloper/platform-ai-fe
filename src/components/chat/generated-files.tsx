'use client';

import { useEffect, useState } from 'react';
import { Download, File, FileArchive, FileAudio, FileCode2, FileImage, FileSpreadsheet, FileText, FileVideo, HardDriveUpload, Loader2, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { useChatStore } from '@/lib/chat-store';
import { files as filesApi, GeneratedFile } from '@/lib/files';
import { fmtSize, synoErrorCode } from '@/lib/synology';
import { cn } from '@/lib/utils';
import { SynologyPicker } from './synology-picker';

function iconFor(f: GeneratedFile) {
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  if (f.mimeType.startsWith('image/')) return { Icon: FileImage, cls: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/40' };
  if (f.mimeType.startsWith('audio/')) return { Icon: FileAudio, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' };
  if (f.mimeType.startsWith('video/')) return { Icon: FileVideo, cls: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' };
  if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext)) return { Icon: FileSpreadsheet, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' };
  if (['pptx', 'ppt'].includes(ext)) return { Icon: Presentation, cls: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40' };
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) return { Icon: FileArchive, cls: 'text-stone-600 bg-stone-100 dark:bg-stone-900' };
  if (['py', 'js', 'ts', 'tsx', 'json', 'sql', 'sh', 'html', 'css', 'yaml', 'yml', 'xml'].includes(ext))
    return { Icon: FileCode2, cls: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40' };
  if (['pdf', 'docx', 'doc', 'md', 'txt'].includes(ext)) return { Icon: FileText, cls: 'text-primary bg-teal-50 dark:bg-teal-900/40' };
  return { Icon: File, cls: 'text-muted-foreground bg-muted' };
}

const typeLabel = (f: GeneratedFile) => f.name.split('.').pop()?.toUpperCase() ?? 'FILE';

/** Pratinjau gambar (diambil dengan token, lalu ditampilkan sebagai object URL). */
function ImagePreview({ f }: { f: GeneratedFile }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    filesApi
      .previewUrl(f)
      .then((u) => {
        url = u;
        if (alive) setSrc(u);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [f]);
  if (failed) return null;
  return (
    <button type="button" onClick={() => filesApi.download(f)} className="block overflow-hidden rounded-lg border border-border bg-muted" title={`Unduh ${f.name}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={f.name} className="max-h-72 w-auto max-w-full object-contain" />
      ) : (
        <div className="flex h-40 w-56 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </button>
  );
}

/** Kartu file hasil Hermes di bawah jawaban: unduh, pratinjau gambar, simpan ke Synology. */
export function GeneratedFiles({ items }: { items: GeneratedFile[] }) {
  const { syno } = useChatStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState<GeneratedFile | null>(null);
  const images = items.filter((f) => /^image\/(png|jpeg|gif|webp)$/.test(f.mimeType));

  async function download(f: GeneratedFile) {
    setBusy(f.id);
    try {
      await filesApi.download(f);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function saveTo(folder: string) {
    const f = saving!;
    setSaving(null);
    const t = toast.loading(`Menyimpan ${f.name} ke Synology…`);
    try {
      const r = await filesApi.saveToSynology(f.id, folder);
      toast.success(`Tersimpan di ${r.path}`, { id: t });
    } catch (e: any) {
      toast.error(synoErrorCode(e) === 'not_connected' ? 'Hubungkan akun Synology dulu di halaman Profil.' : e.message, { id: t });
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((f) => (
            <ImagePreview key={`p:${f.id}`} f={f} />
          ))}
        </div>
      )}
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((f) => {
          const { Icon, cls } = iconFor(f);
          return (
            <div key={f.id} className="flex min-w-0 items-center gap-2 rounded-xl border sm:gap-3 border-border bg-card px-3 py-2.5 shadow-sm">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', cls)}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" title={f.name}>
                  {f.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {typeLabel(f)} · {fmtSize(f.size)}
                </div>
              </div>
              {syno?.enabled && syno.connected && (
                <button className="btn-icon h-8 w-8" title="Simpan ke Synology" onClick={() => setSaving(f)}>
                  <HardDriveUpload className="h-4 w-4" />
                </button>
              )}
              <button className="btn-outline h-8 gap-1.5 px-2.5 text-xs" onClick={() => download(f)} disabled={busy === f.id} title={`Unduh ${f.name}`}>
                {busy === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Unduh</span>
              </button>
            </div>
          );
        })}
      </div>
      {saving && (
        <SynologyPicker
          mode="folder"
          title="Simpan file ke Synology"
          subtitle={`Pilih folder untuk ${saving.name}`}
          confirmLabel="Simpan di sini"
          onClose={() => setSaving(null)}
          onPickFolder={saveTo}
        />
      )}
    </div>
  );
}
