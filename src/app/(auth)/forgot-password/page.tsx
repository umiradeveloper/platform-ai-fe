'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AuthShell } from '@/components/ui/auth-shell';
import { Spinner } from '@/components/ui/basics';
import { publicPost } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await publicPost('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Lupa password" subtitle="Masukkan email akun Anda untuk menerima link reset.">
      {sent ? (
        <div className="card p-4 text-sm">
          Jika email tersebut terdaftar, link reset password sudah dikirim. Link berlaku 30 menit.
          <p className="mt-2 text-xs text-muted-foreground">Belum ada layanan email? Administrator dapat melihat link di log server API.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy && <Spinner />} Kirim link reset</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-accent hover:underline">Kembali ke login</Link></p>
    </AuthShell>
  );
}
