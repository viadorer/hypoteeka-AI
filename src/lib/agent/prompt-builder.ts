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
import { getBasePromptParts, getPhaseInstruction, getToolInstruction, getRelevantKnowledge, getPersonaPrompt, getOperationalRules, getValuationScenario, getPostValuationStrategy, getFinalReminder } from './prompt-service';
import { getDefaultTenantId, getTenantConfigFromDB } from '../tenant/config';

export type CtaIntensity = 'low' | 'medium' | 'high';

export async function buildAgentPrompt(
  profile: ClientProfile,
  state: ConversationState,
  leadScore: LeadScore,
  tenantId: string = getDefaultTenantId(),
  lastUserMessage?: string,
  ctaIntensityOverride?: CtaIntensity
): Promise<string> {
  const tenantConfig = await getTenantConfigFromDB(tenantId);
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

  // Persona klienta - z DB
  if (state.persona) {
    const personaPrompt = await getPersonaPrompt(state.persona, tenantId);
    if (personaPrompt) {
      parts.push('\n' + personaPrompt);
    }
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

  // Kontinuita se načítá z DB (slug: continuity_rules, category: base_prompt)

  // Lead score (interní, nezobrazuj klientovi)
  parts.push(`\nLEAD: ${leadScore.score}/100 (${leadScore.temperature})`);

  // Provozní pravidla z DB (slug: operational_rules)
  const isValuationPrimary = tenantConfig.features.primaryFlow === 'valuation';
  const operationalRules = await getOperationalRules(tenantId);
  if (operationalRules) {
    parts.push('\n' + operationalRules);
  }

  // === OCENĚNÍ NEMOVITOSTI ===
  const valuationDone = state.widgetsShown.includes('request_valuation') || !!profile.valuationId;
  const geocodeShown = state.widgetsShown.includes('geocode_address');
  const hasValidatedAddress = !!(profile.propertyAddress && profile.propertyLat && profile.propertyLng);

  // Detekce zda klient chce ocenění
  // Pro valuation-primary tenants (odhad.online): ocenění je VŽDY aktivní
  // Pro mortgage-primary tenants (hypoteeka.cz): jen když klient SÁM zmíní ocenění
  const wantsValuation = isValuationPrimary || geocodeShown || hasValidatedAddress || state.widgetsShown.includes('show_valuation');

  // === SCÉNÁŘ OCENĚNÍ -- z DB (slug: valuation_scenario) ===
  if (!valuationDone && wantsValuation) {
    const valuationScenario = await getValuationScenario(tenantId);
    if (valuationScenario) {
      parts.push('\n' + valuationScenario);
    }
  }

  // Injektuj validovanou adresu pokud existuje
  if (hasValidatedAddress) {
    parts.push(`\nVALIDOVANÁ ADRESA: address="${profile.propertyAddress}", lat=${profile.propertyLat}, lng=${profile.propertyLng}. Tyto hodnoty POUŽIJ v request_valuation.`);
  }

  // Stav ocenění -- co ještě chybí (jen pokud klient chce ocenění)
  if (!valuationDone && wantsValuation) {
    const missingForValuation: string[] = [];
    if (!hasValidatedAddress) missingForValuation.push('validovaná adresa (klient musí vybrat z našeptávače)');
    if (!profile.floorArea && profile.propertyType !== 'pozemek') missingForValuation.push('užitná plocha');
    if (!profile.lotArea && (profile.propertyType === 'dum' || profile.propertyType === 'pozemek')) missingForValuation.push('plocha pozemku');
    if (!profile.propertyRating && profile.propertyType !== 'pozemek') missingForValuation.push('stav nemovitosti');
    // construction and dispozice are OPTIONAL -- don't block valuation
    if (!profile.name) missingForValuation.push('jméno a příjmení');
    if (!profile.email) missingForValuation.push('email');
    if (!profile.phone) missingForValuation.push('telefon');
    if (missingForValuation.length > 0) {
      parts.push(`\nPRO OCENĚNÍ JEŠTĚ CHYBÍ: ${missingForValuation.join(', ')}. Zeptej se na VŠECHNO co chybí NAJEDNOU v jedné zprávě.`);
    } else {
      parts.push('\nVŠECHNA DATA PRO OCENĚNÍ SESBÍRÁNA. Shrň údaje a požádej o potvrzení, pak zavolej request_valuation.');
    }
  }

  // === PO OCENĚNÍ -- follow-up konverzace ===
  if (valuationDone && profile.valuationAvgPrice) {
    const price = profile.valuationAvgPrice;
    const fmtP = (n: number) => Math.round(n).toLocaleString('cs-CZ');
    const avgScore = profile.valuationAvgScore;
    const avgAge = profile.valuationAvgAge;
    const avgDist = profile.valuationAvgDistance;
    const duration = profile.valuationAvgDuration;

    // Dynamická data z profilu (toto musí zůstat v kódu - závisí na runtime datech)
    parts.push(`\nVÝSLEDEK OCENĚNÍ:
Cena nemovitosti: ${fmtP(price)} Kč (uložena jako propertyPrice).
${profile.valuationMinPrice ? `Rozmezí: ${fmtP(profile.valuationMinPrice)} - ${fmtP(profile.valuationMaxPrice ?? 0)} Kč` : ''}
${profile.valuationAvgPriceM2 ? `Cena za m²: ${fmtP(profile.valuationAvgPriceM2)} Kč` : ''}
${duration ? `Průměrná doba prodeje: ${duration} dní` : ''}
${profile.cadastralArea ? `Katastr: ${profile.cadastralArea}, parcela ${profile.parcelNumber ?? '?'}` : ''}

KVALITA ODHADU:
${avgScore !== undefined ? `- Shoda srovnatelných: ${(avgScore * 100).toFixed(0)}%${avgScore < 0.6 ? ' -- NÍZKÁ, zdůrazni potřebu osobního posouzení' : ''}` : ''}
${avgAge !== undefined ? `- Stáří dat: ${Math.round(avgAge)} dní${avgAge > 90 ? ' -- STARŠÍ DATA, zmíň že trh se mění' : ''}` : ''}
${avgDist !== undefined ? `- Vzdálenost srovnatelných: ${avgDist > 1000 ? (avgDist / 1000).toFixed(1) + ' km' : avgDist + ' m'}${avgDist > 1000 ? ' -- DALEKO, v okolí je málo srovnatelných' : ''}` : ''}`);

    // Strategie po ocenění z DB (slug: post_valuation_strategy)
    const postValStrategy = await getPostValuationStrategy(tenantId);
    if (postValStrategy) {
      parts.push('\n' + postValStrategy);
    }
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

  // Závěrečné připomenutí z DB (slug: final_reminder, category: guardrail)
  // Gemini lépe dodržuje instrukce na konci promptu
  const finalReminder = await getFinalReminder(tenantId);
  if (finalReminder) {
    parts.push('\n' + finalReminder);
  }

  return parts.join('\n');
}
