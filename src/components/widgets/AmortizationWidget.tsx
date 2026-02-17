'use client';

import { formatCZK } from '@/lib/format';
import { calculateAmortization, getAmortizationMilestones, DEFAULTS } from '@/lib/calculations';
import { WidgetCard, ResultRow, Divider } from './shared';

interface Props {
  loanAmount: number;
  rate?: number;
  years?: number;
}

const ChartIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export function AmortizationWidget({ loanAmount, rate, years }: Props) {
  const rateVal = rate ?? DEFAULTS.rate;
  const yearsVal = years ?? DEFAULTS.years;
  const months = yearsVal * 12;
  const rows = calculateAmortization(loanAmount, rateVal, months);
  const { milestones, totalPaid, totalInterest } = getAmortizationMilestones(loanAmount, rateVal, months);

  // Sample every 12 months for the chart
  const yearlyData = [];
  for (let i = 11; i < rows.length; i += 12) {
    yearlyData.push({
      year: Math.floor(i / 12) + 1,
      balance: rows[i].balance,
      principalPaid: loanAmount - rows[i].balance,
    });
  }

  const maxVal = loanAmount;

  return (
    <WidgetCard label="Průběh splácení" icon={ChartIcon}>
      <div className="flex gap-4 mb-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-white" />
          <span className="text-white/40">Splacená jistina</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-white/[0.12]" />
          <span className="text-white/40">Zbývající dluh</span>
        </div>
      </div>

      <div className="flex items-end gap-[2px] h-32">
        {yearlyData.map((d) => {
          const principalH = (d.principalPaid / maxVal) * 100;
          const balanceH = (d.balance / maxVal) * 100;
          return (
            <div key={d.year} className="flex-1 flex flex-col justify-end h-full group relative">
              <div
                className="bg-white/[0.12] rounded-t-sm transition-all"
                style={{ height: `${balanceH}%` }}
              />
              <div
                className="bg-white rounded-b-sm transition-all"
                style={{ height: `${principalH}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-white text-[#111] text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
                Rok {d.year}: {formatCZK(d.balance)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-white/25 mt-1">
        <span>1</span>
        <span>{Math.floor(yearsVal / 2)}</span>
        <span>{yearsVal} let</span>
      </div>

      {/* Stats */}
      <div className="mt-4 space-y-2">
        <ResultRow label="Měsíční splátka" value={formatCZK(rows[0]?.payment ?? 0)} />
        <ResultRow label="Celkem zaplaceno" value={formatCZK(totalPaid)} />
        <ResultRow label="Z toho úroky" value={formatCZK(totalInterest)} valueColor="text-red-400" />
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <>
          <Divider />
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/30 mb-2">
            Milníky
          </p>
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.label} className="flex items-center gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                <span className="text-white/40 flex-1">{m.label}</span>
                <span className="font-medium text-white/70 tabular-nums">
                  za {m.year} let
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
