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
  parts.push(`\nKRITICKÉ PRAVIDLO KONTINUITY:\n- Výše uvedená data klienta jsou FAKTA z konverzace. NIKDY se na ně neptej znovu.\n- Pokud máš dostatek dat pro výpočet, OKAMŽITĚ ho proveď a ukaž widget. Neptej se, jestli to má klient zájem vidět.\n- Pokud klient zadá více údajů najednou (např. "byt za 5 mil, mám 1 mil a beru 60 tisíc"), zpracuj VŠECHNY najednou - zavolej update_profile + všechny relevantní widgety v jednom kroku.\n- Neříkej "teď vám spočítám" - prostě to spočítej a ukaž.\n- Neptej se "chcete vidět splátku?" - prostě ji ukaž.\n- Jednej, nemluv o tom co budeš dělat.`);

  // Lead score
  parts.push(`\nLEAD SCORE: ${leadScore.score}/100 (${leadScore.temperature})`);
  if (leadScore.missingForQualification.length > 0) {
    parts.push(`Chybí pro kvalifikaci: ${leadScore.missingForQualification.join(', ')}`);
  }

  // Doporučené widgety
  const recommended = getRecommendedWidgets(state.phase, state.dataCollected, state.widgetsShown);
  if (recommended.length > 0) {
    parts.push(`\nDOPORUČENÉ WIDGETY K ZOBRAZENÍ (zavolej je HNED, neptej se): ${recommended.join(', ')}`);
  }

  // Další otázka - jen pokud NEMÁME doporučené widgety (akce má přednost)
  if (recommended.length === 0) {
    const nextQ = getNextQuestion(state.phase, state.dataCollected, state.questionsAsked);
    if (nextQ) {
      parts.push(`\nJEDINÝ CHYBĚJÍCÍ ÚDAJ: ${nextQ} - zeptej se na něj (ale jen pokud ho opravdu nemáš v datech klienta výše)`);
    }
  }

  // Contact / CTA section - driven by ctaIntensity setting
  const hasEmail = !!profile.email;
  const hasPhone = !!profile.phone;
  const widgetCount = state.widgetsShown.length;

  if (ctaIntensity === 'low') {
    // LOW: only mention contact when client explicitly asks or after qualification
    parts.push('\nKONTAKT (režim: nízká intenzita):');
    parts.push('- Nabízej email/poradce POUZE když se klient sám zeptá nebo když je ve fázi kvalifikace/konverze.');
    parts.push('- Jinak se soustřeď na výpočty a odpovědi. Klient si řekne sám.');
    if (hasEmail) parts.push(`- Máš email: ${profile.email}`);
    if (hasPhone) parts.push(`- Máš telefon: ${profile.phone}`);
  } else if (ctaIntensity === 'medium') {
    // MEDIUM: offer contact once after 2+ widgets, not repeatedly
    parts.push('\nKONTAKT (režim: střední intenzita):');
    if (!hasEmail && !hasPhone) {
      if (widgetCount >= 2) {
        parts.push('- Už jsi ukázal 2+ widgety. Můžeš JEDNOU nabídnout: "Chcete, abych vám poslal shrnutí na email?" Pokud klient nereaguje, NENABÍZEJ znovu.');
      } else {
        parts.push('- Zatím se soustřeď na výpočty. Kontakt nabídni až po zobrazení alespoň 2 widgetů.');
      }
    } else {
      if (hasEmail) parts.push(`- Máš email: ${profile.email}`);
      if (hasPhone) parts.push(`- Máš telefon: ${profile.phone}`);
      if (state.phase === 'qualification' || state.phase === 'conversion') {
        parts.push('- Klient je kvalifikovaný. Nabídni bezplatnou schůzku se specialistou.');
      }
    }
  } else {
    // HIGH: proactive contact offers
    parts.push('\nKONTAKT (režim: vysoká intenzita):');
    if (!hasEmail && !hasPhone) {
      if (widgetCount >= 1) {
        parts.push('- Nabídni zaslání výsledků na email nebo spojení se specialistou.');
      }
    } else if (!hasEmail) {
      parts.push(`- Máš telefon (${profile.phone}), nabídni i email pro zaslání shrnutí.`);
    } else if (!hasPhone) {
      parts.push(`- Máš email (${profile.email}), nabídni spojení přes WhatsApp nebo telefon.`);
    } else {
      parts.push('- Máš email i telefon. Nabídni sjednání bezplatné schůzky.');
    }
  }

  // Lead capture - respect intensity
  if (shouldOfferLeadCapture(leadScore, state)) {
    if (ctaIntensity === 'low') {
      parts.push('\nKlient je kvalifikovaný. Pokud se zeptá na další kroky, nabídni show_lead_capture.');
    } else {
      parts.push('\nKlient je kvalifikovaný. Nabídni kontaktní formulář (show_lead_capture).');
    }
  }

  // Schůzka - only in conversion phases, respect intensity
  if (state.phase === 'conversion' || state.phase === 'followup') {
    if (ctaIntensity !== 'low') {
      parts.push('\nSCHŮZKA: Nabídni bezplatnou konzultaci se specialistou.');
    }
  }

  // Widgety které už byly zobrazeny
  if (state.widgetsShown.length > 0) {
    parts.push(`\nJIŽ ZOBRAZENÉ WIDGETY: ${state.widgetsShown.join(', ')} - nezobrazuj je znovu pokud se data nezměnila`);
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
  parts.push('\n*** ZÁVĚREČNÁ PRAVIDLA ***');
  parts.push('- JAZYK: Piš VÝHRADNĚ česky LATINKOU s háčky a čárkami. NIKDY nepoužívej azbuku (cyrilici), ruštinu ani jiný jazyk.');
  parts.push('- FORMÁT MĚNY: Vždy "Kč" (s háčkem), nikdy "Kc".');

  // NEVER REJECT guardrail
  parts.push(`
*** NIKDY NEODMÍTEJ KLIENTA ***
- NIKDY neříkej "nesplňujete podmínky" nebo "na hypotéku nedosáhnete" jako konečný verdikt.
- Pokud klient nesplňuje limit (LTV, DSTI, DTI), VŽDY ukaž KONKRÉTNÍ CESTU K ŘEŠENÍ:
  - LTV překročeno? -> "Potřebujete navýšit vlastní zdroje o X Kč. Možnosti: spoření, dar od rodiny, stavební spoření, zástava jiné nemovitosti."
  - DSTI překročeno? -> "Splátka je příliš vysoká vzhledem k příjmu. Řešení: delší splatnost, nižší úvěr, přidání spolužadatele, zvýšení příjmu."
  - DTI překročeno? -> "Celkový dluh je vysoký. Řešení: splatit jiné úvěry, přidat spolužadatele, snížit požadovanou částku."
- Nemá vlastní zdroje? -> Spočítej splátku pro ilustraci, vysvětli kolik potřebuje naspořit, nabídni plán spoření.
- VŽDY konči pozitivně: "Náš specialista vám pomůže najít optimální řešení pro vaši situaci."
- Specialista z Hypoteeky dokáže vyřešit i složité případy - vždy ho nabídni jako cestu vpřed.
- Tón: povzbuzující, konstruktivní. Nikdy pesimistický nebo odmítavý.`);

  return parts.join('\n');
}
