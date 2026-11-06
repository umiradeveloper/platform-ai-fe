'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthShell } from '@/components/ui/auth-shell';
import { Spinner } from '@/components/ui/basics';
import { publicPost } from '@/lib/api';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error('Konfirmasi password tidak sama');
    setBusy(true);
    try {
      await publicPost('/auth/reset-password', { token, password });
      toast.success('Password berhasil diubah. Silakan masuk.');
      router.replace('/login');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Atur password baru">
      {!token ? (
        <p className="text-sm text-muted-foreground">Link reset tidak valid. <Link href="/forgot-password" className="text-accent">Minta link baru</Link>.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="p1">Password baru</label>
            <input id="p1" type="password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p2">Ulangi password</label>
            <input id="p2" type="password" required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy && <Spinner />} Simpan password</button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
