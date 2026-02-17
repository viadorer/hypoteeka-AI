'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateRefinance, DEFAULTS } from '@/lib/calculations';
import { WidgetCard, StatGrid, StatCard, ResultRow, Divider } from './shared';

interface Props {
  remainingBalance: number;
  currentRate: number;
  newRate?: number;
  remainingYears: number;
}

const RefreshIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

export function RefinanceWidget({ remainingBalance, currentRate, newRate, remainingYears }: Props) {
  const result = calculateRefinance(remainingBalance, currentRate, newRate ?? DEFAULTS.rate, remainingYears);
  const savingColor = result.monthlySaving > 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <WidgetCard label="Refinancování" icon={RefreshIcon}>
      <StatGrid>
        <StatCard
          label="Stávající splátka"
          value={formatCZK(result.currentPayment)}
          sub={`${formatPercent(currentRate)} p.a.`}
        />
        <StatCard
          label="Nová splátka"
          value={formatCZK(result.newPayment)}
          valueColor="text-emerald-400"
          sub={`${formatPercent(newRate ?? DEFAULTS.rate)} p.a.`}
        />
      </StatGrid>

      <div className="mt-3 space-y-2">
        <ResultRow
          label="Měsíční úspora"
          value={`${result.monthlySaving > 0 ? '+' : ''}${formatCZK(result.monthlySaving)}`}
          valueColor={savingColor}
        />
        <ResultRow
          label="Celková úspora"
          value={`${result.totalSaving > 0 ? '+' : ''}${formatCZK(result.totalSaving)}`}
          valueColor={savingColor}
        />
        <Divider />
        <ResultRow label="Zbývající splatnost" value={`${remainingYears} let`} />
      </div>
    </WidgetCard>
  );
}
