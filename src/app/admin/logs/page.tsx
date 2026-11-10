'use client';

import { Empty, PageHeader, useData } from '@/components/admin/common';
import { Spinner } from '@/components/ui/basics';
import { fmtDate } from '@/lib/utils';

interface Log {
  id: string; action: string; targetType: string | null; targetId: string | null; metadata: Record<string, unknown> | null;
  ipAddress: string | null; createdAt: string; actor: { name: string; email: string } | null;
}

const ACTION_LABEL: Record<string, string> = {
  'user.create': 'Membuat pengguna',
  'user.update': 'Mengubah pengguna',
  'user.deactivate': 'Menonaktifkan pengguna',
  'user.activate': 'Mengaktifkan pengguna',
  'model.create': 'Menambah model',
  'model.update': 'Mengubah model',
  'model.delete': 'Menghapus model',
  'model.deactivate': 'Menonaktifkan model',
  'provider.update': 'Mengubah konfigurasi provider',
  'settings.update': 'Mengubah pengaturan sistem',
  'auth.password_reset': 'Reset password',
  'auth.superapps_first_login': 'Login pertama akun SuperApps',
  'auth.superapps_link': 'Akun lokal ditautkan ke SuperApps',
  'auth.superapps_role_sync': 'Role disinkron dari SuperApps',
  'auth.superapps_denied': 'Login SuperApps ditolak',
};

export default function LogsPage() {
  const { data, loading } = useData<Log[]>('/admin/audit-logs?take=300');
  return (
    <>
      <PageHeader title="Log aktivitas" description="Audit log tindakan administrator dan peristiwa keamanan." />
      <div className="card overflow-x-auto">
        {loading && !data ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.length ? <Empty>Belum ada aktivitas.</Empty> : (
          <table className="table-base">
            <thead><tr><th>Waktu</th><th>Pelaku</th><th>Aktivitas</th><th>Target</th><th>Detail</th><th>IP</th></tr></thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(l.createdAt)}</td>
                  <td className="whitespace-nowrap">{l.actor?.name ?? 'Sistem'}</td>
                  <td className="whitespace-nowrap font-medium">{ACTION_LABEL[l.action] ?? l.action}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{l.targetType ? `${l.targetType}:${l.targetId?.slice(-8)}` : '—'}</td>
                  <td className="max-w-xs truncate font-mono text-[11px] text-muted-foreground" title={l.metadata ? JSON.stringify(l.metadata) : ''}>{l.metadata ? JSON.stringify(l.metadata) : '—'}</td>
                  <td className="font-mono text-xs text-muted-foreground">{l.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
