'use client';

import { useState, useMemo } from 'react';
import { formatCZK } from '@/lib/format';
import { compareRentVsBuy } from '@/lib/calculations';
import { WidgetCard, StatGrid, StatCard, ResultRow, SliderInput, Divider } from './shared';

interface Props {
  propertyPrice: number;
  equity: number;
  monthlyRent: number;
}

const ScaleIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3v18M3 7l3 9h6l3-9M15 7l3 9h3" />
  </svg>
);

export function RentVsBuyWidget({ propertyPrice, equity, monthlyRent }: Props) {
  const [adjRent, setAdjRent] = useState(monthlyRent);

  const result = useMemo(
    () => compareRentVsBuy(propertyPrice, equity, adjRent),
    [propertyPrice, equity, adjRent]
  );

  return (
    <WidgetCard label="Nájem vs. Hypotéka" icon={ScaleIcon}>
      <SliderInput
        label="Měsíční nájem"
        value={adjRent}
        min={5000}
        max={60000}
        step={500}
        onChange={setAdjRent}
        formatValue={(v) => formatCZK(v)}
      />

      <StatGrid>
        <StatCard label="Měsíční nájem" value={formatCZK(result.monthlyRent)} />
        <StatCard label="Měsíční splátka" value={formatCZK(result.monthlyMortgage)} />
      </StatGrid>

      <div className="mt-3 space-y-2">
        <ResultRow
          label="Rozdíl měsíčně"
          value={`${result.difference > 0 ? '+' : ''}${formatCZK(result.difference)}`}
          valueColor={result.difference > 0 ? 'text-red-600' : 'text-emerald-600'}
        />
        <ResultRow label="Celkem nájem (30 let)" value={formatCZK(result.totalRentCost)} />
        <ResultRow label="Celkem hypotéka (30 let)" value={formatCZK(result.totalMortgageCost)} />
        <ResultRow label="Vlastní kapitál po 30 letech" value={formatCZK(result.equityAfterYears)} valueColor="text-emerald-600" />
        {result.breakEvenYears && (
          <>
            <Divider />
            <ResultRow label="Break-even" value={`${result.breakEvenYears} let`} valueColor="text-gray-900" />
          </>
        )}
      </div>
    </WidgetCard>
  );
}
