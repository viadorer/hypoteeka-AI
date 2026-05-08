import Link from 'next/link';
import type { Metadata } from 'next';
import { getTenantConfig, getDefaultTenantId } from '@/lib/tenant/config';
import { LegalFooter } from '@/components/layout/LegalFooter';

export const metadata: Metadata = {
  title: 'Podmínky a právní informace',
  description: 'Identifikační údaje, regulační režim ČNB, zpracování osobních údajů a práva subjektu údajů.',
  robots: { index: true, follow: true },
};

const DOCUMENT_VERSION = '2026-05-v1';
const DOCUMENT_LAST_UPDATED = '2026-05-08';

export default function LegalPage() {
  const tenant = getTenantConfig(getDefaultTenantId());
  const isMortgage = tenant.features.primaryFlow === 'mortgage';
  const lastUpdatedFmt = new Date(DOCUMENT_LAST_UPDATED).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8 inline-block">
          &larr; Zpět na {tenant.branding.title}
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0A1E5C] mb-4">Podmínky a právní informace</h1>
        <p className="text-gray-500 leading-relaxed mb-3">
          Tato stránka obsahuje povinné identifikační údaje provozovatele, popis regulačního
          režimu, informace o zpracování osobních údajů a vaše práva jako subjektu údajů.
        </p>
        <p className="text-xs text-gray-400 mb-12">
          Verze dokumentu: <strong>{DOCUMENT_VERSION}</strong> · Naposledy aktualizováno: {lastUpdatedFmt}
        </p>

        <nav className="bg-white rounded-2xl p-6 mb-10 border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Obsah</p>
          <ol className="space-y-1.5 text-sm">
            <li><a href="#provozovatel" className="text-[#0A1E5C] hover:text-[#b80049]">1. Provozovatel a kontakty</a></li>
            {isMortgage && <li><a href="#regulace" className="text-[#0A1E5C] hover:text-[#b80049]">2. Regulační režim a oprávnění ČNB</a></li>}
            <li><a href="#osobni-udaje" className="text-[#0A1E5C] hover:text-[#b80049]">3. Zpracování osobních údajů (GDPR)</a></li>
            <li><a href="#prava" className="text-[#0A1E5C] hover:text-[#b80049]">4. Vaše práva a odvolání souhlasu</a></li>
            <li><a href="#cookies" className="text-[#0A1E5C] hover:text-[#b80049]">5. Cookies a analytika</a></li>
            {isMortgage && <li><a href="#reklamace" className="text-[#0A1E5C] hover:text-[#b80049]">6. Reklamace, stížnosti a dohled</a></li>}
          </ol>
        </nav>

        <section id="provozovatel" className="mb-12">
          <h2 className="text-xl font-semibold text-[#0A1E5C] mb-4">1. Provozovatel a kontakty</h2>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Provozovatelem služby <strong>{tenant.branding.title}</strong> je společnost{' '}
              <strong>QUADRUM s.r.o.</strong>
            </p>
            <ul className="space-y-1">
              <li><strong>Sídlo Plzeň:</strong> Dřevěná 99/3, 301 00 Plzeň</li>
              <li><strong>Sídlo Praha:</strong> Pod turnovskou tratí 182/18, 198 00 Praha — Hloubětín</li>
              <li><strong>Email:</strong> <a className="text-[#b80049] hover:underline" href="mailto:info@quadrum.cz">info@quadrum.cz</a></li>
              <li><strong>Telefon:</strong> <a className="text-[#b80049] hover:underline" href="tel:+420736483169">+420 736 483 169</a></li>
            </ul>
          </div>
        </section>

        {isMortgage && (
          <section id="regulace" className="mb-12">
            <h2 className="text-xl font-semibold text-[#0A1E5C] mb-4">2. Regulační režim a oprávnění ČNB</h2>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-700 leading-relaxed space-y-3">
              <p>
                Finanční služby propagované a nabízené v rámci služby {tenant.branding.title} poskytují
                konkrétní poradci jako fyzické osoby v roli <strong>vázaných zástupců</strong>{' '}
                samostatného zprostředkovatele:
              </p>
              <div className="bg-[#F5F7FA] rounded-xl p-4">
                <p><strong>SAB servis s.r.o.</strong></p>
                <p>IČO: 24704008</p>
                <p>Sídlo: Jungmannova 748/30, 110 00 Praha 1</p>
              </div>
              <p>
                Oblast působnosti: <strong>spotřebitelské úvěry dle zákona č. 257/2016 Sb.</strong>{' '}
                Oprávnění poradců a registraci SAB servis s.r.o. můžete ověřit v Seznamu regulovaných
                a registrovaných subjektů finančního trhu České národní banky:
              </p>
              <p>
                <a
                  className="text-[#b80049] hover:underline break-all"
                  href="https://www.cnb.cz/cs/dohled-financni-trh/seznamy/jerrs/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.cnb.cz/cs/dohled-financni-trh/seznamy/jerrs/
                </a>
              </p>
              <p>
                Detailní právní informace ke všem nabízeným službám a produktům (předsmluvní informace
                ESIS, reklamační řád, řešení sporů, orgán dohledu, udržitelnost atd.) jsou k dispozici na:
              </p>
              <p>
                <a
                  className="text-[#b80049] hover:underline"
                  href="https://sabservis.cz/informace"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  sabservis.cz/informace
                </a>
              </p>
              <p className="text-xs text-gray-500 italic">
                {tenant.branding.title} ani QUADRUM s.r.o. ve zmíněné oblasti finanční služby
                samy neposkytují.
              </p>
            </div>
          </section>
        )}

        <section id="osobni-udaje" className="mb-12">
          <h2 className="text-xl font-semibold text-[#0A1E5C] mb-4">3. Zpracování osobních údajů (GDPR)</h2>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              <strong>Správce údajů:</strong> QUADRUM s.r.o. (kontakty viz část 1).
            </p>
            <p>
              <strong>Příjemce údajů:</strong> jednotlivý poradce QUADRUM s.r.o. v roli vázaného
              zástupce SAB servis s.r.o., kterému jsou údaje předány na základě vašeho souhlasu
              za účelem nezávazné konzultace a přípravy nabídky financování.
            </p>
            <p>
              <strong>Zpracovávané údaje:</strong> identifikační (jméno, e-mail, telefon),
              údaje o nemovitosti, údaje o finanční situaci (příjem, závazky, vlastní zdroje),
              obsah konverzace s AI asistentem.
            </p>
            <p>
              <strong>Účel zpracování:</strong> nezávazná hypoteční konzultace, příprava nabídky
              spotřebitelského úvěru, plnění zákonných povinností zprostředkovatele (zákon č. 257/2016 Sb.).
            </p>
            <p>
              <strong>Právní základ:</strong> váš výslovný souhlas (čl. 6 odst. 1 písm. a GDPR),
              plnění smlouvy a předsmluvních opatření (písm. b), oprávněný zájem správce
              při auditní stopě (písm. f).
            </p>
            <p>
              <strong>Doba uchování:</strong> osobní údaje zpracováváme po dobu nezbytně nutnou
              k naplnění účelu, nejdéle však po dobu stanovenou právními předpisy
              (zpravidla 10 let od posledního kontaktu pro účely povinností zprostředkovatele
              dle § 257/2016 Sb.). Auditní stopa souhlasu je archivována odděleně.
            </p>
            <p>
              <strong>Předávání mimo EU:</strong> osobní údaje nejsou předávány do třetích zemí
              mimo Evropský hospodářský prostor.
            </p>
          </div>
        </section>

        <section id="prava" className="mb-12">
          <h2 className="text-xl font-semibold text-[#0A1E5C] mb-4">4. Vaše práva a odvolání souhlasu</h2>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Jako subjekt údajů máte podle GDPR právo:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>na přístup k osobním údajům (čl. 15)</li>
              <li>na opravu nepřesných údajů (čl. 16)</li>
              <li>na výmaz („právo být zapomenut“, čl. 17)</li>
              <li>na omezení zpracování (čl. 18)</li>
              <li>na přenositelnost údajů (čl. 20)</li>
              <li>vznést námitku proti zpracování (čl. 21)</li>
              <li>kdykoli odvolat svůj souhlas (čl. 7 odst. 3) — odvolání nemá zpětný účinek</li>
              <li>podat stížnost u Úřadu pro ochranu osobních údajů (<a className="text-[#b80049] hover:underline" href="https://www.uoou.cz" target="_blank" rel="noopener noreferrer">www.uoou.cz</a>)</li>
            </ul>
            <p>
              Souhlas se zpracováním a předáním údajů můžete odvolat:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                online formulářem <Link className="text-[#b80049] hover:underline" href="/podminky/odvolat">/podminky/odvolat</Link>{' '}
                (anonymní self-service, e-mailem dostanete potvrzovací odkaz)
              </li>
              <li>v aplikaci po přihlášení v sekci „Můj účet → Odvolat souhlas&quot;</li>
              <li>e-mailem na <a className="text-[#b80049] hover:underline" href="mailto:info@quadrum.cz">info@quadrum.cz</a></li>
              <li>písemně na sídle společnosti QUADRUM s.r.o.</li>
            </ul>
            <p className="text-xs text-gray-500 italic">
              Při odvolání souhlasu pro doručení reakce uveďte vaši e-mailovou adresu, telefon nebo
              ID konverzace, abychom mohli identifikovat příslušné záznamy.
            </p>
          </div>
        </section>

        <section id="cookies" className="mb-12">
          <h2 className="text-xl font-semibold text-[#0A1E5C] mb-4">5. Cookies a analytika</h2>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Web používá technické cookies nezbytné pro provoz a — pouze s vaším souhlasem —
              analytické cookies (Google Analytics 4) za účelem měření návštěvnosti a vylepšování služby.
            </p>
            <p>
              Souhlas s analytickými cookies můžete kdykoli změnit kliknutím na odkaz „Nastavení cookies“
              v patičce nebo vymazáním cookies ve vašem prohlížeči.
            </p>
          </div>
        </section>

        {isMortgage && (
          <section id="reklamace" className="mb-12">
            <h2 className="text-xl font-semibold text-[#0A1E5C] mb-4">6. Reklamace, stížnosti a dohled</h2>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-700 leading-relaxed space-y-3">
              <p>
                Reklamace, stížnosti a podněty týkající se zprostředkování spotřebitelského úvěru
                přijímá samostatný zprostředkovatel SAB servis s.r.o. Reklamační řád, postup
                pro řešení sporů a kontakty na orgán dohledu (Česká národní banka, Finanční arbitr ČR)
                jsou zveřejněny na:
              </p>
              <p>
                <a
                  className="text-[#b80049] hover:underline"
                  href="https://sabservis.cz/informace"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  sabservis.cz/informace
                </a>
              </p>
              <p>
                Mimosoudní řešení spotřebitelských sporů zajišťuje{' '}
                <a className="text-[#b80049] hover:underline" href="https://www.finarbitr.cz" target="_blank" rel="noopener noreferrer">
                  Finanční arbitr ČR
                </a>.
              </p>
            </div>
          </section>
        )}

        <p className="text-xs text-gray-400 text-center mt-12">
          Tato stránka představuje souhrn základních informací. Závazné je vždy aktuální znění
          uvedených zákonů a dokumentace samostatného zprostředkovatele SAB servis s.r.o.
        </p>
      </div>

      <LegalFooter />
    </div>
  );
}
