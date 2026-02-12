/**
 * ConversationState - stavový automat konverzace
 * 
 * Fáze:
 * 1. greeting    - úvodní pozdrav, zjištění účelu
 * 2. discovery   - sběr dat (cena, equity, příjem...)
 * 3. analysis    - výpočty a zobrazení widgetů
 * 4. qualification - ověření bonity, scoring leadu
 * 5. conversion  - nabídka kontaktu, prescoring
 * 6. followup    - po odeslání leadu, doplňující info
 */

export type ConversationPhase =
  | 'greeting'
  | 'discovery'
  | 'analysis'
  | 'qualification'
  | 'conversion'
  | 'followup';

export interface ConversationState {
  phase: ConversationPhase;
  widgetsShown: string[];
  questionsAsked: string[];
  dataCollected: string[];
  leadScore: number;
  leadQualified: boolean;
  leadCaptured: boolean;
  turnCount: number;
}

export function createInitialState(): ConversationState {
  return {
    phase: 'greeting',
    widgetsShown: [],
    questionsAsked: [],
    dataCollected: [],
    leadScore: 0,
    leadQualified: false,
    leadCaptured: false,
    turnCount: 0,
  };
}

/**
 * Rozhodne o přechodu do další fáze na základě sebraných dat
 */
export function determinePhase(state: ConversationState, collectedFields: string[]): ConversationPhase {
  const has = (f: string) => collectedFields.includes(f);

  // Pokud už máme lead, jsme ve followup
  if (state.leadCaptured) return 'followup';

  // Pokud máme cenu + equity + příjem -> qualification
  if (has('propertyPrice') && has('equity') && (has('monthlyIncome') || has('totalMonthlyIncome'))) {
    return 'qualification';
  }

  // Pokud máme cenu + equity -> analysis
  if (has('propertyPrice') && has('equity')) {
    return 'analysis';
  }

  // Pokud máme alespoň cenu nebo příjem -> discovery
  if (has('propertyPrice') || has('monthlyIncome') || has('equity')) {
    return 'discovery';
  }

  // Pokud je to první zpráva
  if (state.turnCount <= 1) return 'greeting';

  return 'discovery';
}

/**
 * Vrátí seznam doporučených widgetů pro aktuální fázi
 */
export function getRecommendedWidgets(
  phase: ConversationPhase,
  collectedFields: string[],
  alreadyShown: string[]
): string[] {
  const has = (f: string) => collectedFields.includes(f);
  const notShown = (w: string) => !alreadyShown.includes(w);
  const widgets: string[] = [];

  if (has('propertyPrice') && notShown('show_property')) {
    widgets.push('show_property');
  }

  if (has('propertyPrice') && has('equity') && notShown('show_payment')) {
    widgets.push('show_payment');
  }

  if (phase === 'qualification' || phase === 'conversion') {
    if (has('propertyPrice') && has('equity') && has('monthlyIncome') && notShown('show_eligibility')) {
      widgets.push('show_eligibility');
    }
  }

  if (phase === 'conversion' && notShown('show_lead_capture')) {
    widgets.push('show_lead_capture');
  }

  return widgets;
}

/**
 * Vrátí, na co se má agent zeptat jako další
 */
export function getNextQuestion(
  phase: ConversationPhase,
  collectedFields: string[],
  questionsAsked: string[]
): string | null {
  const has = (f: string) => collectedFields.includes(f);
  const asked = (q: string) => questionsAsked.includes(q);

  // Discovery fáze - sbíráme základní data (prioritní pořadí)
  if (!has('propertyPrice') && !asked('propertyPrice')) {
    return 'propertyPrice';
  }

  if (has('propertyPrice') && !has('equity') && !asked('equity')) {
    return 'equity';
  }

  if (has('propertyPrice') && has('equity') && !has('monthlyIncome') && !asked('monthlyIncome')) {
    return 'monthlyIncome';
  }

  // Doplňkové údaje - ptej se postupně po jednom
  if (has('propertyPrice')) {
    if (!has('purpose') && !asked('purpose')) return 'purpose';
    if (!has('propertyType') && !asked('propertyType')) return 'propertyType';
    if (!has('location') && !asked('location')) return 'location';
  }

  if (has('monthlyIncome')) {
    if (!has('age') && !asked('age')) return 'age';
    if (!has('name') && !asked('name')) return 'name';
  }

  return null;
}
