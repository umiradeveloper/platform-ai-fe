'use client';

import { useState } from 'react';
import { Empty, PageHeader, PeriodPicker, Section, Stat, useData } from '@/components/admin/common';
import { SingleLineChart } from '@/components/admin/charts';
import { ProviderBadge, Spinner } from '@/components/ui/basics';
import { fmtCompact, fmtIdr, fmtNum, fmtUsd } from '@/lib/utils';

interface Costs {
  usdToIdr: number;
  totals: { requests: number; inputTokens: number; outputTokens: number; cost: number };
  projectedMonthUsd: number;
  daily: { day: string; cost: number }[];
  byModel: { modelId: string; displayName: string; provider: string; requests: number; inputTokens: number; outputTokens: number; cost: number }[];
}

export default function CostsPage() {
  const [days, setDays] = useState(30);
  const { data, loading } = useData<Costs>(`/admin/costs?days=${days}`);
  const total = data?.totals.cost ?? 0;
  return (
    <>
      <PageHeader
        title="Monitoring biaya AI"
        description="Estimasi dihitung dari token × harga per model (atur di menu Model AI). Bukan tagihan resmi provider."
        actions={<PeriodPicker value={days} onChange={setDays} />}
      />
      {loading && !data ? <div className="flex justify-center py-12"><Spinner /></div> : data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={`Total ${days} hari`} value={fmtUsd(total)} hint={`≈ ${fmtIdr(total * data.usdToIdr)}`} accent />
            <Stat label="Proyeksi 30 hari" value={fmtUsd(data.projectedMonthUsd)} hint={`≈ ${fmtIdr(data.projectedMonthUsd * data.usdToIdr)}`} />
            <Stat label="Biaya per request" value={fmtUsd(data.totals.requests ? total / data.totals.requests : 0)} hint={`${fmtNum(data.totals.requests)} request`} />
            <Stat label="Kurs dipakai" value={fmtIdr(data.usdToIdr)} hint="per USD (env USD_TO_IDR)" />
          </div>
          <Section title="Biaya per hari (USD)"><SingleLineChart data={data.daily} dataKey="cost" name="Biaya" money /></Section>
          <Section title="Biaya per model">
            {!data.byModel.length ? <Empty>Belum ada penggunaan.</Empty> : (
              <div className="space-y-3">
                {data.byModel.map((m) => {
                  const pct = total ? (m.cost / total) * 100 : 0;
                  return (
                    <div key={m.modelId}>
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                        <ProviderBadge provider={m.provider} />
                        <span className="font-medium">{m.displayName}</span>
                        <span className="text-xs text-muted-foreground">{fmtNum(m.requests)} req · {fmtCompact(m.inputTokens + m.outputTokens)} token</span>
                        <span className="ml-auto font-semibold tabular-nums">{fmtUsd(m.cost)}</span>
                        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.max(pct, m.cost > 0 ? 1 : 0)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      )}
    </>
  );
}
