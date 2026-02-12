'use client';

import { formatCZK, formatPercent } from '@/lib/format';
import { calculateAnnuity, calculateTotalInterest, DEFAULTS } from '@/lib/calculations';

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

export function PaymentWidget({ propertyPrice, equity, rate, rpsn, years, scenarios, saving, monthlySaving }: Props) {
  const yearsVal = years ?? DEFAULTS.years;
  const loanAmount = propertyPrice - equity;

  // Fallback for old format (no scenarios)
  if (!scenarios) {
    const rateVal = rate ?? DEFAULTS.rate;
    const monthly = calculateAnnuity(loanAmount, rateVal, yearsVal * 12);
    const totalInterest = calculateTotalInterest(monthly, loanAmount, yearsVal * 12);
    return (
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
        <div className="w-8 h-[3px] rounded-full bg-gray-900 mb-4" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Splátka hypotéky</p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight truncate">
          {formatCZK(Math.round(monthly))}
          <span className="text-sm md:text-base font-normal text-gray-400 ml-1">/ měsíc</span>
        </p>
        <div className="mt-4 space-y-2">
          <Row label="Výše úvěru" value={formatCZK(loanAmount)} />
          <Row label="Úroková sazba" value={formatPercent(rateVal)} />
          <Row label="Splatnost" value={`${yearsVal} let`} />
          <div className="pt-2 border-t border-gray-100">
            <Row label="Celkem na úrocích" value={formatCZK(Math.round(totalInterest))} />
          </div>
        </div>
      </div>
    );
  }

  const { high, avg, our } = scenarios;

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-gray-900 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        Splátka hypotéky
      </p>
      <div className="flex justify-between items-baseline mb-4">
        <p className="text-sm text-gray-500">
          Úvěr {formatCZK(loanAmount)} na {yearsVal} let
        </p>
      </div>

      {/* 3 scenario columns */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {/* High rate - muted */}
        <ScenarioCard
          label="Bez vyjednávání"
          rate={high.rate}
          monthly={high.monthly}
          totalInterest={high.totalInterest}
          variant="muted"
        />
        {/* Average market */}
        <ScenarioCard
          label="Průměr trhu"
          rate={avg.rate}
          monthly={avg.monthly}
          totalInterest={avg.totalInterest}
          variant="default"
        />
        {/* Our rate - highlighted */}
        <ScenarioCard
          label="S naším poradcem"
          rate={our.rate}
          monthly={our.monthly}
          totalInterest={our.totalInterest}
          variant="highlight"
        />
      </div>

      {/* Saving callout */}
      {(saving ?? 0) > 0 && (
        <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <p className="text-sm font-semibold text-emerald-800">
            Úspora s odborníkem: {formatCZK(monthlySaving ?? 0)}/měsíc
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Celkem {formatCZK(saving ?? 0)} za dobu splácení
          </p>
        </div>
      )}

      {/* CTA message */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          Konečná sazba závisí na mnoha faktorech -- výše úvěru, LTV, typ příjmu, nemovitost, pojištění.
          Zkušený poradce vyjedná podmínky, které v online kalkulačce nenajdete.
        </p>
      </div>
    </div>
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
      monthly: 'text-gray-900',
      interest: 'text-gray-500',
    },
    highlight: {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      label: 'text-[#E91E63]',
      rate: 'text-[#E91E63]',
      monthly: 'text-gray-900',
      interest: 'text-gray-500',
    },
  }[variant];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-2.5 md:p-3 text-center`}>
      <p className={`text-[10px] md:text-[11px] font-semibold uppercase tracking-wider ${styles.label} mb-1.5 leading-tight min-h-[28px] flex items-center justify-center`}>
        {label}
      </p>
      <p className={`text-sm md:text-base font-bold ${styles.rate}`}>
        {formatPercent(rate)}
      </p>
      <p className={`text-base md:text-lg font-bold ${styles.monthly} mt-1 truncate`}>
        {formatCZK(monthly)}
      </p>
      <p className="text-[10px] text-gray-400 -mt-0.5">/ měsíc</p>
      <p className={`text-[10px] ${styles.interest} mt-1.5`}>
        Úroky: {formatCZK(totalInterest)}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
