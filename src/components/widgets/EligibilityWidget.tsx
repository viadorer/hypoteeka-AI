'use client';

import { formatPercent } from '@/lib/format';
import { checkEligibility } from '@/lib/calculations';
import { WidgetCard, StatusDot, ResultRow, CtaButton } from './shared';

interface Props {
  propertyPrice: number;
  equity: number;
  monthlyIncome: number;
  isYoung?: boolean;
}

const ShieldIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export function EligibilityWidget({ propertyPrice, equity, monthlyIncome, isYoung }: Props) {
  const result = checkEligibility(propertyPrice, equity, monthlyIncome, isYoung);

  return (
    <WidgetCard label="Bonita ČNB" icon={ShieldIcon}>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium mb-4 ${
        result.allOk
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border border-red-500/20 text-red-400'
      }`}>
        <StatusDot ok={result.allOk} />
        {result.allOk ? 'Splňujete limity ČNB' : 'Nesplňujete limity ČNB'}
      </div>

      <div className="space-y-2.5">
        <ResultRow
          label="LTV"
          value={`${formatPercent(result.ltvValue)} ${result.ltvOk ? 'OK' : 'X'}`}
          valueColor={result.ltvOk ? 'text-emerald-400' : 'text-red-400'}
        />
        <ResultRow
          label="DSTI"
          value={`${formatPercent(result.dstiValue)} ${result.dstiOk ? 'OK' : 'X'}`}
          valueColor={result.dstiOk ? 'text-emerald-400' : 'text-red-400'}
        />
        <ResultRow
          label="DTI"
          value={`${result.dtiValue.toFixed(1).replace('.', ',')}x ${result.dtiOk ? 'OK' : 'X'}`}
          valueColor={result.dtiOk ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>

      {!result.allOk && result.reasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] text-[11px] text-white/35 space-y-1">
          {result.reasons.map((r, i) => (
            <p key={i}>{r}</p>
          ))}
        </div>
      )}

      {result.allOk && (
        <CtaButton href="https://prescoring.com">
          Získat certifikát pro banku
        </CtaButton>
      )}
    </WidgetCard>
  );
}
