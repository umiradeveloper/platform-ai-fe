'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthShell } from '@/components/ui/auth-shell';
import { Spinner } from '@/components/ui/basics';
import { register } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Konfirmasi password tidak sama');
    setBusy(true);
    try {
      const u = await register(form.name, form.email, form.password);
      if (u.role === 'ADMIN') toast.success('Akun pertama dibuat sebagai Administrator.');
      router.replace('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Buat akun" subtitle="Daftar untuk mulai memakai Umira AI.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Nama lengkap</label>
          <input id="name" required minLength={2} className="input" value={form.name} onChange={set('name')} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} className="input" value={form.password} onChange={set('password')} autoComplete="new-password" />
          <p className="mt-1 text-xs text-muted-foreground">Minimal 8 karakter.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">Ulangi password</label>
          <input id="confirm" type="password" required className="input" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        </div>
        <button className="btn-primary w-full py-2.5" disabled={busy}>
          {busy && <Spinner />} Daftar
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun? <Link href="/login" className="font-semibold text-accent hover:underline">Masuk</Link>
      </p>
    </AuthShell>
  );
}
