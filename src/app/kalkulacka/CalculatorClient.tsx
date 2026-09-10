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
}

/** Orientační výpočet je označen jako orientační (CLAUDE.md 4.4) —
 *  zaokrouhlení na desetitisíce zabrání falešné přesnosti u částky,
 *  která se sčítá přes 15–30 let. */
const roundToTen = (n: number) => Math.round(n / 10_000) * 10_000;

const TERMS: Array<{ value: number; label: string }> = [
  { value: 15, label: '15 let' },
  { value: 20, label: '20 let' },
  { value: 30, label: '30 let' },
];

export function CalculatorClient({ tenantTitle, logoUrl, initialRate }: Props) {
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
    // "Splňujete všechny limity ČNB" byl tvrzení o regulaci, které pro
    // DSTI/DTI neplatí (oba deaktivovány, viz CLAUDE.md 3.2) — LTV je jediný
    // závazný limit, zbytek je orientační hranice bank.
    return calc.allOk
      ? 'Orientačně jste v pásmu, které banky obvykle akceptují. Specialista připraví konkrétní nabídky.'
      : 'Procházíme hranice bank. Vše vyřešíme společně s Davidem.';
  }, [calc, equityPct, isYoung, years, income]);

  const handleContinue = () => {
    trackEvent('calculator_continue_to_chat', { price, equityPct, years });
    const message = encodeURIComponent(
      `Mám zájem o byt za ${formatCZK(price)}, mám ${formatCZK(calc.equity)} vlastních zdrojů, ${formatCZK(income)} čistý měsíční příjem.`,
    );
    window.location.href = `/?prefill=${message}`;
  };

  return (
    <div className="min-h-screen bg-surface pb-12 relative overflow-hidden">
      {/* Subtle apartment background */}
      <div className="fixed inset-0 z-0 opacity-[0.06] pointer-events-none">
        <Image src="/images/redesign/apartment-hero.png" alt="" fill className="object-cover" />
      </div>
      <div className="relative z-10">
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
            Aktuální sazba {formatPercent(initialRate / 100)} (5letá fixace, ČNB ARAD — poslední dostupný průměr)
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

        {/* Výsledek — jeden tmavý panel: splátka, rozpad a orientační bonita
            jako proužky. LTV je jediný závazný limit ČNB; DSTI a DTI jsou dnes
            jen hranice, které si drží banky (CLAUDE.md 3.2). */}
        <div className="mt-8 bg-on-surface text-white p-6 md:p-8 rounded-3xl shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/30 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="relative z-10">
            <p className="text-label-sm uppercase tracking-wider text-surface-variant/60 mb-3">Orientační výsledek</p>
            <p className="text-label-md text-surface-variant mb-2">Měsíční splátka</p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[40px] md:text-[48px] font-bold leading-none tracking-tight tabular-nums">
                {formatCZK(Math.round(calc.monthly))}
              </span>
              <span className="text-label-md text-surface-variant">/měsíc</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6 text-label-md border-t border-white/10 pt-4">
              <div>
                <p className="text-surface-variant/70 mb-1">Výše úvěru</p>
                <p className="font-semibold tabular-nums">{formatCZK(Math.round(calc.loan))}</p>
              </div>
              <div>
                <p className="text-surface-variant/70 mb-1">Celkem na úrocích</p>
                {/* Zaokrouhleno na desetitisíce — u orientačního výpočtu za
                    15–30 let by přesnost na korunu byla falešná (CLAUDE.md 4.4). */}
                <p className="font-semibold tabular-nums">≈ {formatCZK(roundToTen(calc.totalInterest))}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {[
                {
                  label: 'LTV',
                  note: '(limit ČNB)',
                  value: formatPercent(calc.ltv),
                  ratio: calc.ltv / (calc.ltvLimit * 1.35),
                  ok: calc.ltvOk,
                  caption: `Závazný limit ČNB: ${formatPercent(calc.ltvLimit)}${isYoung ? ' (do 36 let)' : ''}`,
                },
                {
                  label: 'DSTI',
                  note: '(orientační hranice bank)',
                  value: formatPercent(calc.dsti),
                  ratio: calc.dsti / (DEFAULTS.dstiLimit * 1.35),
                  ok: calc.dstiOk,
                  caption: 'Regulatorní limit ČNB je deaktivován; banky obvykle chtějí do 45 %.',
                },
                {
                  label: 'DTI',
                  note: '(orientační hranice bank)',
                  value: `${calc.dti.toFixed(1).replace('.', ',')}×`,
                  ratio: calc.dti / (DEFAULTS.dtiLimit * 1.35),
                  ok: calc.dtiOk,
                  caption: 'Regulatorní limit ČNB je deaktivován; banky obvykle chtějí do 8,5×.',
                },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between items-baseline text-label-sm mb-1.5 normal-case tracking-normal">
                    <span className="text-surface-variant/70">
                      {m.label} <span className="opacity-60">{m.note}</span>
                    </span>
                    <b className="tabular-nums font-semibold">{m.value}</b>
                  </div>
                  <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                    <span
                      className={`block h-full rounded-full transition-all ${m.ok ? 'bg-primary-fixed' : 'bg-primary-fixed-dim'}`}
                      style={{ width: `${Math.min(Math.max(m.ratio, 0), 1) * 100}%` }}
                    />
                  </div>
                  <p className="text-label-sm text-surface-variant/50 mt-1 normal-case tracking-normal">{m.caption}</p>
                </div>
              ))}
            </div>

            <p className="text-label-sm text-surface-variant/70 mb-5 normal-case tracking-normal">
              Sazba {formatPercent(initialRate / 100)} · orientační výpočet bez daní a pojištění. RPSN a přesné poplatky
              najdete u konkrétní nabídky — viz{' '}
              <Link href="/nabidky#reprezentativni-priklad" className="underline hover:text-white">
                reprezentativní příklad
              </Link>
              .
            </p>
            <button
              onClick={handleContinue}
              className="w-full bg-primary-container text-on-primary-container py-4 rounded-2xl text-headline-md font-bold active:scale-95 transition-transform shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Probrat výsledek s Hugem
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-label-sm text-on-surface-variant/60 text-center mt-8 normal-case tracking-normal max-w-md mx-auto">
          Výpočet je orientační. Skutečnou nabídku připraví David Choc — specialista Quadrum a vázaný zástupce SAB servis pro spotřebitelské úvěry dle zákona č. 257/2016 Sb.
        </p>
      </main>
      </div>
    </div>
  );
}

