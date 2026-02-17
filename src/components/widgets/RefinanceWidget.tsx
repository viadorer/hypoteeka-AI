'use client';

import { useState, useMemo } from 'react';
import { formatCZK, formatPercent } from '@/lib/format';
import { calculateRefinance, DEFAULTS } from '@/lib/calculations';
import { WidgetCard, StatGrid, StatCard, ResultRow, SliderInput, Divider } from './shared';

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
  const initNewRate = newRate ?? DEFAULTS.rate;
  const [adjNewRate, setAdjNewRate] = useState(initNewRate);
  const [adjYears, setAdjYears] = useState(remainingYears);

  const result = useMemo(
    () => calculateRefinance(remainingBalance, currentRate, adjNewRate, adjYears),
    [remainingBalance, currentRate, adjNewRate, adjYears]
  );
  const savingColor = result.monthlySaving > 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <WidgetCard label="Refinancování" icon={RefreshIcon}>
      <SliderInput
        label="Nová sazba"
        value={Math.round(adjNewRate * 10000) / 100}
        min={2}
        max={8}
        step={0.05}
        onChange={(v) => setAdjNewRate(v / 100)}
        suffix=" %"
      />
      <SliderInput
        label="Zbývající splatnost"
        value={adjYears}
        min={5}
        max={30}
        step={1}
        onChange={setAdjYears}
        suffix=" let"
      />

      <StatGrid>
        <StatCard
          label="Stávající splátka"
          value={formatCZK(result.currentPayment)}
          sub={`${formatPercent(currentRate)} p.a.`}
        />
        <StatCard
          label="Nová splátka"
          value={formatCZK(result.newPayment)}
          valueColor="text-emerald-600"
          sub={`${formatPercent(adjNewRate)} p.a.`}
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
      </div>
    </WidgetCard>
  );
}
