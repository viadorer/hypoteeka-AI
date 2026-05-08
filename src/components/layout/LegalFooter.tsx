'use client';

import { useTenant } from '@/lib/tenant/use-tenant';

/**
 * Regulační footer.
 *
 * Why: Hypoteeka.cz nabízí zprostředkování spotřebitelského úvěru dle § 257/2016 Sb.
 * Tato činnost je regulovaná ČNB. Konkrétní službu poskytují vázaní zástupci
 * samostatného zprostředkovatele SAB servis s.r.o. Provozovatel (Quadrum)
 * v této oblasti finanční služby sám neposkytuje. Wording je převzatý z
 * právně schváleného textu na quadrum.cz a musí být zobrazen tam, kde se
 * regulovaná služba propaguje.
 *
 * Pro tenant 'odhad' (odhad.online) se regulační blok nezobrazuje — odhad
 * ceny nemovitosti není regulovanou službou dle 257/2016.
 */
export function LegalFooter() {
  const tenant = useTenant();
  const isMortgage = tenant.features.primaryFlow === 'mortgage';
  const year = new Date().getFullYear();

  return (
    <footer className="px-4 py-10 border-t border-[#e4bdc2]/10 bg-white">
      <div className="max-w-4xl mx-auto space-y-6 text-[11px] leading-relaxed text-[#001a41]/55">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[#001a41]/40">
          <span>{tenant.branding.title}</span>
          <span>·</span>
          <span>Provozovatel: QUADRUM s.r.o.</span>
          <span>·</span>
          <span>Plzeň · Praha</span>
          <span>·</span>
          <a href="mailto:info@quadrum.cz" className="hover:text-[#b80049] transition-colors">info@quadrum.cz</a>
          <span>·</span>
          <a href="tel:+420736483169" className="hover:text-[#b80049] transition-colors">+420 736 483 169</a>
        </div>

        {isMortgage && (
          <div className="space-y-3 max-w-3xl mx-auto text-justify">
            <p>
              Jsme partnerem servisní společnosti SAB servis.
            </p>
            <p>
              „Finanční služby zde propagované a nabízené poskytují uvedení poradci
              jako fyzické osoby, a to v roli vázaných zástupců pro samostatného
              zprostředkovatele <strong>SAB servis s.r.o.</strong>, IČO: 24704008,
              se sídlem Jungmannova 748/30, 110 00 Praha 1, v oblasti spotřebitelských
              úvěrů dle zákona č. 257/2016 Sb. Jejich oprávnění je možné ověřit
              v Seznamu regulovaných a registrovaných subjektů finančního trhu
              České národní banky na{' '}
              <a
                href="https://www.cnb.cz/cs/dohled-financni-trh/seznamy/jerrs/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#b80049]"
              >
                www.cnb.cz/cnb/jerrs
              </a>
              , kde také najdete aktuální informace a podrobnosti o jejich registraci
              a rozsahu jejich oprávnění. {tenant.branding.title} ani QUADRUM s.r.o.
              ve zmíněné oblasti finanční služby neposkytuje.“
            </p>
            <p>
              Detailní právní informace k nabízeným službám a produktům (včetně
              reklamačního řádu, možnosti podání stížnosti, řešení sporů, orgánu
              dohledu, udržitelnosti atd.) najdete na{' '}
              <a
                href="https://sabservis.cz/informace"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#b80049]"
              >
                sabservis.cz/informace
              </a>
              .
            </p>
          </div>
        )}

        <p className="text-center text-[#001a41]/35">
          © 2020 - {year} QUADRUM s.r.o. Všechna práva vyhrazena.
          {isMortgage && ' · Data o sazbách: ČNB ARAD.'}
        </p>
      </div>
    </footer>
  );
}
