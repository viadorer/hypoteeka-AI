'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { calculateAnnuity } from '@/lib/calculations';
import { formatCZK } from '@/lib/format';
import { trackEvent } from '@/lib/analytics';

interface Props {
  tenantTitle: string;
  logoUrl: string;
  loanAmount: number;
  years: number;
  rateFix1y: number;
  rateFix5y: number;
  rateFix10y: number;
  ratesDate: string;
}

type Fixation = '1y' | '5y' | '10y';

interface BankTier {
  label: string;
  rate: number; // 0.045
  badge: 'Top sazba' | 'Rychlé schválení' | 'Nízké poplatky' | 'Široká nabídka';
  accent: 'primary' | 'secondary' | 'tertiary';
  match?: boolean; // Hugo's pick
}

export function OffersClient({
  tenantTitle,
  logoUrl,
  loanAmount,
  years,
  rateFix1y,
  rateFix5y,
  rateFix10y,
  ratesDate,
}: Props) {
  const [fixation, setFixation] = useState<Fixation>('5y');

  const baseRate = useMemo(() => {
    if (fixation === '1y') return rateFix1y / 100;
    if (fixation === '10y') return rateFix10y / 100;
    return rateFix5y / 100;
  }, [fixation, rateFix1y, rateFix5y, rateFix10y]);

  // Generate 5 anonymous bank tiers around the ČNB market rate
  // (Banka A — best, Banka E — worst). Match badge na nejlepší.
  const tiers: BankTier[] = useMemo(() => {
    const spread = 0.008; // 0.8 pp range
    const rates = [
      baseRate - spread * 0.5,
      baseRate - spread * 0.25,
      baseRate,
      baseRate + spread * 0.25,
      baseRate + spread * 0.5,
    ].sort((a, b) => a - b);
    const labels = ['Banka A', 'Banka B', 'Banka C', 'Banka D', 'Banka E'];
    const badges: BankTier['badge'][] = [
      'Top sazba',
      'Rychlé schválení',
      'Nízké poplatky',
      'Široká nabídka',
      'Rychlé schválení',
    ];
    return rates.map((r, i) => ({
      label: labels[i],
      rate: r,
      badge: badges[i],
      accent: i === 0 ? 'primary' : i === 1 ? 'secondary' : 'tertiary',
      match: i === 0,
    }));
  }, [baseRate]);

  const handleInterest = (bank: BankTier) => {
    trackEvent('offer_card_interest', { bank: bank.label, rate: bank.rate, fixation });
    const message = encodeURIComponent(
      `Mám zájem o nabídku ${bank.label} se sazbou ${(bank.rate * 100).toFixed(2)} % (fixace ${fixation}). Úvěr ${formatCZK(loanAmount)} na ${years} let.`,
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
          <Link href="/" className="text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Zpět
          </Link>
        </div>
      </header>

      <main className="max-w-[700px] mx-auto px-4 pt-8">
        {/* Title */}
        <div className="mb-8">
          <span className="text-label-md text-on-surface-variant uppercase tracking-widest block mb-2">
            Srovnání bank
          </span>
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">
            Nabídky hypoték
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Pro úvěr <strong className="text-on-surface">{formatCZK(loanAmount)}</strong> na {years} let.
            Sazby z {ratesDate} (ČNB ARAD).{' '}
            <Link href="/kalkulacka" className="text-primary hover:underline">Změnit parametry</Link>
          </p>
        </div>

        {/* Fixation filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
          {([
            { key: '1y' as Fixation, label: 'Fixace 1 rok' },
            { key: '5y' as Fixation, label: 'Fixace 5 let' },
            { key: '10y' as Fixation, label: 'Fixace 10 let' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFixation(key)}
              className={`px-5 py-2.5 rounded-full text-label-md font-semibold whitespace-nowrap transition-all ${
                fixation === key
                  ? 'bg-primary-container text-on-primary-container shadow-soft'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Offers list */}
        <div className="space-y-4">
          {tiers.map((bank) => {
            const monthly = calculateAnnuity(loanAmount, bank.rate, years * 12);
            const borderClass =
              bank.accent === 'primary'
                ? 'border-l-primary'
                : bank.accent === 'secondary'
                  ? 'border-l-secondary'
                  : 'border-l-tertiary';
            return (
              <div
                key={bank.label}
                className={`relative bg-surface-container-lowest rounded-3xl p-5 md:p-6 shadow-soft border border-outline-variant/15 border-l-4 ${borderClass} transition-all hover:shadow-premium active:scale-[0.99]`}
              >
                {/* Hugo Match badge */}
                {bank.match && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary-container text-on-primary-container text-label-sm font-bold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl flex items-center gap-1.5">
                      <span className="material-symbols-outlined filled" style={{ fontSize: 14 }}>auto_awesome</span>
                      Hugo doporučuje
                    </div>
                  </div>
                )}

                {/* Bank info + rate */}
                <div className="flex justify-between items-start mb-6 gap-4 pt-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>account_balance</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-label-md text-on-surface font-semibold">{bank.label}</p>
                      <span className="inline-block bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded text-label-sm font-bold uppercase tracking-wider mt-1">
                        {bank.badge}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-headline-md text-primary font-bold tabular-nums">{(bank.rate * 100).toFixed(2)} %</p>
                    <p className="text-label-sm text-on-surface-variant/60 normal-case tracking-normal">úroková sazba</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className={`p-4 rounded-2xl ${bank.match ? 'bg-primary-fixed' : 'bg-surface-container-low'}`}>
                    <p className="text-label-sm text-on-surface-variant/60 mb-1 normal-case tracking-normal">Měsíční splátka</p>
                    <p className={`text-headline-md font-bold tabular-nums ${bank.match ? 'text-on-primary-fixed-variant' : 'text-on-surface'}`}>
                      {formatCZK(Math.round(monthly))}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface-container-low">
                    <p className="text-label-sm text-on-surface-variant/60 mb-1 normal-case tracking-normal">Doba splatnosti</p>
                    <p className="text-headline-md text-on-surface font-bold">{years} let</p>
                  </div>
                </div>

                <button
                  onClick={() => handleInterest(bank)}
                  className="w-full py-4 bg-primary text-on-primary rounded-2xl text-headline-md font-bold active:scale-95 transition-transform shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  Mám zájem
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-label-sm text-on-surface-variant/60 text-center mt-8 normal-case tracking-normal max-w-md mx-auto">
          Sazby jsou orientační a vycházejí z průměrů ČNB ARAD. Konkrétní nabídku včetně RPSN a všech poplatků
          připraví David Choc — specialista Quadrum a vázaný zástupce SAB servis pro spotřebitelské úvěry
          dle § 257/2016 Sb.
        </p>
      </main>
    </div>
  );
}
