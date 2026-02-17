'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateAnnuity, calculateTotalInterest, DEFAULTS } from '@/lib/calculations';
import { WidgetCard, ResultPanel, ResultBox, ResultRow, RatioBar, Divider } from './shared';

interface Scenario {
  rate: number;
  monthly: number;
  totalInterest: number;
  label: string;
}

interface Props {
  propertyPrice: number;
  equity: number;
  rate?: number;
  rpsn?: number;
  years?: number;
  scenarios?: {
    high: Scenario;
    avg: Scenario;
    our: Scenario;
  };
  saving?: number;
  monthlySaving?: number;
}

const HomeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export function PaymentWidget({ propertyPrice, equity, rate, rpsn, years, scenarios, saving, monthlySaving }: Props) {
  const yearsVal = years ?? DEFAULTS.years;
  const loanAmount = propertyPrice - equity;

  // Fallback for old format (no scenarios)
  if (!scenarios) {
    const rateVal = rate ?? DEFAULTS.rate;
    const monthly = calculateAnnuity(loanAmount, rateVal, yearsVal * 12);
    const totalInterest = calculateTotalInterest(monthly, loanAmount, yearsVal * 12);
    const ratio = loanAmount / (loanAmount + totalInterest);

    return (
      <WidgetCard label="Splátka hypotéky" icon={HomeIcon}>
        <RatioBar ratio={ratio} />
        <ResultPanel>
          <div className="grid grid-cols-2 gap-3">
            <ResultBox label="Měsíční splátka" value={formatCZK(Math.round(monthly))} highlight />
            <ResultBox label="Výše úvěru" value={formatCZK(loanAmount)} />
            <ResultBox label="Celkem zaplaceno" value={formatCZK(Math.round(monthly * yearsVal * 12))} />
            <ResultBox label="Celkem na úrocích" value={formatCZK(Math.round(totalInterest))} />
          </div>
        </ResultPanel>
        <div className="mt-3 space-y-1.5">
          <ResultRow label="Úroková sazba" value={formatPercent(rateVal)} />
          <ResultRow label="Splatnost" value={`${yearsVal} let`} />
        </div>
      </WidgetCard>
    );
  }

  const { high, avg, our } = scenarios;

  return (
    <WidgetCard label="Splátka hypotéky" icon={HomeIcon}>
      <div className="text-sm text-gray-500 mb-3">
        Úvěr {formatCZK(loanAmount)} na {yearsVal} let
      </div>

      {/* 3 scenario columns */}
      <div className="grid grid-cols-3 gap-1.5">
        <ScenarioCard
          label="Nejvyšší na trhu"
          rate={high.rate}
          monthly={high.monthly}
          totalInterest={high.totalInterest}
          variant="muted"
        />
        <ScenarioCard
          label="Průměr trhu"
          rate={avg.rate}
          monthly={avg.monthly}
          totalInterest={avg.totalInterest}
          variant="default"
        />
        <ScenarioCard
          label="Nejnižší na trhu"
          rate={our.rate}
          monthly={our.monthly}
          totalInterest={our.totalInterest}
          variant="highlight"
        />
      </div>

      {/* Saving callout */}
      {(saving ?? 0) > 0 && (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-sm font-medium text-emerald-700">
            Rozdíl: {formatCZK(monthlySaving ?? 0)}/měsíc
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5">
            {formatCZK(saving ?? 0)} za celou dobu splácení
          </p>
        </div>
      )}

      {/* CTA message */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          V praxi se zkušený poradce dokáže dostat i pod nejnižší uvedenou sazbu.
          Záleží na osobních vazbách, zkušenostech s vyjednáváním a celkovém nastavení úvěru.
        </p>
      </div>
    </WidgetCard>
  );
}

function ScenarioCard({ label, rate, monthly, totalInterest, variant }: {
  label: string;
  rate: number;
  monthly: number;
  totalInterest: number;
  variant: 'muted' | 'default' | 'highlight';
}) {
  const styles = {
    muted: {
      bg: 'bg-gray-50',
      border: 'border-gray-100',
      label: 'text-gray-400',
      rate: 'text-gray-500',
      monthly: 'text-gray-600',
      interest: 'text-gray-400',
    },
    default: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      label: 'text-gray-500',
      rate: 'text-gray-700',
      monthly: 'text-gray-800',
      interest: 'text-gray-400',
    },
    highlight: {
      bg: 'bg-[#FFF0F5]',
      border: 'border-[#E91E63]/20',
      label: 'text-gray-800',
      rate: 'text-gray-900',
      monthly: 'text-gray-900',
      interest: 'text-gray-500',
    },
  }[variant];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-2 md:p-3 text-center`}>
      <p className={`text-[9px] md:text-[10px] font-medium uppercase tracking-wider ${styles.label} mb-1 leading-tight min-h-[24px] flex items-center justify-center`}>
        {label}
      </p>
      <p className={`text-xs md:text-sm font-semibold ${styles.rate}`}>
        {formatPercent(rate)}
      </p>
      <p className={`text-sm md:text-lg font-semibold ${styles.monthly} mt-0.5`}>
        {formatCZK(monthly)}
      </p>
      <p className="text-[9px] text-gray-400">/ měsíc</p>
      <p className={`text-[9px] ${styles.interest} mt-1`}>
        Úroky: {formatCZK(totalInterest)}
      </p>
    </div>
  );
}
