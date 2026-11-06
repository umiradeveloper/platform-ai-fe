'use client';

import { useState } from 'react';
import { Empty, PageHeader, PeriodPicker, Section, Stat, useData } from '@/components/admin/common';
import { TokensChart } from '@/components/admin/charts';
import { ProviderBadge, Spinner } from '@/components/ui/basics';
import { fmtCompact, fmtIdr, fmtNum, fmtPct, fmtUsd } from '@/lib/utils';

interface Dashboard {
  days: number;
  kpi: {
    users: number; activeUsers: number; conversations: number; messages: number; dau: number; mau: number;
    requests: number; inputTokens: number; outputTokens: number; cost: number; avgLatencyMs: number; errorRate: number;
  };
  daily: { day: string; inputTokens: number; outputTokens: number; requests: number; cost: number }[];
  byModel: { modelId: string; displayName: string; provider: string; requests: number; inputTokens: number; outputTokens: number; cost: number; avgLatencyMs: number; errorRate: number }[];
  topUsers: { id?: string; name?: string; email?: string; requests: number; tokens: number; cost: number }[];
}

const USD_IDR = 16000;

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const { data, loading } = useData<Dashboard>(`/admin/dashboard?days=${days}`);

  return (
    <>
      <PageHeader title="Overview" description="Ringkasan pengguna, percakapan, dan penggunaan AI." actions={<PeriodPicker value={days} onChange={setDays} />} />
      {loading && !data ? (
        <div className="flex justify-center py-20"><Spinner className="h-6 w-6 text-primary" /></div>
      ) : data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total pengguna" value={fmtNum(data.kpi.users)} hint={`${fmtNum(data.kpi.activeUsers)} akun aktif`} />
            <Stat label="Pengguna aktif" value={`${fmtNum(data.kpi.dau)} / ${fmtNum(data.kpi.mau)}`} hint="Harian / bulanan (30 hari)" />
            <Stat label="Percakapan" value={fmtNum(data.kpi.conversations)} hint={`${fmtNum(data.kpi.messages)} pesan AI`} />
            <Stat label={`Estimasi biaya (${days} hari)`} value={fmtUsd(data.kpi.cost)} hint={`≈ ${fmtIdr(data.kpi.cost * USD_IDR)}`} accent />
            <Stat label="Token input" value={fmtCompact(data.kpi.inputTokens)} hint={`${fmtNum(data.kpi.requests)} request`} />
            <Stat label="Token output" value={fmtCompact(data.kpi.outputTokens)} />
            <Stat label="Rata-rata latency" value={`${(data.kpi.avgLatencyMs / 1000).toFixed(1)} dtk`} hint="Sampai jawaban selesai" />
            <Stat label="Error rate provider" value={fmtPct(data.kpi.errorRate)} hint={data.kpi.errorRate > 0.05 ? 'Perlu dicek' : 'Normal'} />
          </div>

          <Section title="Token per hari">
            <TokensChart data={data.daily} />
          </Section>

          <div className="grid gap-5 xl:grid-cols-5">
            <Section title="Penggunaan per model" className="xl:col-span-3">
              {data.byModel.length === 0 ? <Empty>Belum ada penggunaan.</Empty> : (
                <div className="-mx-4 overflow-x-auto sm:-mx-5">
                  <table className="table-base">
                    <thead><tr><th>Model</th><th className="text-right">Request</th><th className="text-right">Token</th><th className="text-right">Biaya</th><th className="text-right">Latency</th><th className="text-right">Error</th></tr></thead>
                    <tbody>
                      {data.byModel.map((m) => (
                        <tr key={m.modelId}>
                          <td><div className="flex items-center gap-2"><ProviderBadge provider={m.provider} /><span className="font-medium">{m.displayName}</span></div></td>
                          <td className="text-right tabular-nums">{fmtNum(m.requests)}</td>
                          <td className="text-right tabular-nums">{fmtCompact(m.inputTokens + m.outputTokens)}</td>
                          <td className="text-right tabular-nums">{fmtUsd(m.cost)}</td>
                          <td className="text-right tabular-nums">{(m.avgLatencyMs / 1000).toFixed(1)}s</td>
                          <td className="text-right tabular-nums">{fmtPct(m.errorRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
            <Section title="Pengguna teratas" className="xl:col-span-2">
              {data.topUsers.length === 0 ? <Empty>Belum ada penggunaan.</Empty> : (
                <ul className="space-y-3">
                  {data.topUsers.map((u, i) => (
                    <li key={u.id ?? i} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">{u.name?.[0]?.toUpperCase() ?? '?'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{u.name ?? '(dihapus)'}</div>
                        <div className="truncate text-xs text-muted-foreground">{fmtNum(u.requests)} request · {fmtCompact(u.tokens)} token</div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{fmtUsd(u.cost)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}
    </>
  );
}
