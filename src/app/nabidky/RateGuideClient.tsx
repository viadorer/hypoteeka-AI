'use client';

/**
 * „Jakou sazbu reálně dostanete"
 *
 * Nahradilo srovnávací tabulku, která u jmen bank uváděla sazby dopočítané
 * jako průměr ČNB ± spread — čísla, která od těch bank nepocházela
 * (CLAUDE.md 3.1). Kromě právního rizika to byl i slib, který poradce
 * nemohl splnit.
 *
 * Pravidlo, které tahle stránka drží: název konkrétní banky se smí objevit
 * jen vedle čísla, které z té banky prokazatelně pochází, s datem a zdrojem.
 * Proto je tu jediné číslo — průměr ČNB ARAD s referenčním obdobím — a
 * reprezentativní příklad, který u číselného údaje vyžaduje § 92 zákona
 * č. 257/2016 Sb.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateAnnuity, calculateTotalPaid } from '@/lib/calculations';
import { formatCZK, formatPercent } from '@/lib/format';

interface Props {
  /** Průměrná sazba nových hypoték podle ČNB ARAD, v procentech (např. 4.73). */
  avgRate: number;
  /**
   * Referenční období údaje, česky (např. „červenec 2026").
   * Prázdné, dokud ingest ARAD období neukládá — dnes se drží jen den
   * stažení, což není totéž (CLAUDE.md 3.4). Dokud ho nemáme, radši se
   * neuvádí žádné, než aby se vydával den stažení za období.
   */
  referencePeriod?: string;
}

/** Vstupy reprezentativního příkladu. Pevné, aby šlo číslo ověřit. */
const EXAMPLE = {
  propertyPrice: 5_000_000,
  loan: 4_000_000,
  years: 30,
};

const RATE_FACTORS = [
  {
    title: 'Podíl úvěru k ceně nemovitosti (LTV)',
    body: 'Čím víc dáte z vlastního, tím nižší sazbu banka nabídne. Rozdíl mezi 90 % a 70 % LTV bývá znát nejvíc ze všech faktorů.',
  },
  {
    title: 'Délka fixace',
    body: 'Kratší fixace bývá levnější, ale za cenu rizika při refixaci. Delší fixace je dražší jistota. Která se vyplatí, závisí na tom, kde budete za pár let.',
  },
  {
    title: 'Typ a doložitelnost příjmu',
    body: 'Zaměstnanec na dobu neurčitou, OSVČ podle daňového přiznání a firma s obraty jsou tři různé světy. U OSVČ hraje roli i způsob, jakým banka příjem počítá.',
  },
  {
    title: 'Co se k hypotéce naváže',
    body: 'Pojištění nemovitosti a schopnosti splácet, aktivní účet nebo zasílání příjmu — banky za to slevují z marže. Někdy se to vyplatí, jindy sleva nepokryje cenu produktu.',
  },
  {
    title: 'Věk a délka splatnosti',
    body: 'Splatnost končí zpravidla důchodovým věkem. U mladších žadatelů se dá splátka rozložit na delší dobu, což mění výslednou splátku i posouzení bonity.',
  },
];

export function RateGuideClient({ avgRate, referencePeriod }: Props) {
  const router = useRouter();

  const monthly = calculateAnnuity(EXAMPLE.loan, avgRate / 100, EXAMPLE.years * 12);
  const totalPaid = calculateTotalPaid(monthly, EXAMPLE.years * 12);

  // Orientační. Přesnost na koruny by u odhadu předstírala jistotu,
  // kterou nemá (CLAUDE.md 4.4).
  const roundToTen = (n: number) => Math.round(n / 10_000) * 10_000;

  return (
    <main className="max-w-[820px] mx-auto px-4 py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-3">
        Jakou sazbu reálně dostanete
      </h1>
      <p className="text-on-surface-variant leading-relaxed mb-10">
        Sazba z ceníku a sazba, kterou vám banka nakonec dá, jsou dvě různá čísla.
        To druhé se nedá vyčíst z tabulky — vychází z vaší konkrétní situace.
        Níže je, kde se trh pohybuje a co s vaší sazbou pohne nahoru nebo dolů.
      </p>

      {/* 1. Jediné číslo — se zdrojem a referenčním obdobím */}
      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:p-8 mb-6">
        <p className="text-sm text-on-surface-variant mb-1">
          Průměrná sazba nových hypoték na bydlení
        </p>
        <p className="text-4xl md:text-5xl font-bold text-on-surface mb-2">
          {formatPercent(avgRate / 100, 2)}
        </p>
        <p className="text-sm text-on-surface-variant">
          Zdroj:{' '}
          <a
            href="https://www.cnb.cz/aradb/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-on-surface"
          >
            ČNB ARAD
          </a>
          {referencePeriod
            ? `, průměr za ${referencePeriod}. `
            : ' — poslední dostupný měsíční průměr. ČNB údaj zveřejňuje s odstupem, nejde tedy o dnešní sazbu. '}
          Jde o průměr za celý trh, ne o nabídku konkrétní banky.
        </p>
      </section>

      {/* 2. Reprezentativní příklad — § 92 z. 257/2016 Sb. */}
      <section className="rounded-2xl border border-outline-variant/30 p-6 md:p-8 mb-10">
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          Reprezentativní příklad
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex justify-between border-b border-outline-variant/20 py-1.5">
            <dt className="text-on-surface-variant">Cena nemovitosti</dt>
            <dd className="text-on-surface font-medium">{formatCZK(EXAMPLE.propertyPrice)}</dd>
          </div>
          <div className="flex justify-between border-b border-outline-variant/20 py-1.5">
            <dt className="text-on-surface-variant">Výše úvěru</dt>
            <dd className="text-on-surface font-medium">{formatCZK(EXAMPLE.loan)}</dd>
          </div>
          <div className="flex justify-between border-b border-outline-variant/20 py-1.5">
            <dt className="text-on-surface-variant">Doba splácení</dt>
            <dd className="text-on-surface font-medium">{EXAMPLE.years} let</dd>
          </div>
          <div className="flex justify-between border-b border-outline-variant/20 py-1.5">
            <dt className="text-on-surface-variant">Úroková sazba</dt>
            <dd className="text-on-surface font-medium">{formatPercent(avgRate / 100, 2)} p. a.</dd>
          </div>
          <div className="flex justify-between border-b border-outline-variant/20 py-1.5">
            <dt className="text-on-surface-variant">Měsíční splátka</dt>
            <dd className="text-on-surface font-medium">{formatCZK(Math.round(monthly))}</dd>
          </div>
          <div className="flex justify-between border-b border-outline-variant/20 py-1.5">
            <dt className="text-on-surface-variant">Celkem zaplaceno</dt>
            <dd className="text-on-surface font-medium">{formatCZK(roundToTen(totalPaid))}</dd>
          </div>
        </dl>
        <p className="text-xs text-on-surface-variant mt-4 leading-relaxed">
          Příklad počítá s průměrnou tržní sazbou uvedenou výše, bez poplatků za
          poskytnutí, odhad a pojištění — ty se u jednotlivých bank liší a vstupují
          až do RPSN konkrétní nabídky. Nejde o nabídku úvěru ani o příslib jeho
          poskytnutí.
        </p>
      </section>

      {/* 3. Co s vaší sazbou pohne */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-on-surface mb-2">
          Co s vaší sazbou pohne
        </h2>
        <p className="text-on-surface-variant text-sm mb-6">
          Tohle jsou faktory, kvůli kterým dva žadatelé se stejnou cenou nemovitosti
          dostanou jinou sazbu.
        </p>
        <div className="space-y-4">
          {RATE_FACTORS.map(f => (
            <div key={f.title} className="rounded-xl border border-outline-variant/30 p-5">
              <h3 className="font-semibold text-on-surface mb-1">{f.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CTA na výpočet */}
      <section className="rounded-2xl bg-surface-container p-6 md:p-8 mb-10">
        <h2 className="text-xl font-semibold text-on-surface mb-2">
          Spočítejte si to na svých číslech
        </h2>
        <p className="text-on-surface-variant text-sm mb-5 leading-relaxed">
          Zadejte cenu nemovitosti, vlastní zdroje a příjem. Uvidíte splátku,
          podíl úvěru k ceně i to, jestli na úvěr dosáhnete — a kde máte prostor
          sazbu vyjednat.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/kalkulacka')}
            className="px-5 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Otevřít kalkulačku
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-3 rounded-xl border border-outline-variant/40 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Probrat to s Hugem
          </button>
        </div>
      </section>

      {/* 5. Most na stranu prodávajícího */}
      <section className="rounded-2xl border border-outline-variant/30 p-6 md:p-8 mb-10">
        <h2 className="text-lg font-semibold text-on-surface mb-2">
          Prodáváte nemovitost?
        </h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          Hypotéka je jen jedna strana obchodu. Pokud zvažujete prodej nebo
          přemýšlíte, jestli se byt vyplatí spíš pronajmout, spočítáme obojí a
          řekneme si, co dává ve vaší situaci větší smysl.{' '}
          <Link href="/" className="underline hover:text-on-surface">
            Napište Hugovi
          </Link>
          .
        </p>
      </section>

      {/* 6. Kdo sazbu vyjednává */}
      <section className="text-sm text-on-surface-variant leading-relaxed">
        <h2 className="text-base font-semibold text-on-surface mb-2">
          Kdo pro vás sazbu vyjedná
        </h2>
        <p>
          Hypotéku sjednáváme jako vázaní zástupci samostatného zprostředkovatele
          SAB servis s.r.o., IČO 24704008, zapsaného v seznamu regulovaných
          subjektů ČNB. Konkrétní nabídku vždy potvrzuje banka — do té doby jsou
          všechna čísla na tomto webu orientační.
        </p>
      </section>
    </main>
  );
}
