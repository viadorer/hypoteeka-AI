'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateAnnuity, calculateTotalInterest, DEFAULTS } from '@/lib/calculations';

interface Props {
  propertyPrice: number;
  equity: number;
  rate?: number;
  years?: number;
}

export function PaymentWidget({ propertyPrice, equity, rate, years }: Props) {
  const rateVal = rate ?? DEFAULTS.rate;
  const yearsVal = years ?? DEFAULTS.years;
  const loanAmount = propertyPrice - equity;
  const monthly = calculateAnnuity(loanAmount, rateVal, yearsVal * 12);
  const totalInterest = calculateTotalInterest(monthly, loanAmount, yearsVal * 12);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-8 h-[3px] rounded-full bg-gray-900 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Splátka hypotéky
      </p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">
        {formatCZK(Math.round(monthly))}
        <span className="text-base font-normal text-gray-400 ml-1">/ měsíc</span>
      </p>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Výše úvěru</span>
          <span className="font-medium text-gray-900">{formatCZK(loanAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Úroková sazba</span>
          <span className="font-medium text-gray-900">{formatPercent(rateVal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">RPSN</span>
          <span className="font-medium text-gray-900">{formatPercent(DEFAULTS.rpsn)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Splatnost</span>
          <span className="font-medium text-gray-900">{yearsVal} let</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
          <span className="text-gray-500">Celkem na úrocích</span>
          <span className="font-medium text-gray-900">{formatCZK(Math.round(totalInterest))}</span>
        </div>
      </div>
    </div>
  );
}
