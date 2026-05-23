'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { calculateAnnuity, calculateLTV, calculateDSTI, calculateDTI, DEFAULTS } from '@/lib/calculations';
import { formatCZK, formatPercent } from '@/lib/format';
import { SliderInput } from '@/components/widgets/shared';
import { trackEvent } from '@/lib/analytics';

interface Props {
  tenantTitle: string;
  logoUrl: string;
  initialRate: number; // ČNB rate in % (e.g. 4.5)
  rpsn: number;
  ratesDate: string;
}

const TERMS: Array<{ value: number; label: string }> = [
  { value: 15, label: '15 let' },
  { value: 20, label: '20 let' },
  { value: 30, label: '30 let' },
];

export function CalculatorClient({ tenantTitle, logoUrl, initialRate, rpsn, ratesDate }: Props) {
  const [price, setPrice] = useState(5_000_000);
  const [equityPct, setEquityPct] = useState(20);
  const [years, setYears] = useState(30);
  const [income, setIncome] = useState(60_000);
  const [isYoung, setIsYoung] = useState(false);

  const rate = initialRate / 100; // 0.045

  const calc = useMemo(() => {
    const equity = price * (equityPct / 100);
    const loan = Math.max(0, price - equity);
    const monthly = calculateAnnuity(loan, rate, years * 12);
    const totalPaid = monthly * years * 12;
    const totalInterest = totalPaid - loan;
    const ltv = calculateLTV(loan, price);
    const dsti = calculateDSTI(monthly, income);
    const dti = calculateDTI(loan, income * 12);

    const ltvLimit = isYoung ? DEFAULTS.ltvLimitYoung : DEFAULTS.ltvLimit;
    const dstiOk = dsti <= DEFAULTS.dstiLimit;
    const dtiOk = dti <= DEFAULTS.dtiLimit;
    const ltvOk = ltv <= ltvLimit;
    const allOk = dstiOk && dtiOk && ltvOk;

    return { equity, loan, monthly, totalPaid, totalInterest, ltv, dsti, dti, dstiOk, dtiOk, ltvOk, allOk, ltvLimit };
  }, [price, equityPct, years, rate, income, isYoung]);

  // Dynamic Hugo tip based on current state
  const hugoTip = useMemo(() => {
    if (!calc.ltvOk) {
      return `LTV ${formatPercent(calc.ltv)} překračuje limit ${formatPercent(calc.ltvLimit)}. Zvyšte vlastní zdroje, nebo využijte stavební spoření na doplnění.`;
    }
    if (!calc.dstiOk) {
      return `Splátka je ${formatPercent(calc.dsti)} z příjmu (limit 45 %). Zkuste delší splatnost nebo nižší cenu.`;
    }
    if (equityPct < 20 && !isYoung) {
      return 'Zvýšení vlastních zdrojů na 20 % vám může otevřít nižší sazbu u většiny bank.';
    }
    if (equityPct >= 30) {
      return 'Vlastní zdroje 30 %+ vám otevírají prémiové sazby a snižují celkové úroky o stovky tisíc.';
    }
    if (years === 30 && income > 80_000) {
      return 'Při vašem příjmu by 20letá splatnost znamenala vyšší splátku, ale o ~30 % nižší úroky celkem.';
    }
    return calc.allOk
      ? 'Splňujete všechny limity ČNB. Můžeme rovnou připravit nabídku 8+ bank.'
      : 'Procházíme limity. Vše vyřešíme společně s Davidem.';
  }, [calc, equityPct, isYoung, years, income]);

  const handleContinue = () => {
    trackEvent('calculator_continue_to_chat', { price, equityPct, years });
    const message = encodeURIComponent(
      `Mám zájem o byt za ${formatCZK(price)}, mám ${formatCZK(calc.equity)} vlastních zdrojů, ${formatCZK(income)} čistý měsíční příjem.`,
    );
    window.location.href = `/?prefill=${message}`;
  };

  return (
    <div className="min-h-screen bg-surface pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20">
        <div className="max-w-[900px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center overflow-hidden shadow-soft">
              <Image src={logoUrl} alt={tenantTitle} width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <span className="text-headline-md font-bold text-on-surface hidden sm:block">{tenantTitle}</span>
          </Link>
          <Link
            href="/"
            className="text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Zpět
          </Link>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-4 pt-8">
        {/* Title */}
        <div className="mb-8 text-center">
          <span className="text-label-md text-on-surface-variant uppercase tracking-widest block mb-2">
            Kalkulačka hypotéky
          </span>
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">
            Spočítejte si splátku za 2 minuty
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Aktuální sazba {initialRate}% (5-letá fixace, ČNB ARAD · {ratesDate})
          </p>
        </div>

        {/* Calculator Card */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-soft p-6 md:p-8 space-y-6 border border-outline-variant/15">
          {/* Property Price */}
          <SliderInput
            label="Cena nemovitosti"
            value={price}
            min={500_000}
            max={20_000_000}
            step={100_000}
            onChange={setPrice}
            formatValue={(v) => formatCZK(v)}
          />

          {/* Down payment percentage */}
          <SliderInput
            label="Vlastní zdroje"
            value={equityPct}
            min={5}
            max={50}
            step={1}
            onChange={setEquityPct}
            formatValue={(v) => `${v} % (${formatCZK(price * (v / 100))})`}
          />

          {/* Monthly income */}
          <SliderInput
            label="Čistý měsíční příjem"
            value={income}
            min={20_000}
            max={300_000}
            step={1_000}
            onChange={setIncome}
            formatValue={(v) => formatCZK(v)}
          />

          {/* Term selection */}
          <div className="space-y-3">
            <label className="text-label-sm text-on-surface-variant/60 font-bold uppercase tracking-wider block">
              Doba splatnosti
            </label>
            <div className="grid grid-cols-3 gap-3">
              {TERMS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setYears(t.value)}
                  className={`py-3 px-4 rounded-2xl border-2 text-label-md font-semibold transition-all ${
                    years === t.value
                      ? 'border-primary bg-primary-fixed text-primary'
                      : 'border-outline-variant/30 hover:border-primary/50 text-on-surface-variant'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Young buyer flag */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isYoung}
              onChange={(e) => setIsYoung(e.target.checked)}
              className="w-5 h-5 rounded accent-primary"
            />
            <span className="text-label-md text-on-surface-variant">
              Jsem mladší 36 let (vyšší LTV 90 %)
            </span>
          </label>
        </div>

        {/* Hugo AI tip */}
        <div className="mt-6 flex gap-4 items-start p-5 bg-surface-container-high rounded-2xl border-l-4 border-primary shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined filled text-white" style={{ fontSize: 20 }}>smart_toy</span>
          </div>
          <div className="space-y-1">
            <p className="text-label-sm text-primary uppercase tracking-wider font-bold">Hugo AI tip</p>
            <p className="text-body-md text-on-surface-variant">
              {hugoTip}
            </p>
          </div>
        </div>

        {/* Eligibility indicators */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-2xl ${calc.ltvOk ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">LTV</div>
            <div className={`text-headline-md font-semibold ${calc.ltvOk ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatPercent(calc.ltv)}
            </div>
            <div className="text-label-sm text-on-surface-variant/60 normal-case tracking-normal">
              limit {formatPercent(calc.ltvLimit)}
            </div>
          </div>
          <div className={`p-4 rounded-2xl ${calc.dstiOk ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">DSTI</div>
            <div className={`text-headline-md font-semibold ${calc.dstiOk ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatPercent(calc.dsti)}
            </div>
            <div className="text-label-sm text-on-surface-variant/60 normal-case tracking-normal">limit 45 %</div>
          </div>
          <div className={`p-4 rounded-2xl ${calc.dtiOk ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">DTI</div>
            <div className={`text-headline-md font-semibold ${calc.dtiOk ? 'text-emerald-700' : 'text-red-700'}`}>
              {calc.dti.toFixed(1)}×
            </div>
            <div className="text-label-sm text-on-surface-variant/60 normal-case tracking-normal">limit 9,5×</div>
          </div>
        </div>

        {/* Big result */}
        <div className="mt-8 bg-on-surface text-white p-6 md:p-8 rounded-3xl shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/30 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="relative z-10">
            <p className="text-label-md text-surface-variant mb-2">Měsíční splátka</p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[40px] md:text-[48px] font-bold leading-none tracking-tight tabular-nums">
                {formatCZK(Math.round(calc.monthly))}
              </span>
              <span className="text-label-md text-surface-variant">/měsíc</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6 text-label-md">
              <div>
                <p className="text-surface-variant/70 mb-1">Vyše úvěru</p>
                <p className="font-semibold tabular-nums">{formatCZK(Math.round(calc.loan))}</p>
              </div>
              <div>
                <p className="text-surface-variant/70 mb-1">Celkem na úrocích</p>
                <p className="font-semibold tabular-nums">{formatCZK(Math.round(calc.totalInterest))}</p>
              </div>
            </div>
            <p className="text-label-sm text-surface-variant/70 mb-5 normal-case tracking-normal">
              Sazba {initialRate}% · RPSN {rpsn}% · Pro přesný odhad zahrne David daně a pojištění.
            </p>
            <button
              onClick={handleContinue}
              className="w-full bg-primary-container text-on-primary-container py-4 rounded-2xl text-headline-md font-bold active:scale-95 transition-transform shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Pokračovat s Hugem
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-label-sm text-on-surface-variant/60 text-center mt-8 normal-case tracking-normal max-w-md mx-auto">
          Výpočet je orientační. Skutečnou nabídku připraví David Choc — specialista Quadrum a vázaný zástupce SAB servis pro spotřebitelské úvěry dle § 257/2016 Sb.
        </p>
      </main>
    </div>
  );
}

