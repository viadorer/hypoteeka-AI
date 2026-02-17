'use client';

import { formatCZK } from '@/lib/format';
import { calculateAffordability } from '@/lib/calculations';
import { WidgetCard, ResultRow, Divider } from './shared';

interface Props {
  monthlyIncome: number;
  equity: number;
  isYoung?: boolean;
}

const WalletIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 12V7H5a2 2 0 010-4h14v4" />
    <path d="M3 5v14a2 2 0 002 2h16v-5" />
    <path d="M18 12a2 2 0 100 4h4v-4h-4z" />
  </svg>
);

export function AffordabilityWidget({ monthlyIncome, equity, isYoung }: Props) {
  const result = calculateAffordability(monthlyIncome, equity, isYoung);

  return (
    <WidgetCard label="Kolik si můžete dovolit" icon={WalletIcon}>
      <div className="text-[28px] font-semibold text-white tracking-tight truncate">
        {formatCZK(result.maxPropertyPrice)}
      </div>
      <div className="text-[13px] text-white/35 mt-1 mb-4">maximální cena nemovitosti</div>

      <div className="space-y-2">
        <ResultRow label="Maximální úvěr" value={formatCZK(result.maxLoan)} />
        <ResultRow label="Vlastní zdroje" value={formatCZK(equity)} />
        <ResultRow label="Měsíční splátka" value={formatCZK(result.monthlyPayment)} />
        <Divider />
        <ResultRow label="Čistý měsíční příjem" value={formatCZK(monthlyIncome)} />
      </div>
    </WidgetCard>
  );
}
