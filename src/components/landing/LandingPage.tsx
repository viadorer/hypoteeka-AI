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
              auto_awesome
            </span>
            <span className="text-label-md text-on-surface-variant uppercase tracking-wider">
              {isValuation ? 'AI průvodce oceněním' : 'AI průvodce hypotékou'}
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
              : 'AI průvodce Hugo vám spočítá splátku, ověří bonitu a spojí vás se specialistou přesně na vaši situaci. Zdarma a bez závazků.'}
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
            {!isValuation && (
              <button onClick={() => handleCTA('hero-secondary')} className="text-primary font-semibold text-label-md hover:underline px-2">
                Zeptat se Huga →
              </button>
            )}
          </div>
          <p className="text-on-surface-variant text-label-md mt-4">
            {isValuation ? 'Žádná registrace, žádné závazky' : 'Žádná registrace. Výsledek hned, kontakt jen když sami chcete.'}
          </p>
        </div>
      </section>

      {/* Trust Stats — jen doložitelná tvrzení. Dřív tu byla nedoložená čísla
          (1 000+ klientů, 4,9 hodnocení) bez zdroje (CLAUDE.md bod 8).
          Hodnocení tu záměrně není: dokud není veřejný profil s recenzemi,
          na který jde odkázat, žádné číslo neuvádíme. */}
      <section className="py-16 px-6 bg-surface-container-lowest">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-1 bg-surface-container-low p-6 rounded-3xl border border-white shadow-soft">
            <div className="text-display-xl-mobile text-primary font-bold">26 let</div>
            <div className="text-label-md text-on-surface-variant uppercase tracking-wider mt-1">praxe v oboru</div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-3xl border border-white shadow-soft">
            <div className="text-display-xl-mobile text-primary font-bold">11 bank</div>
            <div className="text-label-md text-on-surface-variant uppercase tracking-wider mt-1">a další instituce</div>
          </div>
          <a
            href="https://www.cnb.cz/cs/dohled-financni-trh/seznamy/jerrs/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-on-surface text-surface p-6 rounded-3xl flex flex-col justify-between hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined filled text-primary-fixed" style={{ fontSize: 28 }}>verified_user</span>
            <span className="text-label-md mt-3">Registrace ČNB (JERRS)</span>
          </a>
          <div className="bg-surface-container-high p-6 rounded-3xl flex flex-col justify-between">
            <span className="material-symbols-outlined filled text-primary" style={{ fontSize: 28 }}>payments</span>
            <span className="text-label-md text-on-surface mt-3">Konzultace zdarma — odměnu hradí banka</span>
          </div>
        </div>
      </section>

      {/* Hugo Intro + How it Works */}
      {!isValuation && (
        <section id="jak-to-funguje" className="py-16 md:py-24 px-6 max-w-[1200px] mx-auto">
          {/* Hugo a tým — dvě rovnocenné karty. Hugo je záměrně stroj (ikona),
              tváře na webu patří výhradně skutečným poradcům (CLAUDE.md bod 9). */}
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-8 shadow-soft">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>
                  smart_toy
                </span>
              </div>
              <h2 className="text-headline-md text-on-surface mb-3">Hugo je stroj. A je to tak správně.</h2>
              <p className="text-body-md text-on-surface-variant mb-5">
                Hugo počítá splátky, bonitu i srovnání nájmu s hypotékou — vždy ověřenou matematikou,
                nikdy odhadem. Neradí a nic neslibuje: individuální poradenství patří výhradně
                licencovaným specialistům.
              </p>
              <button onClick={() => handleCTA('hugo-card')} className="text-primary text-label-md font-semibold hover:underline">
                Vyzkoušet konverzaci →
              </button>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-8 shadow-soft">
              <div className="flex items-center gap-4 mb-4">
                <Image
                  src="/images/team/david-choc.png"
                  alt="David Choc"
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />
                <div>
                  <h2 className="text-headline-md text-on-surface leading-tight">David Choc a tým</h2>
                  <span className="text-label-md text-on-surface-variant">hypoteční specialisté</span>
                </div>
              </div>
              <p className="text-body-md text-on-surface-variant mb-5">
                Každý výpočet od Huga končí u skutečného člověka. Podle vaší situace — bydlení,
                investice, refinancování — se vám ozve specialista přesně na ni,{' '}
                <strong className="text-on-surface">do 4 pracovních hodin</strong>.
              </p>
              <Link href="/poradce" className="text-primary text-label-md font-semibold hover:underline">
                Poznat celý tým →
              </Link>
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
              { icon: 'edit_note', step: '1.', title: 'Řeknete Hugovi o nemovitosti', text: 'Cena, vlastní zdroje, příjem — konverzace nebo kalkulačka, jak je vám příjemnější.' },
              { icon: 'psychology', step: '2.', title: 'Hned vidíte výsledek', text: 'Splátka, orientační bonita a co s vaší sazbou pohne. Bez registrace, bez kontaktu.' },
              { icon: 'assignment_turned_in', step: '3.', title: 'Předání specialistovi', text: 'Kontakt necháte, jen pokud chcete nabídku na míru. Specialista volá do 4 pracovních hodin.' },
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                href: '/nabidky',
                icon: 'trending_up',
                title: 'Co s vaší sazbou pohne',
                text: 'LTV, fixace, typ příjmu — pět faktorů, které rozhodují o vaší konkrétní nabídce.',
              },
              {
                href: '/clanky/jak-dlouhou-fixaci-zvolit-2026',
                icon: 'event_repeat',
                title: 'Jak dlouhou fixaci zvolit',
                text: 'Rok 2026 přeje kratším fixacím. Kdy se to vyplatí a kdy si radši připlatit za jistotu.',
              },
              {
                href: '/clanky/najem-nebo-hypoteka',
                icon: 'compare_arrows',
                title: 'Nájem, nebo hypotéka?',
                text: 'Srovnání, které počítá i s růstem nájmů, náklady vlastnictví a cenou příležitosti.',
              },
              {
                href: '/clanky/hypoteka-pro-osvc',
                icon: 'badge',
                title: 'Hypotéka pro OSVČ',
                text: 'Jak banky počítají příjem podnikatele a co si připravit k doložení.',
              },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-surface-container-low p-7 rounded-3xl border border-white hover:border-primary/20 transition-all shadow-soft"
              >
                <span className="material-symbols-outlined text-primary mb-3 block" style={{ fontSize: 32 }}>{card.icon}</span>
                <h3 className="text-headline-md text-on-surface mb-2">{card.title}</h3>
                <p className="text-body-md text-on-surface-variant">{card.text}</p>
              </Link>
            ))}
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
                : 'Dvě minuty s Hugem, žádné závazky — a když budete chtít, váš specialista se ozve do 4 pracovních hodin.'}
            </p>
            <div className="relative z-10">
              <button
                onClick={() => handleCTA('bottom')}
                className="bg-white text-primary px-10 py-5 rounded-full font-bold text-xl hover:bg-surface-bright active:scale-95 transition-all shadow-lg flex items-center gap-2 group/btn"
              >
                {isValuation ? 'Začít zdarma' : 'Začít konverzaci'}
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
