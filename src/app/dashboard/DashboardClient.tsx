'use client';

import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { formatCZK } from '@/lib/format';

interface SessionPreview {
  id: string;
  propertyPrice: number | null;
  purpose: string | null;
  updatedAt: string;
}

interface Props {
  firstName: string;
  tenantTitle: string;
  logoUrl: string;
  sessions: SessionPreview[];
}

function vocative(name: string): string {
  // Quick vocative for common Czech names
  if (name.endsWith('e') || name.endsWith('i')) return name;
  if (name === 'David') return 'Davide';
  if (name === 'Martin') return 'Martine';
  if (name === 'Tomáš') return 'Tomáši';
  if (name === 'Jan') return 'Jane';
  if (name === 'Jakub') return 'Jakube';
  return name + 'e';
}

export function DashboardClient({ firstName, tenantTitle, logoUrl, sessions }: Props) {
  const greeting = firstName ? `Ahoj, ${vocative(firstName)}!` : 'Vítejte zpět';
  const latestSession = sessions[0];

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Background apartment image (low opacity, premium feel) */}
      <div className="fixed inset-0 z-0 opacity-[0.08] pointer-events-none">
        <Image
          src="/images/redesign/apartment-hero.png"
          alt=""
          fill
          className="object-cover"
        />
      </div>

      <SiteHeader />

      <main className="max-w-[700px] mx-auto px-4 pt-8 pb-16 relative z-10">
        {/* Greeting */}
        <section className="mb-8">
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">{greeting}</h1>
          <p className="text-body-md text-on-surface-variant">Vítejte zpět ve vaší klientské zóně.</p>
        </section>

        {/* Stav hypotéky / Poslední konverzace */}
        <section className="bg-surface-container-lowest/90 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-soft mb-8 border border-white/50">
          <h2 className="text-headline-md text-on-surface mb-6">Stav vašeho procesu</h2>

          {latestSession ? (
            <div className="space-y-0">
              {/* Step 1: completed — chat started */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                  </div>
                  <div className="w-0.5 h-10 bg-primary" />
                </div>
                <div className="pb-6 flex-1">
                  <h3 className="text-label-md text-primary font-bold">Konverzace s Hugem</h3>
                  <p className="text-label-md text-on-surface-variant normal-case tracking-normal">
                    {new Date(latestSession.updatedAt).toLocaleDateString('cs-CZ')}
                    {latestSession.propertyPrice ? ` · ${formatCZK(latestSession.propertyPrice)}` : ''}
                  </p>
                </div>
              </div>

              {/* Step 2: current — qualification */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-primary bg-surface flex items-center justify-center text-primary relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping" />
                    <span className="material-symbols-outlined filled relative z-10" style={{ fontSize: 18 }}>hourglass_top</span>
                  </div>
                  <div className="w-0.5 h-10 bg-outline-variant/30" />
                </div>
                <div className="pb-6 flex-1">
                  <h3 className="text-label-md text-on-surface font-bold">Příprava nabídky</h3>
                  <p className="text-label-md text-on-surface-variant normal-case tracking-normal">
                    Pokračujte v chatu nebo nás kontaktujte
                  </p>
                </div>
              </div>

              {/* Step 3: future — handoff to David */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
                  </div>
                  <div className="w-0.5 h-10 bg-outline-variant/30" />
                </div>
                <div className="pb-6 flex-1">
                  <h3 className="text-label-md text-on-surface-variant">Spojení s Davidem</h3>
                  <p className="text-label-md text-on-surface-variant/60 normal-case tracking-normal">
                    Specialista vás kontaktuje
                  </p>
                </div>
              </div>

              {/* Step 4: future — approved */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-label-md text-on-surface-variant">Hypotéka schválena</h3>
                  <p className="text-label-md text-on-surface-variant/60 normal-case tracking-normal">
                    Vlastní bydlení
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-on-surface-variant/40 mb-2" style={{ fontSize: 48 }}>chat_bubble_outline</span>
              <p className="text-body-md text-on-surface-variant mb-4">Zatím jste se s Hugem nebavili.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-6 py-3 rounded-2xl font-bold text-label-md hover:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chat</span>
                Začít konverzaci
              </Link>
            </div>
          )}
        </section>

        {/* Quick actions bento */}
        <section className="mb-8">
          <h2 className="text-headline-md text-on-surface mb-4">Co můžete dělat</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/kalkulacka"
              className="bg-surface-container-high p-5 rounded-2xl flex flex-col gap-2 hover:shadow-soft active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>calculate</span>
              <p className="text-label-md text-on-surface font-bold">Kalkulačka</p>
              <p className="text-label-sm text-on-surface-variant/70 normal-case tracking-normal">Změnit parametry</p>
            </Link>
            <Link
              href="/nabidky"
              className="bg-surface-container-high p-5 rounded-2xl flex flex-col gap-2 hover:shadow-soft active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>local_offer</span>
              <p className="text-label-md text-on-surface font-bold">Sazby</p>
              <p className="text-label-sm text-on-surface-variant/70 normal-case tracking-normal">Kde se pohybuje trh</p>
            </Link>
            <Link
              href="/clanky"
              className="bg-surface-container-high p-5 rounded-2xl flex flex-col gap-2 hover:shadow-soft active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>menu_book</span>
              <p className="text-label-md text-on-surface font-bold">Články</p>
              <p className="text-label-sm text-on-surface-variant/70 normal-case tracking-normal">Vzdělávání</p>
            </Link>
            <Link
              href="/podminky"
              className="bg-surface-container-high p-5 rounded-2xl flex flex-col gap-2 hover:shadow-soft active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>privacy_tip</span>
              <p className="text-label-md text-on-surface font-bold">GDPR</p>
              <p className="text-label-sm text-on-surface-variant/70 normal-case tracking-normal">Souhlasy, podmínky</p>
            </Link>
          </div>
        </section>

        {/* Hugo card */}
        <section className="bg-surface-container/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-soft relative border border-white/30">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="p-6 md:p-8 relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative shrink-0">
                <Image
                  src="/images/redesign/hugo-portrait.png"
                  alt="Hugo"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-headline-md text-on-surface">Hugo</h3>
                  <span className="bg-primary text-white text-label-sm px-2 py-0.5 rounded-full font-bold">AI EXPERT</span>
                </div>
                <p className="text-label-md text-on-surface-variant normal-case tracking-normal">
                  AI hypoteční poradce
                </p>
              </div>
            </div>

            <p className="text-body-md text-on-surface-variant mb-6 italic">
              &ldquo;Vítej zpět! Pokud chceš pokračovat tam, kde jsme skončili, jsem připraven. Nebo se klidně zeptej na cokoliv nového.&rdquo;
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/"
                className="bg-primary text-on-primary py-3 rounded-2xl text-label-md font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-lg"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chat</span>
                Napsat zprávu
              </Link>
              <a
                href="tel:+420774052232"
                className="bg-white/80 border border-outline-variant/30 text-on-surface py-3 rounded-2xl text-label-md font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-white"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>call</span>
                Zavolat Davidovi
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
