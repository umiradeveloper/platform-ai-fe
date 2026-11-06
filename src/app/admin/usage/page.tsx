'use client';

import { useState } from 'react';
import { Empty, PageHeader, PeriodPicker, Section, Stat, useData } from '@/components/admin/common';
import { SingleLineChart, TokensChart } from '@/components/admin/charts';
import { ProviderBadge, Spinner } from '@/components/ui/basics';
import { cn, fmtCompact, fmtDate, fmtNum, fmtUsd } from '@/lib/utils';

interface UsageReport {
  totals: { requests: number; inputTokens: number; outputTokens: number; cost: number };
  daily: { day: string; requests: number; inputTokens: number; outputTokens: number; cost: number; errors: number }[];
  recent: {
    id: string; createdAt: string; inputTokens: number; outputTokens: number; estimatedCost: string; latencyMs: number;
    status: 'SUCCESS' | 'ERROR' | 'CANCELLED'; errorMessage: string | null;
    user: { name: string; email: string }; model: { displayName: string; provider: string };
  }[];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  SUCCESS: { label: 'Sukses', cls: 'bg-success/15 text-success' },
  ERROR: { label: 'Error', cls: 'bg-destructive/15 text-destructive' },
  CANCELLED: { label: 'Dihentikan', cls: 'bg-muted text-muted-foreground' },
};

export default function UsagePage() {
  const [days, setDays] = useState(30);
  const { data, loading } = useData<UsageReport>(`/admin/usage?days=${days}`);
  return (
    <>
      <PageHeader title="Monitoring penggunaan" description="Token input/output dan request ke provider AI." actions={<PeriodPicker value={days} onChange={setDays} />} />
      {loading && !data ? <div className="flex justify-center py-12"><Spinner /></div> : data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Request" value={fmtNum(data.totals.requests)} />
            <Stat label="Token input" value={fmtCompact(data.totals.inputTokens)} />
            <Stat label="Token output" value={fmtCompact(data.totals.outputTokens)} />
            <Stat label="Estimasi biaya" value={fmtUsd(data.totals.cost)} accent />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Section title="Token per hari"><TokensChart data={data.daily} /></Section>
            <Section title="Request per hari"><SingleLineChart data={data.daily} dataKey="requests" name="Request" /></Section>
          </div>
          <Section title="100 request terakhir">
            {!data.recent.length ? <Empty>Belum ada request.</Empty> : (
              <div className="-mx-4 overflow-x-auto sm:-mx-5">
                <table className="table-base">
                  <thead><tr><th>Waktu</th><th>Pengguna</th><th>Model</th><th>Status</th><th className="text-right">In</th><th className="text-right">Out</th><th className="text-right">Biaya</th><th className="text-right">Latency</th></tr></thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={r.id} title={r.errorMessage ?? undefined}>
                        <td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(r.createdAt)}</td>
                        <td className="max-w-[180px] truncate">{r.user.name}</td>
                        <td><div className="flex items-center gap-1.5 whitespace-nowrap"><ProviderBadge provider={r.model.provider} />{r.model.displayName}</div></td>
                        <td><span className={cn('badge', STATUS[r.status].cls)}>{STATUS[r.status].label}</span></td>
                        <td className="text-right tabular-nums">{fmtNum(r.inputTokens)}</td>
                        <td className="text-right tabular-nums">{fmtNum(r.outputTokens)}</td>
                        <td className="text-right tabular-nums">{fmtUsd(Number(r.estimatedCost))}</td>
                        <td className="text-right tabular-nums">{(r.latencyMs / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}
    </>
  );
}
