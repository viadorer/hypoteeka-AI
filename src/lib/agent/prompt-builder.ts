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
import { getBasePromptParts, getPhaseInstruction, getToolInstruction } from './prompt-service';

export async function buildAgentPrompt(
  profile: ClientProfile,
  state: ConversationState,
  leadScore: LeadScore,
  tenantId: string = 'hypoteeka'
): Promise<string> {
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

  // Contact status
  const hasEmail = !!profile.email;
  const hasPhone = !!profile.phone;
  if (!hasEmail && !hasPhone) {
    parts.push('\nKONTAKT: Ještě NEMÁŠ email ani telefon klienta. Při vhodné příležitosti nabídni zaslání shrnutí na email nebo WhatsApp.');
  } else if (!hasEmail) {
    parts.push(`\nKONTAKT: Máš telefon (${profile.phone}), ale NEMÁŠ email. Při příležitosti nabídni zaslání na email.`);
  } else if (!hasPhone) {
    parts.push(`\nKONTAKT: Máš email (${profile.email}), ale NEMÁŠ telefon. Při příležitosti nabídni kontakt přes WhatsApp.`);
  } else {
    parts.push('\nKONTAKT: Máš email i telefon klienta. Nemusíš se ptát znovu.');
  }

  // Lead capture
  if (shouldOfferLeadCapture(leadScore, state)) {
    parts.push('\nDOPORUČENÍ: Nabídni klientovi kontaktní formulář (show_lead_capture). Je kvalifikovaný.');
  }

  // Widgety které už byly zobrazeny
  if (state.widgetsShown.length > 0) {
    parts.push(`\nJIŽ ZOBRAZENÉ WIDGETY: ${state.widgetsShown.join(', ')} - nezobrazuj je znovu pokud se data nezměnila`);
  }

  // Instrukce pro nástroje (z DB)
  const toolInstruction = await getToolInstruction(tenantId);
  parts.push('\n' + toolInstruction);

  // Závěrečné připomenutí jazyka (Gemini lépe dodržuje instrukce na konci promptu)
  parts.push('\nPŘIPOMÍNKA: Odpovídej VÝHRADNĚ česky latinkou s diakritikou. Žádná azbuka, žádná ruština.');

  return parts.join('\n');
}
