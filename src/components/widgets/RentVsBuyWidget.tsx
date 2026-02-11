'use client';

import { formatCZK } from '@/lib/format';
import { compareRentVsBuy } from '@/lib/calculations';

interface Props {
  propertyPrice: number;
  equity: number;
  monthlyRent: number;
}

export function RentVsBuyWidget({ propertyPrice, equity, monthlyRent }: Props) {
  const result = compareRentVsBuy(propertyPrice, equity, monthlyRent);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-8 h-[3px] rounded-full bg-[#0047FF] mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Nájem vs. Hypotéka
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Měsíční nájem</p>
          <p className="text-xl font-bold text-gray-900">{formatCZK(result.monthlyRent)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Měsíční splátka</p>
          <p className="text-xl font-bold text-gray-900">{formatCZK(result.monthlyMortgage)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Rozdíl měsíčně</span>
          <span className={`font-medium ${result.difference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {result.difference > 0 ? '+' : ''}{formatCZK(result.difference)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Celkem nájem (30 let)</span>
          <span className="font-medium text-gray-900">{formatCZK(result.totalRentCost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Celkem hypotéka (30 let)</span>
          <span className="font-medium text-gray-900">{formatCZK(result.totalMortgageCost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Vlastní kapitál po 30 letech</span>
          <span className="font-medium text-emerald-600">{formatCZK(result.equityAfterYears)}</span>
        </div>
        {result.breakEvenYears && (
          <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-500">Break-even</span>
            <span className="font-medium text-[#0047FF]">{result.breakEvenYears} let</span>
          </div>
        )}
      </div>
    </div>
  );
}
