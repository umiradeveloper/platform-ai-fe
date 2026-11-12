'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtCompact, fmtDay, fmtNum, fmtUsd } from '@/lib/utils';

const axis = { stroke: 'hsl(var(--muted-foreground))', fontSize: 11, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />;

function TooltipBox({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold">{fmtDay(label)}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">{money ? fmtUsd(p.value) : fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Token harian: input vs output (stacked bar, celah 2px antar segmen). */
export function TokensChart({ data }: { data: { day: string; inputTokens: number; outputTokens: number }[] }) {
  return (
    <div>
      <Legend items={[{ label: 'Token input', color: 'var(--chart-1)' }, { label: 'Token output', color: 'var(--chart-2)' }]} />
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
            {grid}
            <XAxis dataKey="day" tickFormatter={fmtDay} {...axis} minTickGap={16} />
            <YAxis tickFormatter={fmtCompact} {...axis} width={64} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }} />
            <Bar dataKey="inputTokens" name="Input" stackId="t" fill="var(--chart-1)" stroke="hsl(var(--card))" strokeWidth={1} />
            <Bar dataKey="outputTokens" name="Output" stackId="t" fill="var(--chart-2)" stroke="hsl(var(--card))" strokeWidth={1} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Seri tunggal (biaya / request per hari) — judul kartu menamai seri, tanpa legend. */
export function SingleLineChart({ data, dataKey, name, money }: { data: any[]; dataKey: string; name: string; money?: boolean }) {
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {grid}
          <XAxis dataKey="day" tickFormatter={fmtDay} {...axis} minTickGap={16} />
          <YAxis tickFormatter={(v) => (money ? `$${fmtCompact(v)}` : fmtCompact(v))} {...axis} width={64} />
          <Tooltip content={<TooltipBox money={money} />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey={dataKey} name={name} stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
