'use client';

import { formatCZK } from '@/lib/format';
import { calculateAffordability } from '@/lib/calculations';

interface Props {
  monthlyIncome: number;
  equity: number;
  isYoung?: boolean;
}

export function AffordabilityWidget({ monthlyIncome, equity, isYoung }: Props) {
  const result = calculateAffordability(monthlyIncome, equity, isYoung);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-8 h-[3px] rounded-full bg-violet-500 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Kolik si můžete dovolit
      </p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">
        {formatCZK(result.maxPropertyPrice)}
      </p>
      <p className="text-sm text-gray-400 mt-1">maximální cena nemovitosti</p>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Maximální úvěr</span>
          <span className="font-medium text-gray-900">{formatCZK(result.maxLoan)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Vlastní zdroje</span>
          <span className="font-medium text-gray-900">{formatCZK(equity)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Měsíční splátka</span>
          <span className="font-medium text-gray-900">{formatCZK(result.monthlyPayment)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
          <span className="text-gray-500">Čistý měsíční příjem</span>
          <span className="font-medium text-gray-900">{formatCZK(monthlyIncome)}</span>
        </div>
      </div>
    </div>
  );
}
