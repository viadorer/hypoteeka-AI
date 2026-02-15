import { getTenantConfig, getDefaultTenantId } from '@/lib/tenant/config';

export function StructuredData() {
  const tenant = getTenantConfig(getDefaultTenantId());
  const isValuation = tenant.features.primaryFlow === 'valuation';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${tenant.domain}`;

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: tenant.name,
    url: siteUrl,
    logo: `${siteUrl}${tenant.branding.logoUrl ?? '/logo.png'}`,
    description: isValuation
      ? 'Orientační odhad tržní ceny nemovitosti zdarma. Odhad bytu, domu i pozemku na základě reálných dat z trhu.'
      : 'Hypoteční poradenství s využitím umělé inteligence. Kalkulačka hypotéky, ověření bonity, porovnání sazeb bank.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Czech',
    },
  };

  const webApplication = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tenant.branding.title,
    url: siteUrl,
    applicationCategory: isValuation ? 'BusinessApplication' : 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CZK',
    },
    description: isValuation
      ? 'AI asistent pro orientační odhad ceny nemovitosti. Zjistěte tržní cenu nebo výši nájmu bytu, domu či pozemku -- zdarma a nezávazně.'
      : 'AI hypoteční poradce Hugo. Spočítá splátku, ověří bonitu, porovná nabídky bank. Za minutu víte, na co dosáhnete.',
    featureList: isValuation
      ? [
          'Orientační odhad prodejní ceny nemovitosti',
          'Odhad výše nájmu',
          'Srovnání s cenami v okolí',
          'Odhad bytu, domu i pozemku',
          'Orientační výpočet hypotéky',
          'Bezplatná konzultace se specialistou',
        ]
      : [
          'Kalkulačka hypoteční splátky',
          'Ověření bonity a dosažitelnosti',
          'Porovnání sazeb bank',
          'Live sazby z ČNB',
          'Analýza nájem vs. vlastní bydlení',
          'Investiční kalkulačka nemovitostí',
          'Bezplatná konzultace se specialistou',
        ],
    inLanguage: 'cs',
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: isValuation
      ? [
          {
            '@type': 'Question',
            name: 'Jak funguje orientační odhad nemovitosti?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Odhad.online porovná parametry vaší nemovitosti (typ, plocha, stav, lokalita) se srovnatelnými prodejemi a pronájmy v okolí a vypočítá orientační tržní cenu. Odhad je zdarma a nezávazný.',
            },
          },
          {
            '@type': 'Question',
            name: 'Jaký je rozdíl mezi orientačním odhadem a znaleckým posudkem?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Orientační odhad je rychlý a zdarma, založený na statistickém srovnání. Znalecký posudek zpracovává certifikovaný soudní znalec, je právně závazný a stojí cca 3 000-8 000 Kč.',
            },
          },
          {
            '@type': 'Question',
            name: 'Co ovlivňuje cenu nemovitosti?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Hlavní faktory: lokalita, velikost (užitná plocha), stav nemovitosti, typ (byt/dům/pozemek), dispozice, konstrukce, energetická náročnost a aktuální tržní podmínky.',
            },
          },
          {
            '@type': 'Question',
            name: 'Umíte odhadnout i výši nájmu?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ano, odhad.online umí odhadnout jak prodejní cenu, tak měsíční nájem. Poměr nájmu k ceně (rental yield) se v ČR typicky pohybuje kolem 3-5 % ročně.',
            },
          },
        ]
      : [
          {
            '@type': 'Question',
            name: 'Co je LTV u hypotéky?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'LTV (Loan-to-Value) je poměr výše úvěru k hodnotě nemovitosti. ČNB doporučuje maximální LTV 80 % (90 % pro žadatele do 36 let).',
            },
          },
          {
            '@type': 'Question',
            name: 'Co je DSTI?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'DSTI (Debt Service-to-Income) je poměr měsíční splátky všech úvěrů k čistému měsíčnímu příjmu. ČNB doporučuje maximum 45 %.',
            },
          },
          {
            '@type': 'Question',
            name: 'Jak dlouho trvá schválení hypotéky?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Standardní doba schválení hypotéky je 2-4 týdny od podání kompletní žádosti. Předschválení (prescoring) lze získat do 24 hodin.',
            },
          },
          {
            '@type': 'Question',
            name: 'Kolik vlastních zdrojů potřebuji na hypotéku?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Minimálně 20 % ceny nemovitosti (LTV max 80 %). Pro žadatele do 36 let stačí 10 % (LTV max 90 %).',
            },
          },
          {
            '@type': 'Question',
            name: 'Co je fixace hypotéky?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Fixace je období, po které je garantovaná úroková sazba. Běžné délky: 1, 3, 5, 7, 10 let. Po skončení fixace lze refinancovat bez poplatku.',
            },
          },
        ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
