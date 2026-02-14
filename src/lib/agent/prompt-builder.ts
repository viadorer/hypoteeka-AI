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
    { key: 'propertyType', label: 'Typ nemovitosti (byt / dům / pozemek)', priority: 'medium' },
    { key: 'location', label: 'Lokalita / město', priority: 'medium' },
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
    // Kontextové situace kdy nabídnout poradce PŘIROZENĚ
    const ctaTriggers: string[] = [];
    if (state.widgetsShown.includes('show_eligibility')) {
      ctaTriggers.push('Po kontrole bonity: "V praxi se zkušený poradce dokáže dostat i na lepší podmínky..."');
    }
    if (state.widgetsShown.includes('show_stress_test')) {
      ctaTriggers.push('Po stress testu: "Správná fixace je klíčová -- poradce vám pomůže vybrat optimální délku."');
    }
    if (state.widgetsShown.includes('show_payment') && state.widgetsShown.includes('show_eligibility')) {
      ctaTriggers.push('Máš splátku i bonitu: "Máte všechno co potřebujete. Teď je ideální čas spojit se s poradcem."');
    }
    if (ctaTriggers.length > 0 && !hasContact) {
      parts.push('\nKDY NABÍDNOUT PORADCE (přirozeně, ne mechanicky):');
      ctaTriggers.forEach(t => parts.push(`- ${t}`));
      if (ctaIntensity === 'medium') {
        parts.push('- Nabídni MAX JEDNOU. Pokud klient nereaguje, pokračuj v analýze.');
      }
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
- TÓN: Povzbuzující, konstruktivní. Jako zkušenější kamarád, ne úředník.
- DÉLKA: Max 2-3 věty mezi widgety. Žádné zdi textu.`);

  return parts.join('\n');
}
