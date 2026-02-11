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

  // Aktuální sazby trhu (live z ČNB API)
  parts.push('\n---\n' + await getRatesContext());

  // Fáze konverzace (z DB)
  const phaseInstruction = await getPhaseInstruction(state.phase, tenantId);
  parts.push('\n---\n' + phaseInstruction);

  // Profil klienta
  parts.push(`\nDATA KLIENTA:\n${profileSummary(profile)}`);

  // Lead score
  parts.push(`\nLEAD SCORE: ${leadScore.score}/100 (${leadScore.temperature})`);
  if (leadScore.missingForQualification.length > 0) {
    parts.push(`Chybí pro kvalifikaci: ${leadScore.missingForQualification.join(', ')}`);
  }

  // Doporučené widgety
  const recommended = getRecommendedWidgets(state.phase, state.dataCollected, state.widgetsShown);
  if (recommended.length > 0) {
    parts.push(`\nDOPORUČENÉ WIDGETY K ZOBRAZENÍ: ${recommended.join(', ')}`);
  }

  // Další otázka
  const nextQ = getNextQuestion(state.phase, state.dataCollected, state.questionsAsked);
  if (nextQ) {
    parts.push(`\nDALŠÍ DOPORUČENÁ OTÁZKA: Zeptej se na "${nextQ}"`);
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
