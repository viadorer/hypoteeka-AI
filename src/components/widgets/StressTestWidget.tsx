'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateStressTest, DEFAULTS } from '@/lib/calculations';

interface Props {
  loanAmount: number;
  rate?: number;
  years?: number;
}

export function StressTestWidget({ loanAmount, rate, years }: Props) {
  const rateVal = rate ?? DEFAULTS.rate;
  const yearsVal = years ?? DEFAULTS.years;
  const result = calculateStressTest(loanAmount, rateVal, yearsVal);

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-amber-500 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        Stress test
      </p>
      <p className="text-xs text-gray-400 mb-4">
        Co když sazba vzroste po refixaci?
      </p>

      <div className="space-y-0 rounded-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 gap-0 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          <span>Sazba</span>
          <span className="text-right">Splátka</span>
          <span className="text-right">Rozdíl</span>
        </div>

        {/* Base row */}
        <div className="grid grid-cols-3 gap-0 px-3 py-2.5 border-t border-gray-50 bg-green-50/50">
          <span className="text-sm font-medium text-gray-900">
            {formatPercent(result.baseRate)}
          </span>
          <span className="text-sm font-medium text-gray-900 text-right">
            {formatCZK(result.basePayment)}
          </span>
          <span className="text-sm text-green-600 text-right font-medium">
            aktuální
          </span>
        </div>

        {/* Scenario rows */}
        {result.scenarios.map((s) => {
          const severity = s.rateChange <= 0.01 ? 'text-amber-600' : s.rateChange <= 0.02 ? 'text-orange-600' : 'text-red-600';
          const bg = s.rateChange <= 0.01 ? 'bg-amber-50/30' : s.rateChange <= 0.02 ? 'bg-orange-50/30' : 'bg-red-50/30';
          return (
            <div key={s.rateChange} className={`grid grid-cols-3 gap-0 px-3 py-2.5 border-t border-gray-50 ${bg}`}>
              <span className="text-sm text-gray-900">
                {formatPercent(s.newRate)}
                <span className="text-[10px] text-gray-400 ml-1">+{(s.rateChange * 100).toFixed(0)}pp</span>
              </span>
              <span className="text-sm text-gray-900 text-right">
                {formatCZK(s.monthlyPayment)}
              </span>
              <span className={`text-sm text-right font-medium ${severity}`}>
                +{formatCZK(s.difference)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total cost comparison */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">Celkem při aktuální sazbě</span>
          <span className="font-medium text-gray-900">{formatCZK(result.baseTotalCost)}</span>
        </div>
        {result.scenarios.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Celkem při +{(result.scenarios[result.scenarios.length - 1].rateChange * 100).toFixed(0)}pp</span>
            <span className="font-medium text-red-600">
              {formatCZK(result.scenarios[result.scenarios.length - 1].totalCost)}
              <span className="text-[10px] text-red-400 ml-1">
                (+{formatCZK(result.scenarios[result.scenarios.length - 1].totalCost - result.baseTotalCost)})
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
