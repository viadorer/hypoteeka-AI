'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateInvestment } from '@/lib/calculations';
import { WidgetCard, StatGrid, StatCard, ResultRow, Divider } from './shared';

interface Props {
  purchasePrice: number;
  equity: number;
  monthlyRentalIncome: number;
  monthlyExpenses?: number;
}

const TrendIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

export function InvestmentWidget({ purchasePrice, equity, monthlyRentalIncome, monthlyExpenses }: Props) {
  const result = calculateInvestment(purchasePrice, equity, monthlyRentalIncome, monthlyExpenses);
  const cfColor = result.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <WidgetCard label="Investiční analýza" icon={TrendIcon}>
      <StatGrid>
        <StatCard
          label="Měsíční cash flow"
          value={`${result.monthlyCashFlow >= 0 ? '+' : ''}${formatCZK(result.monthlyCashFlow)}`}
          valueColor={cfColor}
        />
        <StatCard
          label="Roční cash flow"
          value={`${result.annualCashFlow >= 0 ? '+' : ''}${formatCZK(result.annualCashFlow)}`}
          valueColor={cfColor}
        />
      </StatGrid>

      <div className="mt-3 space-y-2">
        <ResultRow label="Měsíční příjem z nájmu" value={formatCZK(result.monthlyRentalIncome)} />
        <ResultRow label="Měsíční splátka" value={formatCZK(result.monthlyMortgage)} />
        <Divider />
        <ResultRow label="ROI" value={formatPercent(result.roi)} />
        <ResultRow label="ROE" value={formatPercent(result.roe)} />
        <ResultRow label="Cap Rate" value={formatPercent(result.capRate)} />
        <ResultRow label="Cash-on-Cash" value={formatPercent(result.cashOnCash)} />
      </div>
    </WidgetCard>
  );
}
