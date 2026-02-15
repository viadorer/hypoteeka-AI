/**
 * AgentPromptBuilder - dynamicky staví system prompt podle stavu konverzace
 * 
 * Prompty se načítají z DB (Supabase) přes prompt-service.
 * Fallback na lokální data pokud Supabase není dostupný.
 * 
 * Zdroj pravdy: tabulka prompt_templates (002_prompt_management.sql)
 * Změna promptu = UPDATE v DB, ne deploy.
 */

import type { ClientProfile } from './client-profile';
import { profileSummary } from './client-profile';
import type { ConversationState } from './conversation-state';
import { getRecommendedWidgets, getNextQuestion } from './conversation-state';
import type { LeadScore } from './lead-scoring';
import { shouldOfferLeadCapture } from './lead-scoring';
import { getRatesContext } from '../data/rates';
import { getCnbLimits } from '../data/cnb-limits';
import { getBasePromptParts, getPhaseInstruction, getToolInstruction, getRelevantKnowledge } from './prompt-service';
import { getDefaultTenantId, getTenantConfig } from '../tenant/config';

export type CtaIntensity = 'low' | 'medium' | 'high';

export async function buildAgentPrompt(
  profile: ClientProfile,
  state: ConversationState,
  leadScore: LeadScore,
  tenantId: string = getDefaultTenantId(),
  lastUserMessage?: string,
  ctaIntensityOverride?: CtaIntensity
): Promise<string> {
  const tenantConfig = getTenantConfig(tenantId);
  const ctaIntensity: CtaIntensity = ctaIntensityOverride ?? tenantConfig.features.ctaIntensity;
  // Base prompt z DB (nebo lokální fallback)
  const baseParts = await getBasePromptParts(tenantId);
  const parts: string[] = [...baseParts];

  // Aktuální sazby trhu (live z ČNB API + bank spreads z DB)
  parts.push('\n---\n' + await getRatesContext(tenantId));

  // Aktuální limity ČNB (z DB nebo fallback)
  const cnbLimits = await getCnbLimits(tenantId);
  parts.push(`\nAKTUÁLNÍ LIMITY ČNB (platné od ${cnbLimits.validFrom}, zdroj: ${cnbLimits.source}):
- LTV: max ${(cnbLimits.ltvLimit * 100).toFixed(0)} % (${(cnbLimits.ltvLimitYoung * 100).toFixed(0)} % pro žadatele do ${cnbLimits.youngAgeLimit} let)
- DSTI: max ${(cnbLimits.dstiLimit * 100).toFixed(0)} % čistého měsíčního příjmu
- DTI: max ${cnbLimits.dtiLimit}x ročního čistého příjmu`);

  // Fáze konverzace (z DB)
  const phaseInstruction = await getPhaseInstruction(state.phase, tenantId);
  parts.push('\n---\n' + phaseInstruction);

  // Profil klienta - KLÍČOVÁ SEKCE pro kontinuitu
  const summary = profileSummary(profile);
  parts.push(`\n---\nDATA KLIENTA (toto už víš, NEPTEJ SE na to znovu):\n${summary}`);

  // Persona klienta - přizpůsob tón
  if (state.persona === 'first_time_buyer') {
    parts.push(`\nPERSONA: PRVOKUPUJÍCÍ (edukace + empatie)
- Klient pravděpodobně kupuje poprvé, může mít strach a nejistotu
- Vysvětluj jednoduše, žádná bankovní hantýrka (LTV, DSTI vysvětli lidsky)
- Buď trpělivý, veď za ruku, povzbuzuj
- Zdůrazni výjimky pro mladé (LTV 90 % do 36 let) pokud je relevantní
- Příklad tónu: "Spousta lidí začíná stejně jako vy. Pojďme si to projít krok po kroku."
- Nabízej edukaci: co je fixace, jak funguje schvalování, co čekat`);
  } else if (state.persona === 'investor') {
    parts.push(`\nPERSONA: INVESTOR (expertní přístup + čísla)
- Klient hledá pákový efekt a výnosnost, ne bydlení
- Mluv jazykem investic: cash flow, výnosnost, pákový efekt
- Zdůrazni specifika investičních hypoték: vyšší LTV požadavky, vyšší sazba
- Nabídni investiční analýzu (show_investment) co nejdříve
- Zmiň možnost kombinace se stavebním spořením pro vykrytí vlastních zdrojů
- Příklad tónu: "Při nájmu 15 000 Kč a splátce 12 000 Kč vychází kladný cash flow. Pojďme to spočítat přesně."`);
  } else if (state.persona === 'complex_case') {
    parts.push(`\nPERSONA: KOMPLIKOVANÝ PŘÍPAD (empatie + řešení)
- Klient může mít: OSVČ příjmy, kombinované příjmy, příjmy ze zahraničí, předchozí zamítnutí
- NIKDY neříkej "to nepůjde" -- vždy ukaž cestu
- Zdůrazni, že specialista řeší i složitější případy
- Buď extra empatický -- klient pravděpodobně už zažil odmítnutí
- Příklad tónu: "Rozumím, OSVČ příjmy mají svá specifika. Pojďme se podívat na vaši situaci -- banky mají různé přístupy."
- Sbírej data normálně, ale při kvalifikaci vždy nabídni specialistu`);
  } else if (state.persona === 'experienced') {
    parts.push(`\nPERSONA: ZKUŠENÝ KLIENT (efektivita + čísla)
- Klient zná základy, chce rychlé a přesné odpovědi
- Méně vysvětlování, více dat a srovnání
- Můžeš použít odborné termíny (LTV, DSTI, fixace) bez vysvětlování
- Soustřeď se na optimalizaci: lepší sazba, správná fixace, úspora
- Příklad tónu: "Při vaší sazbě 4,8 % a zbytku 2,1M na 18 let vychází úspora refinancováním na 340 Kč měsíčně."
- Nabízej pokročilé analýzy: stress test, amortizace, investiční výnos`);
  }

  // Checklist chybějících dat - Hugo musí aktivně sbírat
  const allFields: Array<{ key: keyof ClientProfile; label: string; priority: 'high' | 'medium' | 'low' }> = [
    { key: 'propertyPrice', label: 'Cena nemovitosti', priority: 'high' },
    { key: 'equity', label: 'Vlastní zdroje', priority: 'high' },
    { key: 'monthlyIncome', label: 'Měsíční příjem', priority: 'high' },
    { key: 'purpose', label: 'Účel (vlastní bydlení / investice / refinancování)', priority: 'high' },
    { key: 'propertyType', label: 'Typ nemovitosti (byt / dům / pozemek)', priority: 'high' },
    { key: 'propertySize', label: 'Dispozice (1+kk, 2+kk, 3+1...)', priority: 'high' },
    { key: 'location', label: 'Lokalita / město', priority: 'high' },
    { key: 'age', label: 'Věk (důležité pro LTV limit)', priority: 'medium' },
    { key: 'name', label: 'Jméno', priority: 'low' },
  ];
  const missing = allFields.filter(f => {
    const val = profile[f.key];
    return val === undefined || val === null;
  });
  if (missing.length > 0) {
    const highMissing = missing.filter(f => f.priority === 'high').map(f => f.label);
    const medMissing = missing.filter(f => f.priority === 'medium').map(f => f.label);
    const lowMissing = missing.filter(f => f.priority === 'low').map(f => f.label);
    parts.push('\nCHYBĚJÍCÍ DATA (aktivně se ptej, po jednom údaji):');
    if (highMissing.length > 0) parts.push(`  PRIORITNÍ: ${highMissing.join(', ')}`);
    if (medMissing.length > 0) parts.push(`  DOPLŇKOVÉ: ${medMissing.join(', ')}`);
    if (lowMissing.length > 0) parts.push(`  VOLITELNÉ: ${lowMissing.join(', ')}`);
    parts.push('- Ptej se PŘIROZENĚ v kontextu konverzace, ne jako formulář.');
    parts.push('- Po každém výpočtu se zeptej na JEDEN chybějící údaj.');
    parts.push('- Účel často vyplyne z kontextu ("investiční" = investice) - odvoď a ulož přes update_profile.');
  } else {
    parts.push('\nVŠECHNA KLÍČOVÁ DATA SESBÍRÁNA. Soustřeď se na analýzu a konverzi.');
  }

  parts.push(`\nKONTINUITA:
- Data klienta výše jsou FAKTA. Neptej se na ně znovu.
- Máš data pro výpočet? Udělej ho HNED. Neptej se jestli chce vidět výsledek.
- Víc údajů najednou? Zpracuj VŠECHNY najednou (update_profile + widgety).
- Neříkej co budeš dělat -- prostě to udělej.`);

  // Lead score (interní, nezobrazuj klientovi)
  parts.push(`\nLEAD: ${leadScore.score}/100 (${leadScore.temperature})`);

  // === OCENĚNÍ NEMOVITOSTI ===
  const valuationDone = state.widgetsShown.includes('request_valuation') || !!profile.valuationId;
  const geocodeShown = state.widgetsShown.includes('geocode_address');
  const hasValidatedAddress = !!(profile.propertyAddress && profile.propertyLat && profile.propertyLng);

  // === FÁZE 1: TEASER -- vzbudit zájem ===
  if (profile.propertyType && profile.location && !valuationDone && !geocodeShown) {
    parts.push(`
OCENĚNÍ -- FÁZE 1 (TEASER):
Klient zmínil nemovitost a lokalitu. NEVYSKAKUJ s "ocenění zdarma". Místo toho vzbuď zvědavost:
- "Zajímavé, u ${profile.propertyType === 'byt' ? 'bytů' : profile.propertyType === 'dum' ? 'domů' : 'pozemků'} v ${profile.location} vidíme v posledních měsících zajímavý cenový vývoj. Chcete vědět, jakou má vaše nemovitost aktuální tržní hodnotu? Mám přístup k datům z reálných transakcí."
- Cíl: klient řekne "ano, chci vědět" -- teprve pak pokračuj na sběr dat.
- NIKDY neříkej "ocenění zdarma" v této fázi. Prodáváš HODNOTU, ne slevu.`);
  }

  // === SCÉNÁŘ OCENĚNÍ -- kompletní prodejní flow ===
  if (!valuationDone) {
    parts.push(`
SCÉNÁŘ OCENĚNÍ -- PRODEJNÍ FLOW:

!!! ABSOLUTNÍ ZÁKAZY !!!
- NIKDY se NEPTEJ na cenu nemovitosti, propertyPrice, odhadovanou cenu ani prodejní cenu. Účel ocenění JE ZJISTIT cenu. Klient ji NEZNÁ.
- NIKDY si NEVYMÝŠLEJ data (telefon, email, jméno). Používej JEN to co klient napsal.
- NIKDY nepiš doprovodný text když voláš geocode_address. Žádné "Výborně, vyberte adresu". ŽÁDNÝ TEXT. Jen tool call.

OBECNÁ PRAVIDLA:
- EXTRAHUJ VŠECHNA DATA Z KAŽDÉ ZPRÁVY: Klient řekne "byt 3+1 88m2" -> update_profile(propertyType="byt", propertySize="3+1", floorArea=88).
- UKLÁDEJ PRŮBĚŽNĚ: Po KAŽDÉ odpovědi klienta HNED zavolej update_profile.
- ROZPOVÍDEJ KLIENTA: Ptej se otevřenými otázkami, projevuj zájem. Ne formulář, ale konverzace.
- Vlastnictví VŽDY nastav na "private" -- NEPTEJ SE na to.

FÁZE 2 -- SBĚR DAT:
- Klient řekne typ a adresu? -> HNED zavolej update_profile + geocode_address SOUČASNĚ. Žádný mezikrok "kde se nachází?".
- Klient řekne typ ale ne adresu? -> Zeptej se na adresu A další chybějící údaje NAJEDNOU.
- Klient řekne adresu? -> HNED zavolej geocode_address BEZ JAKÉHOKOLIV TEXTU.
- PO VÝBĚRU ADRESY: Zeptej se na VŠECHNA chybějící pole NAJEDNOU:
  BYT: dispozice, plocha, stav, konstrukce
  DŮM: plocha domu, plocha pozemku, stav, konstrukce
  POZEMEK: plocha (to je vše)

FÁZE 3 -- KONTAKT:
- "Ještě potřebuji vaše kontaktní údaje -- report vám pošlu na email a odhadce vás může kontaktovat pro zpřesnění."
- Požádej o jméno, příjmení, email A TELEFON V JEDNÉ ZPRÁVĚ.
- "jan novak jan@email.cz 774111222" -> name="jan novak", email="jan@email.cz", phone="774111222". ULOŽ VŠE, neptej se znovu.
- Pokud chybí jen telefon, zeptej se JEN na telefon: "Ještě potřebuji telefon, aby vás mohl kontaktovat odhadce."
- NIKDY si nevymýšlej telefon ani jiné kontaktní údaje!

FÁZE 4 -- SHRNUTÍ A ODESLÁNÍ:
- Shrň údaje a požádej o potvrzení. Po "ano" zavolej request_valuation.

FÁZE 5 -- VÝSLEDEK:
- "Orientační tržní cena je X Kč. Odhad vychází z dat o reálných transakcích. Report jsem poslal na email."
- "Toto je orientační odhad. Náš odhadce vás bude kontaktovat pro zpřesnění -- nezávazně a zdarma."
- Naváž: "Plánujete prodat, nebo řešíte financování jiné nemovitosti?"

POVINNÁ POLE (bez nich API vrátí chybu):
- BYT: floorArea (užitná plocha), propertyRating (stav)
- DŮM: floorArea (užitná plocha), lotArea (plocha pozemku), propertyRating (stav)
- POZEMEK: lotArea (plocha pozemku)
- VŽDY: name, email, phone, propertyType, validovaná adresa

VOLITELNÁ POLE (zlepšují přesnost -- ptej se na ně ale NEBLOKUJ odeslání):
- propertySize/localType (dispozice: 2+1, 3+kk) -- pro byty
- propertyConstruction (konstrukce: brick, panel, wood)
- propertyFloor, propertyTotalFloors, propertyElevator -- pro byty

MAPOVÁNÍ (ptej se česky, ukládej anglicky):
- Stav: špatný=bad, nic moc=nothing_much, dobrý=good, velmi dobrý=very_good, nový/novostavba=new, po rekonstrukci/výborný=excellent
- Konstrukce: cihla=brick, panel=panel, dřevo=wood, kámen=stone, montovaná=montage
- Typ: byt=flat, dům=house, pozemek=land`);
  }

  // Injektuj validovanou adresu pokud existuje
  if (hasValidatedAddress) {
    parts.push(`\nVALIDOVANÁ ADRESA: address="${profile.propertyAddress}", lat=${profile.propertyLat}, lng=${profile.propertyLng}. Tyto hodnoty POUŽIJ v request_valuation.`);
  }

  // Stav ocenění -- co ještě chybí
  if (geocodeShown && !valuationDone) {
    const missingForValuation: string[] = [];
    if (!hasValidatedAddress) missingForValuation.push('adresa (klient ještě nevybral z našeptávače)');
    if (!profile.floorArea && profile.propertyType !== 'pozemek') missingForValuation.push('užitná plocha');
    if (!profile.lotArea && (profile.propertyType === 'dum' || profile.propertyType === 'pozemek')) missingForValuation.push('plocha pozemku');
    if (!profile.propertyRating && profile.propertyType !== 'pozemek') missingForValuation.push('stav nemovitosti');
    // construction and dispozice are OPTIONAL -- don't block valuation
    if (!profile.name) missingForValuation.push('jméno a příjmení');
    if (!profile.email) missingForValuation.push('email');
    if (!profile.phone) missingForValuation.push('telefon');
    if (missingForValuation.length > 0) {
      parts.push(`\nPRO OCENĚNÍ JEŠTĚ CHYBÍ: ${missingForValuation.join(', ')}. Zeptej se na vše najednou.`);
    } else {
      parts.push('\nVŠECHNA DATA PRO OCENĚNÍ SESBÍRÁNA. Shrň údaje a požádej o potvrzení, pak zavolej request_valuation.');
    }
  }

  // === PO OCENĚNÍ -- follow-up konverzace ===
  if (valuationDone && profile.valuationAvgPrice) {
    const price = profile.valuationAvgPrice;
    const fmtP = (n: number) => Math.round(n).toLocaleString('cs-CZ');
    const hasEquity = profile.equity !== undefined && profile.equity !== null;
    const hasIncome = !!profile.monthlyIncome || !!profile.totalMonthlyIncome;
    const avgScore = profile.valuationAvgScore;
    const avgAge = profile.valuationAvgAge;
    const avgDist = profile.valuationAvgDistance;
    const duration = profile.valuationAvgDuration;

    parts.push(`
PO OCENĚNÍ -- POKRAČUJ V KONVERZACI:

Cena nemovitosti: ${fmtP(price)} Kč (uložena jako propertyPrice).
${profile.valuationMinPrice ? `Rozmezí: ${fmtP(profile.valuationMinPrice)} - ${fmtP(profile.valuationMaxPrice ?? 0)} Kč` : ''}
${profile.valuationAvgPriceM2 ? `Cena za m²: ${fmtP(profile.valuationAvgPriceM2)} Kč` : ''}
${duration ? `Průměrná doba prodeje: ${duration} dní` : ''}
${profile.cadastralArea ? `Katastr: ${profile.cadastralArea}, parcela ${profile.parcelNumber ?? '?'}` : ''}

KVALITA ODHADU:
${avgScore !== undefined ? `- Shoda srovnatelných: ${(avgScore * 100).toFixed(0)}%${avgScore < 0.6 ? ' ⚠️ NÍZKÁ -- zdůrazni potřebu osobního posouzení' : ''}` : ''}
${avgAge !== undefined ? `- Stáří dat: ${Math.round(avgAge)} dní${avgAge > 90 ? ' ⚠️ STARŠÍ DATA -- zmíň že trh se mění' : ''}` : ''}
${avgDist !== undefined ? `- Vzdálenost srovnatelných: ${avgDist > 1000 ? (avgDist / 1000).toFixed(1) + ' km' : avgDist + ' m'}${avgDist > 1000 ? ' ⚠️ DALEKO -- v okolí je málo srovnatelných' : ''}` : ''}

TVŮJ CÍL: Rozpovídat klienta a nabídnout další služby. NEPTEJ SE "mohu ještě s něčím pomoci?" -- místo toho AKTIVNĚ nabídni konkrétní analýzu.

STRATEGIE PODLE SITUACE:
${!hasEquity ? `1. HYPOTÉKA (hlavní cíl): "Na základě ocenění ${fmtP(price)} Kč vám můžu hned spočítat hypotéku. Kolik máte přibližně naspořeno na vlastní zdroje?"
   -> Po odpovědi: zavolej show_payment s propertyPrice=${price} a equity.` : ''}
${hasEquity && !hasIncome ? `1. BONITA: "Máte vlastní zdroje ${fmtP(profile.equity!)} Kč. Chcete vědět, jestli vám banka hypotéku schválí? Stačí mi říct váš měsíční čistý příjem."
   -> Po odpovědi: zavolej show_eligibility.` : ''}
${hasEquity && hasIncome ? `1. KOMPLETNÍ ANALÝZA: Máš všechna data pro výpočet. HNED zavolej show_payment a show_eligibility.` : ''}

2. INVESTICE (pokud klient zmíní pronájem): "Zajímá vás, jaký výnos by nemovitost přinesla při pronájmu? Můžu spočítat investiční analýzu."
   -> Zeptej se na očekávaný měsíční nájem, pak zavolej show_investment.

3. NÁJEM vs KOUPĚ: "Pokud teď platíte nájem, můžu porovnat co se víc vyplatí -- zůstat v nájmu nebo koupit. Kolik platíte měsíčně?"
   -> Po odpovědi: zavolej show_rent_vs_buy.

4. PRODEJ: Pokud klient plánuje prodat, zmíň dobu prodeje: "${duration ? `Podobné nemovitosti se v okolí prodávají průměrně za ${duration} dní.` : ''} Náš specialista vám pomůže s celým procesem prodeje."

5. REFINANCOVÁNÍ: Pokud má klient stávající hypotéku: "Máte aktuálně hypotéku? S dnešními sazbami by se vám mohlo vyplatit refinancování."

TAKTIKY PRO ROZPOVÍDÁNÍ:
- Ptej se na SITUACI klienta: "Co s nemovitostí plánujete?" / "Řešíte teď nějaké bydlení?"
- Reaguj na kontext: prodej → doba prodeje + specialista, koupě → hypotéka, investice → výnos
- Vždy měj připravený KONKRÉTNÍ výpočet -- ne obecné řeči
- Pokud klient neví, nabídni: "Většina klientů po ocenění řeší hypotéku. Chcete, abych vám ukázal, jaká by byla splátka?"
`);
  }

  // Doporučené widgety
  const recommended = getRecommendedWidgets(state.phase, state.dataCollected, state.widgetsShown);
  if (recommended.length > 0) {
    parts.push(`\nZOBRAZ HNED: ${recommended.join(', ')}`);
  }

  // Další otázka
  if (recommended.length === 0) {
    const nextQ = getNextQuestion(state.phase, state.dataCollected, state.questionsAsked);
    if (nextQ) {
      parts.push(`\nZEPTEJ SE NA: ${nextQ}`);
    }
  }

  // Kontextové CTA -- nabízej poradce podle SITUACE, ne podle počtu widgetů
  const hasEmail = !!profile.email;
  const hasPhone = !!profile.phone;
  const hasContact = hasEmail || hasPhone;

  if (hasContact) {
    if (hasEmail) parts.push(`\nKontakt: email ${profile.email}`);
    if (hasPhone) parts.push(`Kontakt: telefon ${profile.phone}`);
  }

  // Kontextové triggery pro CTA (místo mechanického počítání widgetů)
  if (ctaIntensity === 'low') {
    parts.push('\nKONTAKT: Nabízej poradce POUZE když se klient sám zeptá nebo ve fázi konverze.');
  } else {
    // Nabídni poradce MAX JEDNOU za konverzaci, přirozeně
    const alreadyOffered = state.widgetsShown.includes('show_lead_capture') || state.widgetsShown.includes('show_specialists');
    if (!alreadyOffered && !hasContact && state.widgetsShown.length >= 2) {
      parts.push('\nSPECIALISTA: Můžeš JEDNOU zmínit možnost konzultace. Neopakuj pokud klient nereaguje.');
      parts.push('- Formuluj jako nabídku, ne jako tlak: "Kdybyste chtěl probrat konkrétní nabídky bank, náš specialista to rád vezme."');
      parts.push('- NIKDY neříkej "doporučuji kontaktovat" opakovaně.');
    }
  }

  // Lead capture
  if (shouldOfferLeadCapture(leadScore, state) && !hasContact) {
    parts.push('\nKlient je připravený. Nabídni kontakt PŘIROZENĚ v kontextu konverzace.');
  }

  // Již zobrazené widgety
  if (state.widgetsShown.length > 0) {
    parts.push(`\nUŽ ZOBRAZENO: ${state.widgetsShown.join(', ')} -- nezobrazuj znovu pokud se data nezměnila`);
  }

  // Knowledge base - relevantní znalosti z DB
  const kbEntries = await getRelevantKnowledge(tenantId, {
    lastUserMessage,
    phase: state.phase,
    profileFields: state.dataCollected,
    widgetsShown: state.widgetsShown,
  });
  if (kbEntries.length > 0) {
    parts.push('\n---\nZNALOSTNÍ BÁZE (použij tyto informace ve své odpovědi, pokud jsou relevantní):');
    for (const entry of kbEntries) {
      parts.push(`[${entry.category}] ${entry.title}: ${entry.content}`);
    }
  }

  // Instrukce pro nástroje (z DB)
  const toolInstruction = await getToolInstruction(tenantId);
  parts.push('\n' + toolInstruction);

  // Závěrečné připomenutí (Gemini lépe dodržuje instrukce na konci promptu)
  parts.push(`
*** PŘIPOMENUTÍ ***
- JAZYK: Výhradně česky latinkou s háčky a čárkami. Nikdy azbuka/cyrilice.
- MĚNA: Vždy "Kč" (s háčkem).
- NIKDY NEODMÍTEJ: Nesplňuje limit? Řekni "tady potřebujeme zapracovat na..." a ukaž KONKRÉTNÍ ŘEŠENÍ.
- TÓN: Pozitivní, podpůrný. NIKDY nezpochybňuj klienta. Žádné "nicméně", "ovšem", "na druhou stranu" po klientově tvrzení.
- VALIDACE: Klient má pravdu. Když řekne sazbu, použij ji. Když řekne svůj pohled, souhlasíš a pracuješ s ním.
- DÉLKA: Max 2-3 věty mezi widgety. Žádné zdi textu.
- CTA: Specialistu nabídni MAX JEDNOU. Pokud klient nereaguje, pokračuj v analýze.`);

  return parts.join('\n');
}
