import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { LegalFooter } from '@/components/layout/LegalFooter';
import { loadAllActiveBrokers } from '@/lib/broker-pool';

export const metadata: Metadata = {
  title: 'Naši poradci | Kdo pro vás sazbu vyjedná',
  description:
    'Hypoteční specialisté Hypoteeky — vázaní zástupci SAB servis s.r.o. s registrací ověřitelnou v seznamu ČNB (JERRS).',
  alternates: { canonical: 'https://www.hypoteeka.cz/poradce' },
};

const JERRS_SEARCH_URL = 'https://www.cnb.cz/cs/dohled-financni-trh/seznamy/jerrs/';

// Broker data z Supabase, ne z Next fetch cache — bez explicitní revalidace
// by stránka zůstala staticky zapečená z buildu a nový poradce z adminu
// by se neobjevil dřív než při dalším deploy. Hodinová revalidace odpovídá
// vzoru z /nabidky a /kalkulacka.
export const revalidate = 3600;

export default async function AdvisorsPage() {
  const brokers = await loadAllActiveBrokers();
  const [featured, ...rest] = brokers;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <SiteHeader />
      <main className="max-w-[820px] mx-auto px-4 py-12 md:py-16 flex-1 w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-3">
          Kdo pro vás sazbu vyjedná
        </h1>
        <p className="text-on-surface-variant leading-relaxed mb-10">
          Hugo připraví podklady — vaše čísla, orientační bonitu a přepis toho, co
          řešíte. Náš specialista na ně naváže: porovná skutečné nabídky bank,
          vyjedná podmínky a provede vás schválením až po čerpání. Ozve se do 24
          hodin; konzultace je zdarma a k ničemu nezavazuje — odměnu hradí banka.
        </p>

        {featured && (
          <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:p-8 mb-6">
            <div className="flex flex-wrap items-center gap-5 mb-4">
              {featured.photoUrl ? (
                <Image
                  src={featured.photoUrl}
                  alt={featured.fullName}
                  width={88}
                  height={88}
                  className="w-[88px] h-[88px] rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />
              ) : (
                <div className="w-[88px] h-[88px] rounded-full bg-on-surface text-surface flex items-center justify-center text-2xl font-bold shrink-0">
                  {featured.fullName.split(' ').map(w => w[0]).join('')}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-on-surface">{featured.fullName}</h2>
                <p className="text-sm text-on-surface-variant mb-2">
                  {featured.roleLabel} ·{' '}
                  <a
                    href={featured.cnbLicenseId ? `${JERRS_SEARCH_URL}?search=${encodeURIComponent(featured.cnbLicenseId)}` : JERRS_SEARCH_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-on-surface"
                  >
                    registrace ČNB (JERRS)
                  </a>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {featured.specializations.map(s => (
                    <span
                      key={s}
                      className="bg-primary-fixed text-[#40000c] text-xs px-2.5 py-1 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {featured.shortDescription && (
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                {featured.shortDescription}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="px-5 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Domluvit konzultaci
              </Link>
              <a
                href={`tel:${featured.phone}`}
                className="px-5 py-3 rounded-xl border border-outline-variant/40 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
              >
                {featured.phone}
              </a>
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section className="grid sm:grid-cols-2 gap-4 mb-10">
            {rest.map(b => (
              <div key={b.id} className="rounded-2xl border border-outline-variant/30 p-5">
                <div className="flex items-center gap-3 mb-3">
                  {b.photoUrl ? (
                    <Image
                      src={b.photoUrl}
                      alt={b.fullName}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant text-sm font-semibold shrink-0">
                      {b.fullName.split(' ').map(w => w[0]).join('')}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-on-surface text-sm">{b.fullName}</h3>
                    <a
                      href={b.cnbLicenseId ? `${JERRS_SEARCH_URL}?search=${encodeURIComponent(b.cnbLicenseId)}` : JERRS_SEARCH_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      registrace ČNB
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {b.specializations.map(s => (
                    <span key={s} className="bg-surface-container-high text-on-surface-variant text-[11px] px-2 py-1 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
                {b.shortDescription && (
                  <p className="text-xs text-on-surface-variant/80 mb-3">{b.shortDescription}</p>
                )}
                <Link href="/" className="text-sm text-primary font-medium hover:underline">
                  Konzultace →
                </Link>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-2xl bg-surface-container p-6 md:p-8 text-sm text-on-surface-variant leading-relaxed">
          <h2 className="text-base font-semibold text-on-surface mb-2">
            Poskytujeme doporučení, ne radu dle § 85
          </h2>
          <p>
            Naši poradci jsou vázaní zástupci samostatného zprostředkovatele SAB
            servis s.r.o. a poskytují doporučení podle § 3 odst. 1 písm. b) bodu 3
            zákona č. 257/2016 Sb., o spotřebitelském úvěru; neposkytují radu podle
            § 85 tohoto zákona.
          </p>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
