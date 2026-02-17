'use client';

import { useState, useMemo } from 'react';
import { formatCZK, formatPercent } from '@/lib/format';
import { calculateAnnuity, calculateTotalInterest, DEFAULTS } from '@/lib/calculations';
import { WidgetCard, ResultRow, SliderInput, Divider } from './shared';

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
  const initYears = years ?? DEFAULTS.years;
  const initEquity = equity;

  const [adjYears, setAdjYears] = useState(initYears);
  const [adjEquity, setAdjEquity] = useState(initEquity);

  const loanAmount = propertyPrice - adjEquity;

  // Recalculate scenarios with adjusted values
  const computed = useMemo(() => {
    if (!scenarios) {
      const rateVal = rate ?? DEFAULTS.rate;
      const monthly = calculateAnnuity(loanAmount, rateVal, adjYears * 12);
      const totalInterest = calculateTotalInterest(monthly, loanAmount, adjYears * 12);
      return { mode: 'simple' as const, rateVal, monthly, totalInterest, loanAmount };
    }

    const recalc = (r: number) => {
      const m = calculateAnnuity(loanAmount, r, adjYears * 12);
      const ti = calculateTotalInterest(m, loanAmount, adjYears * 12);
      return { monthly: Math.round(m), totalInterest: Math.round(ti) };
    };

    const high = { ...scenarios.high, ...recalc(scenarios.high.rate) };
    const avg = { ...scenarios.avg, ...recalc(scenarios.avg.rate) };
    const our = { ...scenarios.our, ...recalc(scenarios.our.rate) };
    const newSaving = high.totalInterest - our.totalInterest;
    const newMonthlySaving = high.monthly - our.monthly;

    return { mode: 'scenarios' as const, high, avg, our, saving: newSaving, monthlySaving: newMonthlySaving, loanAmount };
  }, [loanAmount, adjYears, scenarios, rate]);

  const equityMax = Math.min(propertyPrice * 0.9, propertyPrice);
  const equityStep = propertyPrice > 5000000 ? 100000 : propertyPrice > 1000000 ? 50000 : 10000;

  return (
    <WidgetCard label="Splátka hypotéky" icon={HomeIcon}>
      {/* Sliders */}
      <SliderInput
        label="Vlastní zdroje"
        value={adjEquity}
        min={0}
        max={equityMax}
        step={equityStep}
        onChange={setAdjEquity}
        formatValue={(v) => formatCZK(v)}
      />
      <SliderInput
        label="Splatnost"
        value={adjYears}
        min={5}
        max={30}
        step={1}
        onChange={setAdjYears}
        suffix=" let"
      />

      <div className="text-sm text-gray-500 mb-3">
        Úvěr {formatCZK(loanAmount)} na {adjYears} let
      </div>

      {computed.mode === 'simple' ? (
        <>
          <div className="space-y-2">
            <ResultRow label="Měsíční splátka" value={formatCZK(Math.round(computed.monthly))} />
            <ResultRow label="Výše úvěru" value={formatCZK(computed.loanAmount)} />
            <ResultRow label="Celkem na úrocích" value={formatCZK(Math.round(computed.totalInterest))} valueColor="text-red-600" />
            <Divider />
            <ResultRow label="Úroková sazba" value={formatPercent(computed.rateVal)} />
          </div>
        </>
      ) : (
        <>
          {/* 3 scenario columns */}
          <div className="grid grid-cols-3 gap-1.5">
            <ScenarioCard label="Nejvyšší na trhu" rate={computed.high.rate} monthly={computed.high.monthly} totalInterest={computed.high.totalInterest} variant="muted" />
            <ScenarioCard label="Průměr trhu" rate={computed.avg.rate} monthly={computed.avg.monthly} totalInterest={computed.avg.totalInterest} variant="default" />
            <ScenarioCard label="Nejnižší na trhu" rate={computed.our.rate} monthly={computed.our.monthly} totalInterest={computed.our.totalInterest} variant="highlight" />
          </div>

          {/* Saving callout */}
          {computed.saving > 0 && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-sm font-medium text-emerald-700">
                Rozdíl: {formatCZK(computed.monthlySaving)}/měsíc
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                {formatCZK(computed.saving)} za celou dobu splácení
              </p>
            </div>
          )}
        </>
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
