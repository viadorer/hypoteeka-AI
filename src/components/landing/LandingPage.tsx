'use client';

import Image from 'next/image';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import { SiteHeader } from '@/components/layout/SiteHeader';

interface Props {
  onStartChat: () => void;
  primaryColor: string;
  logoUrl: string;
  title: string;
  isValuation?: boolean;
}

/**
 * LandingPage v3 — redesign per stitch_modern_esk_hypot_ka/hypoteeka_ai_landing_page_2.
 *
 * Sekce v pořadí:
 * 1. Sticky header s logem (key icon) a navigací
 * 2. Hero s background image (modern apartment) + AI badge + 2 CTA
 * 3. Trust stats (4 metriky)
 * 4. Hugo portrait + intro text + "Hugo je online" badge
 * 5. 3 jednoduché kroky
 * 6. Testimonials (3 hvězdičkové recenze)
 * 7. Final CTA s couple photo
 * 8. LegalFooter (SAB regulační text)
 */
export function LandingPage({ onStartChat, logoUrl, title, isValuation }: Props) {
  const handleCTA = (section: string) => {
    trackEvent('landing_cta_click', { section });
    onStartChat();
  };

  return (
    <div className="min-h-screen bg-mesh text-on-surface">
      <SiteHeader cta={{ label: 'Spočítat hypotéku', onClick: () => handleCTA('header') }} />

      {/* Hero Section with Background Image */}
      <section className="relative py-16 md:py-24 px-6 overflow-hidden min-h-[600px] flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/redesign/apartment-hero.png"
            alt="Moderní interiér bytu"
            fill
            priority
            className="object-cover"
          />
          {/* Lehký overlay — jen aby byl text čitelný; fotka zůstává viditelná */}
          <div className="absolute inset-0 bg-white/55" />
          {/* Soft fade jen u horního a spodního okraje pro splynutí se sekcemi */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-surface to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface to-transparent" />
        </div>
        <div className="max-w-[1200px] mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full mb-8 shadow-soft">
            <span className="material-symbols-outlined filled text-primary-container" style={{ fontSize: 20 }}>
              smart_toy
            </span>
            <span className="text-label-md text-on-surface-variant uppercase tracking-wider">
              {isValuation ? 'Seznamte se s Otto' : 'Seznamte se s Hugem'}
            </span>
          </div>
          <h1 className="text-display-xl-mobile md:text-display-xl text-on-surface max-w-4xl mx-auto mb-6">
            {isValuation
              ? 'Zjistěte za 2 minuty cenu vaší nemovitosti'
              : 'Zjistěte za 2 minuty, na jakou hypotéku dosáhnete'}
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
            {isValuation
              ? 'AI asistent vám orientačně ocení byt, dům nebo pozemek na základě reálných dat z trhu. Zdarma a bez závazků.'
              : 'AI poradce Hugo vám spočítá splátku, ověří bonitu a spojí vás s hypotečním specialistou. Zdarma a bez závazků.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => handleCTA('hero')}
              className="bg-primary-container text-on-primary px-8 py-5 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-premium flex items-center gap-2 group"
            >
              {isValuation ? 'Ocenit nemovitost' : 'Spočítat hypotéku'}
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
            <p className="text-on-surface-variant text-label-md">Žádná registrace, žádné závazky</p>
          </div>
        </div>
      </section>

      {/* Trust Stats — jen ověřitelná tvrzení. Dřív tu byla nedoložená
          čísla (1 000+ klientů, 4,9 hodnocení) bez zdroje; nahrazeno tím,
          co obstojí (CLAUDE.md bod 8). */}
      <section className="py-16 px-6 bg-surface-container-lowest">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            {
              icon: 'verified_user',
              label: 'Registrace ČNB',
              href: 'https://www.cnb.cz/cs/dohled-financni-trh/seznamy/jerrs/',
            },
            { icon: 'gavel', label: 'Vázaný zástupce SAB servis' },
            { icon: 'payments', label: 'Konzultace zdarma — platí banka' },
            { icon: 'bolt', label: 'Odpověď do 24 hodin' },
          ].map((stat) => {
            const content = (
              <>
                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined filled text-primary">{stat.icon}</span>
                </div>
                <div className="text-label-md text-on-surface-variant">{stat.label}</div>
              </>
            );
            return stat.href ? (
              <a
                key={stat.label}
                href={stat.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center group hover:opacity-80 transition-opacity"
              >
                {content}
              </a>
            ) : (
              <div key={stat.label} className="text-center group">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* Hugo Intro + How it Works */}
      {!isValuation && (
        <section id="jak-to-funguje" className="py-16 md:py-24 px-6 max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16 mb-20">
            <div className="lg:w-1/2">
              <span className="text-label-md text-on-surface-variant uppercase tracking-widest block mb-4">
                Osobní přístup s AI
              </span>
              <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-6">
                Seznamte se s Hugem, vaším AI specialistou
              </h2>
              <p className="text-body-lg text-on-surface-variant mb-8">
                Hugo není jen obyčejný kalkulátor. Je to pokročilá AI, která rozumí světu hypoték
                a mluví lidskou řečí. Provede vás procesem hladce, rychle a s maximální přesností.
              </p>
              <div className="flex items-center gap-4 p-4 bg-primary-container/5 rounded-2xl border border-primary-container/10">
                <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center text-white shrink-0">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <p className="text-label-md text-on-surface-variant">
                  Analýza vašeho případu zabere Hugovi méně než 120 vteřin.
                </p>
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="absolute -inset-4 bg-primary/10 rounded-[40px] blur-2xl -z-10" />
              {/* Hugo je záměrně stroj, ne tvář — žádná antropomorfní ilustrace.
                  Skutečné fotografie na webu patří výhradně poradcům, viz /poradce. */}
              <div className="w-full aspect-square max-w-[400px] mx-auto rounded-[32px] shadow-premium bg-surface-container-lowest border border-outline-variant/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 120, fontVariationSettings: "'FILL' 1" }}>
                  smart_toy
                </span>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-lg hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-label-md font-bold">Hugo je online</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mb-16">
            <span className="text-label-md text-on-surface-variant uppercase tracking-widest block mb-4">
              Proces
            </span>
            <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
              3 jednoduché kroky
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/3 left-1/4 right-1/4 h-0.5 bg-outline-variant/30 -z-10" />
            {[
              { icon: 'chat_bubble', step: '1.', title: 'Řekněte nám o nemovitosti', text: 'Hugo se vás zeptá na cenu, vlastní zdroje a příjem. Konverzace, ne formulář.' },
              { icon: 'calculate', step: '2.', title: 'Spočítáme všechno', text: 'Splátka, bonita ČNB, porovnání sazeb bank. Vše na jednom místě.' },
              { icon: 'person_pin', step: '3.', title: 'Spojíme vás s poradcem', text: 'Specialista (David Choc a tým) porovná nabídky bank a vyjedná podmínky na míru vaší situaci.' },
            ].map((s) => (
              <div key={s.step} className="bg-surface-container-low p-8 rounded-3xl text-center border border-white hover:border-primary/20 transition-all shadow-soft group">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-primary group-hover:text-white">{s.icon}</span>
                </div>
                <span className="text-primary font-bold block mb-2">{s.step}</span>
                <h3 className="text-headline-md text-on-surface mb-4">{s.title}</h3>
                <p className="text-body-md text-on-surface-variant">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nejde jen o výpočet — most na existující obsah (podnět kolegyně,
          9/2026). Odkazuje jen na skutečné, existující stránky. */}
      {!isValuation && (
        <section className="py-16 md:py-24 px-6 max-w-[1200px] mx-auto">
          <div className="mb-10">
            <span className="text-label-md text-on-surface-variant uppercase tracking-widest block mb-4">
              Nejde jen o výpočet
            </span>
            <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">
              Sazba je jen začátek
            </h2>
            <p className="text-body-lg text-on-surface-variant max-w-2xl">
              Rozhoduje fixace, doložitelnost příjmu i to, jestli vůbec kupovat.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Link
              href="/nabidky"
              className="group bg-surface-container-low p-7 rounded-3xl border border-white hover:border-primary/20 transition-all shadow-soft"
            >
              <span className="material-symbols-outlined text-primary mb-3 block" style={{ fontSize: 32 }}>trending_up</span>
              <h3 className="text-headline-md text-on-surface mb-2">Jakou sazbu reálně dostanete</h3>
              <p className="text-body-md text-on-surface-variant">
                Kde se pohybuje trh podle ČNB a pět faktorů, které rozhodují o vaší konkrétní nabídce.
              </p>
            </Link>
            <Link
              href="/clanky"
              className="group bg-surface-container-low p-7 rounded-3xl border border-white hover:border-primary/20 transition-all shadow-soft"
            >
              <span className="material-symbols-outlined text-primary mb-3 block" style={{ fontSize: 32 }}>menu_book</span>
              <h3 className="text-headline-md text-on-surface mb-2">Poradna a návody</h3>
              <p className="text-body-md text-on-surface-variant">
                Praktické články o nastavení hypotéky — bez balastu, s odkazem na kalkulačku nebo Huga.
              </p>
            </Link>
          </div>
        </section>
      )}

      {/* Final CTA with Couple Photo */}
      <section className="py-16 md:py-24 px-6 text-center">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-stretch rounded-[40px] overflow-hidden shadow-premium bg-primary text-on-primary">
          <div className="lg:w-1/2 relative min-h-[300px]">
            <Image
              src="/images/redesign/happy-couple.png"
              alt="Šťastný pár v novém domově"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent lg:hidden" />
          </div>
          <div className="lg:w-1/2 p-12 md:p-20 flex flex-col justify-center text-left relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
            <h2 className="text-display-xl-mobile md:text-display-xl mb-6 relative z-10">
              {isValuation ? 'Připraveni zjistit cenu?' : 'Připraveni na vlastní bydlení?'}
            </h2>
            <p className="text-body-lg text-on-primary/90 max-w-xl mb-10 relative z-10">
              {isValuation
                ? 'Začněte konverzaci a získejte odhad ceny vaší nemovitosti za 2 minuty.'
                : 'Začněte konverzaci s Hugem a zjistěte, na co dosáhnete. Je to zdarma a nezávazné. Jako tihle spokojení novomanželé.'}
            </p>
            <div className="relative z-10">
              <button
                onClick={() => handleCTA('bottom')}
                className="bg-white text-primary px-10 py-5 rounded-full font-bold text-xl hover:bg-surface-bright active:scale-95 transition-all shadow-lg flex items-center gap-2 group/btn"
              >
                Začít zdarma
                <span className="material-symbols-outlined group-hover/btn:translate-x-1 transition-transform">bolt</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (regulační info — SAB / Quadrum) */}
      <footer className="bg-surface-bright border-t border-outline-variant/20">
        <div className="flex flex-col items-center w-full py-16 px-6 max-w-[1200px] mx-auto text-center gap-8">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <span className="text-label-md font-bold text-on-surface">{title}</span>
            <span className="text-label-md text-on-surface-variant">Provozovatel: QUADRUM s.r.o.</span>
            <span className="text-label-md text-on-surface-variant">Plzeň · Praha</span>
            <a className="text-label-md text-on-surface-variant hover:text-primary underline transition-colors" href="mailto:info@quadrum.cz">
              info@quadrum.cz
            </a>
            <a className="text-label-md text-on-surface-variant hover:text-primary underline transition-colors" href="tel:+420736483169">
              +420 736 483 169
            </a>
          </div>
          {!isValuation && (
            <div className="max-w-4xl text-label-sm text-on-surface-variant/70 leading-relaxed text-left md:text-center space-y-3">
              <p>Jsme partnerem servisní společnosti SAB servis.</p>
              <p className="italic">
                „Finanční služby zde propagované a nabízené poskytují uvedení poradci jako fyzické osoby,
                a to v roli vázaných zástupců pro samostatného zprostředkovatele{' '}
                <span className="font-bold">SAB servis s.r.o.</span>, IČO: 24704008, se sídlem
                Jungmannova 748/30, 110 00 Praha 1, v oblasti spotřebitelských úvěrů dle zákona
                č. 257/2016 Sb. Jejich oprávnění je možné ověřit v Seznamu regulovaných a registrovaných
                subjektů finančního trhu České národní banky na{' '}
                <a className="underline" href="https://www.cnb.cz/cs/dohled-financni-trh/seznamy/jerrs/" target="_blank" rel="noopener noreferrer">
                  www.cnb.cz/cnb/jerrs
                </a>
                , kde také najdete aktuální informace a podrobnosti o jejich registraci a rozsahu jejich
                oprávnění. {title} ani QUADRUM s.r.o. ve zmíněné oblasti finanční služby neposkytuje.&ldquo;
              </p>
              <p>
                Detailní právní informace k nabízeným službám a produktům (včetně reklamačního řádu,
                možnosti podání stížnosti, řešení sporů, orgánu dohledu, udržitelnosti atd.) najdete na{' '}
                <a className="underline" href="https://sabservis.cz/informace" target="_blank" rel="noopener noreferrer">
                  sabservis.cz/informace
                </a>
                .
              </p>
            </div>
          )}
          <div className="w-full h-px bg-outline-variant/10" />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-label-md text-on-surface-variant">
            {!isValuation && (
              <>
                <Link href="/poradce" className="hover:text-primary underline transition-colors">Naši poradci</Link>
                <Link href="/nabidky#reprezentativni-priklad" className="hover:text-primary underline transition-colors">Reprezentativní příklad</Link>
              </>
            )}
            <Link href="/podminky" className="hover:text-primary underline transition-colors">Podmínky a GDPR</Link>
            <Link href="/podminky/odvolat" className="hover:text-primary underline transition-colors">Odvolat souhlas</Link>
            <Link href="/clanky" className="hover:text-primary underline transition-colors">Články</Link>
          </div>
          <div className="text-label-md text-on-surface-variant">
            © 2020 - {new Date().getFullYear()} QUADRUM s.r.o. Všechna práva vyhrazena.{!isValuation && ' Data o sazbách: ČNB ARAD.'}
          </div>
        </div>
      </footer>
    </div>
  );
}
