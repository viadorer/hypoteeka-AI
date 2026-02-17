'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { WidgetCard } from './shared';

interface BankRate {
  label: string;
  rate: number;
  monthly: number;
  color: string;
}

interface Props {
  loanAmount: number;
  years: number;
  banks: BankRate[];
  bestRate: number;
  worstRate: number;
  bestMonthly: number;
  worstMonthly: number;
  totalDifference: number;
}

const ChartIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-4 4 4 5-6" />
  </svg>
);

export function RateComparisonWidget({
  loanAmount, years, banks, bestRate, worstRate, bestMonthly, worstMonthly, totalDifference,
}: Props) {
  const minRate = bestRate;
  const maxRate = worstRate;
  const spread = maxRate - minRate || 0.001;

  return (
    <WidgetCard label="Porovnání úrokových sazeb" icon={ChartIcon}>
      <div className="text-[13px] text-gray-500 mb-3">
        Úvěr {formatCZK(loanAmount)} na {years} let
      </div>

      <div className="flex flex-col gap-2">
        {banks.map((bank, i) => {
          const diff = bank.monthly - bestMonthly;
          const barPct = 20 + ((bank.rate - minRate) / spread) * 80;
          return (
            <div
              key={bank.label}
              className={`p-3 rounded-xl border transition-all animate-in slide-in-from-bottom-1 fade-in ${
                i === 0
                  ? 'bg-[#FFF0F5] border-[#E91E63]/15'
                  : 'bg-gray-50 border-gray-100'
              }`}
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: bank.color }}
                  />
                  <span className={`text-xs ${i === 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {bank.label}
                  </span>
                  {i === 0 && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-wider font-medium">
                      Nejlepší
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                  {formatPercent(bank.rate)}
                </span>
              </div>

              <div className="h-[3px] rounded-full bg-gray-100 mb-1.5">
                <div
                  className="h-full rounded-full transition-all duration-400"
                  style={{
                    width: `${100 - barPct + 20}%`,
                    backgroundColor: bank.color,
                    opacity: 0.7,
                  }}
                />
              </div>

              <div className="flex justify-between">
                <span className="text-[11px] text-gray-500">
                  Splátka: {formatCZK(bank.monthly)}/měs
                </span>
                {diff > 0 && (
                  <span className="text-[11px] text-gray-400">
                    +{formatCZK(Math.round(diff))}/měs
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
        <span className="text-[11px] text-gray-500">Rozdíl nejlepší vs nejhorší: </span>
        <span className="text-[13px] text-gray-900 font-semibold">{formatCZK(totalDifference)}</span>
        <span className="text-[11px] text-gray-500"> za celou dobu</span>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Sazby vycházejí z aktuálních průměrů ČNB. Konkrétní nabídka závisí na vašem profilu.
          Zkušený poradce se dokáže dostat i pod nejnižší uvedenou sazbu.
        </p>
      </div>
    </WidgetCard>
  );
}
