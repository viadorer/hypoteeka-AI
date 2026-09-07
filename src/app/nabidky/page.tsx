import type { Metadata } from 'next';
import { LegalFooter } from '@/components/layout/LegalFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { RateGuideClient } from './RateGuideClient';

export const metadata: Metadata = {
  title: 'Jakou sazbu reálně dostanete | Hypoteční sazby',
  description:
    'Kde se pohybuje trh podle ČNB ARAD a co rozhoduje o tom, jakou sazbu vám banka nabídne — LTV, fixace, typ příjmu, navázané produkty.',
  alternates: { canonical: 'https://www.hypoteeka.cz/nabidky' },
};

async function fetchRates() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hypoteeka.cz';
    const res = await fetch(`${baseUrl}/api/rates`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function OffersPage() {
  const rates = await fetchRates();
  const avgRate = rates?.mortgage?.avgRate;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <SiteHeader />
      {typeof avgRate === 'number' && avgRate > 0 ? (
        <RateGuideClient avgRate={avgRate} />
      ) : (
        // Bez dat z ARAD se žádné číslo neukazuje. Dřív se sem dosazovala
        // záložní konstanta, takže stránka tvrdila sazbu, kterou neměla odkud
        // vědět.
        <main className="max-w-[820px] mx-auto px-4 py-16 flex-1">
          <h1 className="text-3xl font-bold text-on-surface mb-3">
            Jakou sazbu reálně dostanete
          </h1>
          <p className="text-on-surface-variant leading-relaxed">
            Aktuální tržní údaj ČNB se teď nepodařilo načíst. Spočítat splátku na
            vašich číslech ale můžete v{' '}
            <a href="/kalkulacka" className="underline hover:text-on-surface">
              kalkulačce
            </a>
            , nebo se zeptejte Huga.
          </p>
        </main>
      )}
      <LegalFooter />
    </div>
  );
}
