'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateRefinance, DEFAULTS } from '@/lib/calculations';

interface Props {
  remainingBalance: number;
  currentRate: number;
  newRate?: number;
  remainingYears: number;
}

export function RefinanceWidget({ remainingBalance, currentRate, newRate, remainingYears }: Props) {
  const result = calculateRefinance(remainingBalance, currentRate, newRate ?? DEFAULTS.rate, remainingYears);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-8 h-[3px] rounded-full bg-cyan-500 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Refinancování
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Stávající splátka</p>
          <p className="text-xl font-bold text-gray-900">{formatCZK(result.currentPayment)}</p>
          <p className="text-xs text-gray-400 mt-1">{formatPercent(currentRate)} p.a.</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Nová splátka</p>
          <p className="text-xl font-bold text-emerald-600">{formatCZK(result.newPayment)}</p>
          <p className="text-xs text-gray-400 mt-1">{formatPercent(newRate ?? DEFAULTS.rate)} p.a.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Měsíční úspora</span>
          <span className={`font-medium ${result.monthlySaving > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {result.monthlySaving > 0 ? '+' : ''}{formatCZK(result.monthlySaving)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Celková úspora</span>
          <span className={`font-medium ${result.totalSaving > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {result.totalSaving > 0 ? '+' : ''}{formatCZK(result.totalSaving)}
          </span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
          <span className="text-gray-500">Zbývající splatnost</span>
          <span className="font-medium text-gray-900">{remainingYears} let</span>
        </div>
      </div>
    </div>
  );
}
