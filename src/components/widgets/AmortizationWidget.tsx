'use client';

import { formatCZK } from '@/lib/format';
import { calculateAmortization, DEFAULTS } from '@/lib/calculations';

interface Props {
  loanAmount: number;
  rate?: number;
  years?: number;
}

export function AmortizationWidget({ loanAmount, rate, years }: Props) {
  const rateVal = rate ?? DEFAULTS.rate;
  const yearsVal = years ?? DEFAULTS.years;
  const rows = calculateAmortization(loanAmount, rateVal, yearsVal * 12);

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
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-indigo-500 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Průběh splácení
      </p>

      <div className="flex gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500" />
          <span className="text-gray-500">Splacená jistina</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-200" />
          <span className="text-gray-500">Zbývající dluh</span>
        </div>
      </div>

      <div className="flex items-end gap-[2px] h-32">
        {yearlyData.map((d) => {
          const principalH = (d.principalPaid / maxVal) * 100;
          const balanceH = (d.balance / maxVal) * 100;
          return (
            <div key={d.year} className="flex-1 flex flex-col justify-end h-full group relative">
              <div
                className="bg-gray-200 rounded-t-sm transition-all"
                style={{ height: `${balanceH}%` }}
              />
              <div
                className="bg-indigo-500 rounded-b-sm transition-all"
                style={{ height: `${principalH}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                Rok {d.year}: {formatCZK(d.balance)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>1</span>
        <span>{Math.floor(yearsVal / 2)}</span>
        <span>{yearsVal} let</span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Měsíční splátka</span>
          <span className="font-medium text-gray-900">{formatCZK(rows[0]?.payment ?? 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Celkem zaplaceno</span>
          <span className="font-medium text-gray-900">{formatCZK((rows[0]?.payment ?? 0) * rows.length)}</span>
        </div>
      </div>
    </div>
  );
}
