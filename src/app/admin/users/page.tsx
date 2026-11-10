'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { Empty, PageHeader, useData } from '@/components/admin/common';
import { Modal, Spinner, Toggle } from '@/components/ui/basics';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtCompact, fmtDate, fmtUsd } from '@/lib/utils';

interface AdminUser {
  id: string; name: string; email: string; role: 'USER' | 'ADMIN'; isActive: boolean; dailyTokenLimit: number | null;
  lastLoginAt: string | null; createdAt: string; conversations: number; tokens30d: number; cost30d: number;
  authSource: 'LOCAL' | 'SUPERAPPS'; externalRole: string | null; externalUsername: string | null;
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading, reload } = useData<AdminUser[]>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const [edit, setEdit] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);

  async function patch(id: string, body: Partial<AdminUser>) {
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', json: body });
      toast.success('Pengguna diperbarui');
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Kelola akun, role, status, dan batas token harian."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Tambah pengguna</button>}
      />
      <form className="relative mb-4 max-w-sm" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className="input pl-9" placeholder="Cari nama atau email lalu Enter…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <div className="card overflow-x-auto">
        {loading && !data ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.length ? <Empty>Tidak ada pengguna.</Empty> : (
          <table className="table-base">
            <thead>
              <tr><th>Pengguna</th><th>Role</th><th>Aktif</th><th className="text-right">Chat</th><th className="text-right">Token 30h</th><th className="text-right">Biaya 30h</th><th>Login terakhir</th><th></th></tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-1.5 font-medium">
                      {u.name}
                      {u.authSource === 'SUPERAPPS' && <span className="badge bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200" title={`Role SuperApps: ${u.externalRole ?? '-'}`}>SuperApps</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}{u.externalRole ? ` · ${u.externalRole}` : ''}</div>
                  </td>
                  <td>
                    <span className={u.role === 'ADMIN' ? 'badge bg-copper-100 text-copper-700 dark:bg-copper-900/50 dark:text-copper-200' : 'badge bg-muted text-muted-foreground'}>
                      {u.role === 'ADMIN' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td><Toggle checked={u.isActive} disabled={u.id === me?.id} onChange={(v) => patch(u.id, { isActive: v })} /></td>
                  <td className="text-right tabular-nums">{u.conversations}</td>
                  <td className="text-right tabular-nums">{fmtCompact(u.tokens30d)}</td>
                  <td className="text-right tabular-nums">{fmtUsd(u.cost30d)}</td>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—'}</td>
                  <td className="text-right"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEdit(u)}>Ubah</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && <EditUser user={edit} isSelf={edit.id === me?.id} onClose={() => setEdit(null)} onSave={async (b) => { await patch(edit.id, b); setEdit(null); }} />}
      <CreateUser open={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
    </>
  );
}

function EditUser({ user, isSelf, onClose, onSave }: { user: AdminUser; isSelf: boolean; onClose: () => void; onSave: (b: Partial<AdminUser>) => Promise<void> }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [limitMode, setLimitMode] = useState<'default' | 'custom'>(user.dailyTokenLimit == null ? 'default' : 'custom');
  const [limit, setLimit] = useState(String(user.dailyTokenLimit ?? 200000));
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title={`Ubah ${user.name}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onSave({ ...(user.authSource === 'SUPERAPPS' ? {} : { name, role }), dailyTokenLimit: limitMode === 'default' ? null : Number(limit) });
          setBusy(false);
        }}
      >
        <div><label className="label">Nama</label><input className="input" value={name} disabled={user.authSource === 'SUPERAPPS'} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} disabled={isSelf || user.authSource === 'SUPERAPPS'} onChange={(e) => setRole(e.target.value as AdminUser['role'])}>
            <option value="USER">User</option>
            <option value="ADMIN">Administrator</option>
          </select>
          {user.authSource === 'SUPERAPPS' && <p className="mt-1 text-xs text-muted-foreground">Role mengikuti SuperApps ({user.externalRole ?? '-'}).</p>}
        </div>
        <div>
          <label className="label">Batas token harian</label>
          <div className="flex gap-2">
            <select className="input w-40" value={limitMode} onChange={(e) => setLimitMode(e.target.value as 'default' | 'custom')}>
              <option value="default">Default sistem</option>
              <option value="custom">Khusus</option>
            </select>
            {limitMode === 'custom' && <input type="number" min={0} className="input" value={limit} onChange={(e) => setLimit(e.target.value)} />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Isi 0 untuk tanpa batas.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-outline" onClick={onClose}>Batal</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Simpan</button>
        </div>
      </form>
    </Modal>
  );
}

function CreateUser({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Tambah pengguna">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api('/admin/users', { method: 'POST', json: f });
            toast.success('Pengguna dibuat');
            setF({ name: '', email: '', password: '', role: 'USER' });
            onCreated();
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div><label className="label">Nama</label><input required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">Email</label><input required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label">Password awal</label><input required minLength={8} type="password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="USER">User</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-outline" onClick={onClose}>Batal</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Buat</button>
        </div>
      </form>
    </Modal>
  );
}
