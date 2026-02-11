'use client';

import { formatPercent } from '@/lib/format';
import { checkEligibility } from '@/lib/calculations';

interface Props {
  propertyPrice: number;
  equity: number;
  monthlyIncome: number;
  isYoung?: boolean;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full mr-2 ${
        ok ? 'bg-emerald-500' : 'bg-red-500'
      }`}
    />
  );
}

export function EligibilityWidget({ propertyPrice, equity, monthlyIncome, isYoung }: Props) {
  const result = checkEligibility(propertyPrice, equity, monthlyIncome, isYoung);

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className={`w-8 h-[3px] rounded-full mb-4 ${result.allOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Bonita CNB
      </p>

      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
        result.allOk
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-700'
      }`}>
        <StatusDot ok={result.allOk} />
        {result.allOk ? 'Splňujete limity ČNB' : 'Nesplňujete limity ČNB'}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">LTV</span>
          <span className={`font-medium ${result.ltvOk ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatPercent(result.ltvValue)} {result.ltvOk ? 'OK' : 'X'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">DSTI</span>
          <span className={`font-medium ${result.dstiOk ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatPercent(result.dstiValue)} {result.dstiOk ? 'OK' : 'X'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">DTI</span>
          <span className={`font-medium ${result.dtiOk ? 'text-emerald-600' : 'text-red-600'}`}>
            {result.dtiValue.toFixed(1).replace('.', ',')}x {result.dtiOk ? 'OK' : 'X'}
          </span>
        </div>
      </div>

      {!result.allOk && result.reasons.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          {result.reasons.map((r, i) => (
            <p key={i}>{r}</p>
          ))}
        </div>
      )}

      {result.allOk && (
        <a
          href="https://prescoring.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full text-center bg-[#E91E63] hover:bg-[#C2185B] text-white font-medium py-3 px-4 rounded-xl transition-colors text-sm"
        >
          Získat certifikát pro banku
        </a>
      )}
    </div>
  );
}
