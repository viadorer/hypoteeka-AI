'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateInvestment } from '@/lib/calculations';

interface Props {
  purchasePrice: number;
  equity: number;
  monthlyRentalIncome: number;
  monthlyExpenses?: number;
}

export function InvestmentWidget({ purchasePrice, equity, monthlyRentalIncome, monthlyExpenses }: Props) {
  const result = calculateInvestment(purchasePrice, equity, monthlyRentalIncome, monthlyExpenses);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-8 h-[3px] rounded-full bg-amber-500 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Investiční analýza
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Měsíční cash flow</p>
          <p className={`text-xl font-bold ${result.monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {result.monthlyCashFlow >= 0 ? '+' : ''}{formatCZK(result.monthlyCashFlow)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Roční cash flow</p>
          <p className={`text-xl font-bold ${result.annualCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {result.annualCashFlow >= 0 ? '+' : ''}{formatCZK(result.annualCashFlow)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Měsíční příjem z nájmu</span>
          <span className="font-medium text-gray-900">{formatCZK(result.monthlyRentalIncome)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Měsíční splátka</span>
          <span className="font-medium text-gray-900">{formatCZK(result.monthlyMortgage)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
          <span className="text-gray-500">ROI</span>
          <span className="font-medium text-gray-900">{formatPercent(result.roi)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">ROE (návratnost vlastního kapitálu)</span>
          <span className="font-medium text-gray-900">{formatPercent(result.roe)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Cap Rate</span>
          <span className="font-medium text-gray-900">{formatPercent(result.capRate)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Cash-on-Cash</span>
          <span className="font-medium text-gray-900">{formatPercent(result.cashOnCash)}</span>
        </div>
      </div>
    </div>
  );
}
