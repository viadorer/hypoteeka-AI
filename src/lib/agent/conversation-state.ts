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

export type ClientPersona =
  | 'unknown'
  | 'first_time_buyer'
  | 'experienced'
  | 'investor'               // legacy — zachováno pro zpětnou kompatibilitu prompts
  | 'investor_first'         // 038: první investiční nemovitost
  | 'investor_portfolio'     // 038: 2+ nemovitostí, zkušený
  | 'complex_case';

/**
 * Vertikála pro broker pool routing (uložené v profile.purpose
 * po intent routing chipech / detekci ze zprávy klienta).
 */
export type ConversationVertical = 'vlastni_bydleni' | 'investice' | 'refinancovani' | 'refixace' | 'unknown';

/**
 * Detekce vertikály z textu klienta — fallback, pokud klient
 * neklikl na intent routing chip. Záměrně tolerantní — pokud
 * není jisté, vrátí 'unknown' a Hugo se zeptá.
 */
export function detectVertical(text: string | undefined | null): ConversationVertical {
  if (!text) return 'unknown';
  const t = text.toLowerCase();

  // Refi / refix má nejvyšší prioritu — slova jsou jednoznačná
  if (/refi(n|x|nanc)|refix|prefinanc|p[rř]efinanc|kon[čc]í fixace|kon[čc]í mi fixace/.test(t)) {
    return 'refinancovani';
  }

  // Investice — pronájem, výnos, cash flow, pasivní příjem
  if (/invest|pron[áa]j|n[áa]jem|v[ýy]nos|cash[\s-]?flow|pasivn[ií] p[rř][ií]jem|yield|cap[\s-]?rate/.test(t)) {
    return 'investice';
  }

  // Vlastní bydlení — pro nás, na bydlení, kupujeme byt/dům
  if (/vlastn[ií]\s*bydlen|na bydlen|pro n[áa]s|kupujeme|chceme byt|hled[áa]me d[ůu]m|prvn[ií] byt/.test(t)) {
    return 'vlastni_bydleni';
  }

  return 'unknown';
}

export interface ConversationState {
  phase: ConversationPhase;
  persona: ClientPersona;
  widgetsShown: string[];
  questionsAsked: string[];
  dataCollected: string[];
  leadScore: number;
  leadQualified: boolean;
  leadCaptured: boolean;
  turnCount: number;
  microConversionsOffered: string[];
}

export function createInitialState(): ConversationState {
  return {
    phase: 'greeting',
    persona: 'unknown',
    widgetsShown: [],
    questionsAsked: [],
    dataCollected: [],
    leadScore: 0,
    leadQualified: false,
    leadCaptured: false,
    turnCount: 0,
    microConversionsOffered: [],
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

/**
 * Detekce persony klienta z profilu
 * - first_time_buyer: mladý (do 36), kupuje poprvé, nemá zkušenosti
 * - experienced: starší, refinancuje, investuje, zná terminologii
 */
export function detectPersona(profile: {
  age?: number;
  purpose?: string;
  existingMortgageBalance?: number;
  existingMortgageRate?: number;
  propertyPrice?: number;
  equity?: number;
  employmentType?: string;
  expectedRentalIncome?: number;
  // 041: investor refinement signály (zúženo na to, co Hugo reálně sbírá v chatu)
  isFirstInvestment?: boolean;
  investmentExperience?: 'none' | 'one' | 'portfolio';
  legalForm?: 'fyzicka_osoba' | 'sro' | 'kombinace';
}): ClientPersona {
  // Investice = investor — rozlišit first vs portfolio podle zkušenosti / formy
  if (profile.purpose === 'investice' || profile.expectedRentalIncome) {
    // Portfolio signály: 2+ nemovitostí nebo s.r.o./kombinace forma
    const portfolioSignal =
      profile.investmentExperience === 'portfolio' ||
      profile.legalForm === 'sro' ||
      profile.legalForm === 'kombinace';
    if (portfolioSignal) return 'investor_portfolio';

    // First-investment signály (explicitní nebo implicitní)
    const firstSignal =
      profile.isFirstInvestment === true ||
      profile.investmentExperience === 'none' ||
      profile.investmentExperience === 'one';
    if (firstSignal) return 'investor_first';

    // Neznáme detaily → zatím obecný "investor" (legacy bucket)
    return 'investor';
  }

  // Refinancování nebo existující hypotéka = zkušený
  if (profile.purpose === 'refinancovani' || profile.existingMortgageBalance || profile.existingMortgageRate) {
    return 'experienced';
  }

  // OSVČ nebo kombinované příjmy = potenciálně komplikovaný případ
  if (profile.employmentType === 'osvc' || profile.employmentType === 'kombinace') {
    return 'complex_case';
  }

  // Mladý = prvokupující
  if (profile.age && profile.age <= 36) {
    return 'first_time_buyer';
  }

  // Starší bez dalších signálů = zkušený
  if (profile.age && profile.age > 40) {
    return 'experienced';
  }

  // Nízké equity vůči ceně = pravděpodobně prvokupující
  if (profile.propertyPrice && profile.equity !== undefined && profile.equity !== null) {
    const equityRatio = profile.equity / profile.propertyPrice;
    if (equityRatio < 0.15) return 'first_time_buyer';
  }

  return 'unknown';
}
