'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthShell } from '@/components/ui/auth-shell';
import { Spinner } from '@/components/ui/basics';
import { API_BASE, login } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const next = params.get('next') || '/';

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  useEffect(() => {
    fetch(`${API_BASE}/public/config`).then((r) => r.json()).then((c) => setAllowRegistration(!!c.allowRegistration)).catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      router.replace(next);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Selamat datang kembali" subtitle="Masuk untuk melanjutkan percakapan Anda.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@umira.id" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="mb-1.5 text-xs font-medium text-primary hover:underline">Lupa password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full py-2.5" disabled={busy}>
          {busy && <Spinner />} Masuk
        </button>
      </form>
      {allowRegistration && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Belum punya akun? <Link href="/register" className="font-semibold text-accent hover:underline">Daftar</Link>
        </p>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
