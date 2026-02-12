export function StructuredData() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hypoteeka.cz';

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Hypoteeka.cz',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: 'Hypoteční poradenství s využitím umělé inteligence. Kalkulačka hypotéky, ověření bonity, porovnání sazeb bank.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Czech',
    },
  };

  const webApplication = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Hypoteeka AI',
    url: siteUrl,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CZK',
    },
    description: 'AI hypoteční poradce Hugo. Spočítá splátku, ověří bonitu, porovná nabídky bank. Za minutu víte, na co dosáhnete.',
    featureList: [
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
    mainEntity: [
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
