'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateStressTest, DEFAULTS } from '@/lib/calculations';
import { WidgetCard, ResultRow, Divider } from './shared';

interface Props {
  loanAmount: number;
  rate?: number;
  years?: number;
}

const AlertIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export function StressTestWidget({ loanAmount, rate, years }: Props) {
  const rateVal = rate ?? DEFAULTS.rate;
  const yearsVal = years ?? DEFAULTS.years;
  const result = calculateStressTest(loanAmount, rateVal, yearsVal);

  return (
    <WidgetCard label="Stress test" icon={AlertIcon}>
      <div className="text-[13px] text-white/35 mb-3">
        Co když sazba vzroste po refixaci?
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 gap-0 bg-white/[0.03] px-3 py-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">
          <span>Sazba</span>
          <span className="text-right">Splátka</span>
          <span className="text-right">Rozdíl</span>
        </div>

        {/* Base row */}
        <div className="grid grid-cols-3 gap-0 px-3 py-2.5 border-t border-white/[0.04] bg-emerald-500/[0.05]">
          <span className="text-xs font-medium text-white/80">
            {formatPercent(result.baseRate)}
          </span>
          <span className="text-xs font-medium text-white/80 text-right">
            {formatCZK(result.basePayment)}
          </span>
          <span className="text-xs text-emerald-400 text-right font-medium">
            aktuální
          </span>
        </div>

        {/* Scenario rows */}
        {result.scenarios.map((s) => {
          const severity = s.rateChange <= 0.01 ? 'text-amber-400' : s.rateChange <= 0.02 ? 'text-orange-400' : 'text-red-400';
          const bg = s.rateChange <= 0.01 ? 'bg-amber-500/[0.03]' : s.rateChange <= 0.02 ? 'bg-orange-500/[0.03]' : 'bg-red-500/[0.03]';
          return (
            <div key={s.rateChange} className={`grid grid-cols-3 gap-0 px-3 py-2.5 border-t border-white/[0.04] ${bg}`}>
              <span className="text-xs text-white/70">
                {formatPercent(s.newRate)}
                <span className="text-[9px] text-white/30 ml-1">+{(s.rateChange * 100).toFixed(0)}pp</span>
              </span>
              <span className="text-xs text-white/70 text-right">
                {formatCZK(s.monthlyPayment)}
              </span>
              <span className={`text-xs text-right font-medium ${severity}`}>
                +{formatCZK(s.difference)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total cost comparison */}
      <div className="mt-3 space-y-1.5">
        <ResultRow label="Celkem při aktuální sazbě" value={formatCZK(result.baseTotalCost)} />
        {result.scenarios.length > 0 && (
          <ResultRow
            label={`Celkem při +${(result.scenarios[result.scenarios.length - 1].rateChange * 100).toFixed(0)}pp`}
            value={`${formatCZK(result.scenarios[result.scenarios.length - 1].totalCost)} (+${formatCZK(result.scenarios[result.scenarios.length - 1].totalCost - result.baseTotalCost)})`}
            valueColor="text-red-400"
          />
        )}
      </div>
    </WidgetCard>
  );
}
