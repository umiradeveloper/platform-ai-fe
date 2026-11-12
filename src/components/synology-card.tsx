'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, HardDrive, KeyRound, ShieldCheck, Unplug } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';
import { synoErrorCode, synology } from '@/lib/synology';
import { Spinner } from '@/components/ui/basics';
import { fmtDate } from '@/lib/utils';

/** Kartu "Hubungkan Synology" di halaman Profil. */
export function SynologyCard() {
  const { syno, refreshSyno, refreshKb } = useChatStore();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needOtp, setNeedOtp] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (syno?.account && !account) setAccount(syno.account);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syno?.account]);

  useEffect(() => {
    if (window.location.hash === '#synology') document.getElementById('synology')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (!syno) return null;
  if (!syno.enabled) {
    return (
      <section id="synology" className="card p-5 text-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold"><HardDrive className="h-4 w-4 text-primary" /> Synology NAS</h2>
        <p className="text-muted-foreground">Integrasi Synology belum diaktifkan oleh administrator.</p>
      </section>
    );
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await synology.connect({ account: account.trim(), password, otp: needOtp ? otp.trim() : undefined, remember });
      setPassword('');
      setOtp('');
      setNeedOtp(false);
      setEditing(false);
      await Promise.all([refreshSyno(), refreshKb()]);
      toast.success('Synology terhubung');
    } catch (err: any) {
      const code = synoErrorCode(err);
      if (code === 'otp_required') {
        setNeedOtp(true);
        toast.info('Masukkan kode OTP dari aplikasi Secure SignIn / authenticator Anda.');
      } else {
        if (code === 'otp_invalid') setOtp('');
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Putuskan koneksi Synology? Lampiran yang sudah ada di chat tetap tersimpan, tetapi basis pengetahuan Anda ikut dihapus.')) return;
    setBusy(true);
    try {
      await synology.disconnect();
      await Promise.all([refreshSyno(), refreshKb()]);
      toast.success('Koneksi Synology diputus');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const showForm = !syno.connected || editing;

  return (
    <section id="synology" className="card scroll-mt-4 p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-primary dark:bg-teal-900/50">
          <HardDrive className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">Synology NAS</h2>
          <p className="text-xs text-muted-foreground">
            Hubungkan akun DSM Anda ({syno.nasHost}) agar Umira AI bisa membaca file NAS yang Anda lampirkan dan menyimpan jawaban ke folder Anda. Akses mengikuti izin akun Anda di NAS.
          </p>
        </div>
      </div>

      {syno.connected && !editing && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Terhubung sebagai {syno.account}</div>
            <div className="text-xs text-muted-foreground">
              {syno.remember ? 'Tetap tersambung otomatis' : 'Sesi berlaku ±7 hari, setelah itu hubungkan ulang'}
              {syno.connectedAt ? ` · sejak ${fmtDate(syno.connectedAt)}` : ''}
            </div>
          </div>
          <button className="btn-outline py-1.5 text-xs" onClick={() => setEditing(true)} disabled={busy}>
            Ganti akun
          </button>
          <button className="btn-ghost py-1.5 text-xs text-destructive" onClick={disconnect} disabled={busy}>
            <Unplug className="h-3.5 w-3.5" /> Putuskan
          </button>
        </div>
      )}

      {syno.status === 'expired' && !editing && (
        <div className="mb-4 rounded-lg border border-copper-300 bg-copper-50 px-3 py-2 text-xs text-copper-800 dark:border-copper-800 dark:bg-copper-900/30 dark:text-copper-100">
          Sesi Synology untuk akun <b>{syno.account}</b> sudah berakhir. Masukkan password lagi untuk menyambung ulang.
        </div>
      )}

      {showForm && (
        <form onSubmit={connect} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="syno-account">Username DSM</label>
            <input id="syno-account" className="input" autoComplete="off" autoCapitalize="none" required value={account} onChange={(e) => setAccount(e.target.value)} placeholder="nama.user" />
          </div>
          <div>
            <label className="label" htmlFor="syno-pass">Password DSM</label>
            <input id="syno-pass" type="password" className="input" autoComplete="off" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {needOtp && (
            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5" htmlFor="syno-otp"><KeyRound className="h-3.5 w-3.5" /> Kode OTP (verifikasi 2 langkah)</label>
              <input id="syno-otp" className="input max-w-[180px] text-center font-mono tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
              <p className="mt-1 text-xs text-muted-foreground">Perangkat ini akan diingat, jadi OTP tidak diminta lagi saat menyambung ulang.</p>
            </div>
          )}
          {syno.allowRemember && (
            <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>
                <span className="font-medium">Tetap tersambung</span>
                <span className="block text-xs text-muted-foreground">Password disimpan terenkripsi agar Umira menyambung ulang otomatis saat sesi NAS habis. Tanpa ini, Anda perlu menyambung ulang ±7 hari sekali.</span>
              </span>
            </label>
          )}
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Kredensial dienkripsi & tidak pernah ditampilkan kembali.</span>
            <div className="flex gap-2">
              {editing && (
                <button type="button" className="btn-outline" onClick={() => { setEditing(false); setNeedOtp(false); }}>
                  Batal
                </button>
              )}
              <button className="btn-primary" disabled={busy}>
                {busy && <Spinner />} {needOtp ? 'Verifikasi & hubungkan' : 'Hubungkan'}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
