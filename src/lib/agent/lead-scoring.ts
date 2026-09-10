/**
 * LeadScoring - bodový systém pro kvalifikaci leadu
 * 
 * Skóre 0-100:
 * 0-30:  Studený lead (jen se dívá)
 * 31-60: Teplý lead (aktivně se zajímá)
 * 61-80: Horký lead (má konkrétní záměr)
 * 81-100: Kvalifikovaný lead (splňuje podmínky, připraven jednat)
 */

import type { ClientProfile } from './client-profile';
import type { ConversationState } from './conversation-state';
import { checkEligibility } from '../calculations';

export type LeadTemperature = 'cold' | 'warm' | 'hot' | 'qualified';

export interface LeadScore {
  score: number;
  temperature: LeadTemperature;
  qualified: boolean;
  reasons: string[];
  missingForQualification: string[];
}

interface ScoringRule {
  name: string;
  points: number;
  condition: (profile: ClientProfile, state: ConversationState) => boolean;
}

// Intent helpery — refi a prodej mají jinou definici "kompletních dat".
// Bez nich refi/prodej klient ztrácel 35 bodů za pole, která pro jeho
// situaci nedávají smysl, a prakticky nikdy nedosáhl prahu 61 (pre-match brokera).
const isRefi = (p: ClientProfile) => p.purpose === 'refinancovani' || p.purpose === 'refixace' || (!p.purpose && !!p.existingMortgageBalance);
const isSeller = (p: ClientProfile) => p.purpose === 'prodej';

const SCORING_RULES: ScoringRule[] = [
  // Data completeness (max 40 bodů) — ekvivalenty per intent
  { name: 'Má cenu / zůstatek / ocenění', points: 10, condition: (p) =>
    !!p.propertyPrice || !!p.existingMortgageBalance || !!p.valuationAvgPrice },
  { name: 'Má vlastní zdroje (u refi sazbu, u prodeje adresu)', points: 10, condition: (p) => {
    if (isRefi(p)) return !!p.existingMortgageRate;
    if (isSeller(p)) return !!(p.propertyAddress || p.valuationAvgPrice);
    return p.equity !== undefined && p.equity !== null;
  }},
  { name: 'Má příjem (u prodeje neaplikováno)', points: 10, condition: (p) =>
    isSeller(p) ? !!p.valuationAvgPrice : !!(p.monthlyIncome || p.totalMonthlyIncome) },
  { name: 'Má typ nemovitosti', points: 5, condition: (p) => !!p.propertyType || isRefi(p) },
  { name: 'Má lokalitu', points: 5, condition: (p) => !!p.location || isRefi(p) },

  // Engagement (max 25 bodů)
  { name: 'Více než 3 zprávy', points: 5, condition: (_, s) => s.turnCount > 3 },
  { name: 'Více než 6 zpráv', points: 5, condition: (_, s) => s.turnCount > 6 },
  { name: 'Viděl klíčový widget', points: 5, condition: (_, s) =>
    s.widgetsShown.includes('show_payment') || s.widgetsShown.includes('show_refinance') || s.widgetsShown.includes('request_valuation') },
  { name: 'Viděl widget bonity / stress test', points: 5, condition: (_, s) =>
    s.widgetsShown.includes('show_eligibility') || s.widgetsShown.includes('show_stress_test') },
  { name: 'Viděl více widgetů', points: 5, condition: (_, s) => s.widgetsShown.length >= 3 },

  // Kvalita leadu (max 35 bodů)
  { name: 'Splňuje LTV (u refi/prodeje neaplikováno)', points: 10, condition: (p) => {
    if (isRefi(p)) return !!p.existingMortgageBalance; // banka už úvěr poskytla
    if (isSeller(p)) return !!p.valuationAvgPrice;
    if (!p.propertyPrice || p.equity === undefined || p.equity === null) return false;
    const ltv = (p.propertyPrice - p.equity) / p.propertyPrice;
    const limit = p.isYoung ? 0.9 : 0.8;
    return ltv <= limit;
  }},
  { name: 'Splňuje DSTI (u prodeje neaplikováno)', points: 10, condition: (p) => {
    if (isSeller(p)) return !!p.valuationAvgPrice;
    const income = p.monthlyIncome ?? p.totalMonthlyIncome;
    if (!income) return false;
    const loan = isRefi(p) ? p.existingMortgageBalance : (p.propertyPrice && p.equity != null ? p.propertyPrice - p.equity : undefined);
    if (!loan) return false;
    const r = 0.045 / 12;
    const n = 360;
    const payment = loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return (payment / income) <= 0.45;
  }},
  { name: 'Realistická částka (1-20M)', points: 5, condition: (p) => {
    const amount = p.propertyPrice ?? p.existingMortgageBalance ?? p.valuationAvgPrice;
    if (!amount) return false;
    return amount >= (p.existingMortgageBalance && !p.propertyPrice ? 200_000 : 1_000_000) && amount <= 20_000_000;
  }},
  { name: 'Má kontaktní údaje', points: 10, condition: (p) => !!(p.name || p.email || p.phone) },
];

export function calculateLeadScore(profile: ClientProfile, state: ConversationState): LeadScore {
  let score = 0;
  const reasons: string[] = [];
  const missingForQualification: string[] = [];

  for (const rule of SCORING_RULES) {
    if (rule.condition(profile, state)) {
      score += rule.points;
      reasons.push(`+${rule.points}: ${rule.name}`);
    }
  }

  // Cap at 100
  score = Math.min(100, score);

  // Determine temperature
  let temperature: LeadTemperature;
  if (score >= 81) temperature = 'qualified';
  else if (score >= 61) temperature = 'hot';
  else if (score >= 31) temperature = 'warm';
  else temperature = 'cold';

  // What's missing for qualification — per intent
  if (isSeller(profile)) {
    if (!profile.valuationAvgPrice) missingForQualification.push('oceneni nemovitosti');
  } else if (isRefi(profile)) {
    if (!profile.existingMortgageBalance) missingForQualification.push('zustatek hypoteky');
    if (!profile.existingMortgageRate) missingForQualification.push('soucasna sazba');
    if (!profile.monthlyIncome && !profile.totalMonthlyIncome) missingForQualification.push('mesicni prijem');
  } else {
    if (!profile.propertyPrice) missingForQualification.push('cena nemovitosti');
    if (profile.equity === undefined || profile.equity === null) missingForQualification.push('vlastni zdroje');
    if (!profile.monthlyIncome && !profile.totalMonthlyIncome) missingForQualification.push('mesicni prijem');
  }
  if (score < 61 && state.widgetsShown.length < 2) missingForQualification.push('zobrazit vice vypoctu');

  return {
    score,
    temperature,
    qualified: score >= 61,
    reasons,
    missingForQualification,
  };
}

/**
 * Rozhodne, zda je vhodný moment nabídnout lead capture
 */
export function shouldOfferLeadCapture(score: LeadScore, state: ConversationState): boolean {
  // Nikdy nenabízet příliš brzy
  if (state.turnCount < 4) return false;

  // Už jsme nabídli
  if (state.leadCaptured) return false;

  // Kvalifikovaný lead -> nabídnout
  if (score.temperature === 'qualified') return true;

  // Horký lead po dostatečné konverzaci -> nabídnout
  if (score.temperature === 'hot' && state.turnCount >= 6) return true;

  return false;
}

/**
 * Handoff qualification gate — 5 kritérií, která MUSÍ všechna platit,
 * aby se lead předal partnerskému makléři.
 *
 * Why: lead score je interní signál engagement; handoff je smluvní deliverable
 * vůči partnerovi. Definice qualified je v kontraktu, ne v scoring rules.
 */
export interface HandoffQualification {
  qualified: boolean;
  missing: string[]; // strojově čitelné kódy chybějících kritérií
  reasons: string[]; // lidsky čitelné popisy
}

/**
 * Vrátí "vertikálu" pro broker routing — 3 stavy + unknown.
 * Záměrně zjednodušené z předchozích 8 vertikál; jemnější granularita
 * je v `brokers.specializations` jako tagy, ne v routing typu.
 */
export type RoutingVertical = 'bydleni' | 'investice' | 'refi' | 'prodej' | 'unknown';

export function classifyVerticalForRouting(profile: ClientProfile): RoutingVertical {
  // Prodej má nejvyšší prioritu — explicitní purpose, jde přímo na Davida
  // (nejcennější typ leadu pro realitní byznys, mimo round-robin).
  if (profile.purpose === 'prodej') {
    return 'prodej';
  }

  // Refi / refix má prioritu (explicitní signál klienta)
  if (profile.purpose === 'refinancovani' || profile.purpose === 'refixace') {
    return 'refi';
  }

  // Investice — purpose nebo silný signál (rentální příjem, cíl výnosu)
  if (
    profile.purpose === 'investice' ||
    profile.expectedRentalIncome !== undefined ||
    profile.targetRentalYield !== undefined ||
    profile.isFirstInvestment !== undefined ||
    profile.investmentExperience !== undefined
  ) {
    return 'investice';
  }

  // Vlastní bydlení — purpose nebo přítomnost ceny bez investičního signálu
  if (profile.purpose === 'vlastni_bydleni' || profile.propertyPrice) {
    return 'bydleni';
  }

  return 'unknown';
}

/**
 * Investor-specific qualification kritéria. Vrací doplňující missing
 * pole nad rámec standardního isQualifiedForHandoff().
 */
function investorExtraMissing(profile: ClientProfile): { missing: string[]; reasons: string[] } {
  const missing: string[] = [];
  const reasons: string[] = [];

  if (profile.purpose !== 'investice') {
    missing.push('investor.purpose');
    reasons.push('Klient neoznačil investice jako účel.');
  }

  // Equity ≥ 20 % ceny (investiční LTV strop typicky 80 %)
  if (profile.propertyPrice && profile.equity !== undefined && profile.equity !== null) {
    const equityRatio = profile.equity / profile.propertyPrice;
    if (equityRatio < 0.2) {
      missing.push('investor.equity_ratio');
      reasons.push('Vlastní zdroje < 20 % — investiční LTV limit (typicky 80 %) nebude splněn.');
    }
  }

  // Alespoň 1 signál o nájmu / výnosu
  if (!profile.expectedRentalIncome && profile.targetRentalYield === undefined) {
    missing.push('investor.rental_signal');
    reasons.push('Chybí signál o nájmu (očekávaný nájem nebo cílový výnos).');
  }

  return { missing, reasons };
}

export function isQualifiedForHandoff(
  profile: ClientProfile,
  kind: 'standard' | 'investor' = 'standard',
): HandoffQualification {
  const missing: string[] = [];
  const reasons: string[] = [];

  // 1. Identita
  if (!profile.name) {
    missing.push('identity.name');
    reasons.push('Chybí jméno');
  }
  if (!profile.email && !profile.phone) {
    missing.push('identity.contact');
    reasons.push('Chybí email i telefon');
  }

  // 2. Záměr a horizont
  if (!profile.purpose) {
    missing.push('intent.purpose');
    reasons.push('Není jasný záměr (koupě / refi / refix / investice)');
  }
  if (profile.horizonMonths === undefined || profile.horizonMonths === null) {
    missing.push('intent.horizon');
    reasons.push('Není znám časový horizont');
  }

  // 3. Finanční pozice
  const income = profile.monthlyIncome ?? profile.totalMonthlyIncome;
  if (!income) {
    missing.push('financials.income');
    reasons.push('Chybí měsíční čistý příjem');
  }
  if (profile.equity === undefined || profile.equity === null) {
    missing.push('financials.equity');
    reasons.push('Chybí vlastní zdroje (hotovost)');
  }
  if (!profile.targetLoanAmount && !profile.propertyPrice && !profile.existingMortgageBalance) {
    missing.push('financials.target');
    reasons.push('Chybí požadovaná výše úvěru / cena nemovitosti');
  }

  // 4. Eligibility podle ČNB pravidel — pure function
  if (income && profile.equity !== undefined && profile.equity !== null && profile.propertyPrice) {
    const elig = checkEligibility(profile.propertyPrice, profile.equity, income, profile.isYoung ?? false);
    if (!elig.allOk) {
      missing.push('eligibility');
      reasons.push(...elig.reasons);
    }
  } else if (!missing.some((m) => m.startsWith('financials'))) {
    // financials jsou v pořádku ale nemáme propertyPrice -> pro refi je to OK
    // pro purchase to už je hlášeno výš
  }

  // 5. GDPR consent — kontroluje se až při samotném handoffu, ne tady.
  // Tato funkce ověřuje, že profil JE způsobilý; consent je samostatný gate.
  if (!profile.consentHandoffId) {
    missing.push('consent');
    reasons.push('Chybí GDPR souhlas s předáním partnerovi');
  }

  // 6. Investor-specific (jen pokud kind='investor')
  if (kind === 'investor') {
    const extra = investorExtraMissing(profile);
    missing.push(...extra.missing);
    reasons.push(...extra.reasons);
  }

  return {
    qualified: missing.length === 0,
    missing,
    reasons,
  };
}

export type MicroConversionType = 'specialist_mention' | 'email_capture';

/**
 * Rozhodne, zda nabídnout "měkkou" konverzi dříve v trychtýři.
 * Micro-konverze zachytí uživatele, kteří ještě nejsou připravení na plný formulář.
 */
export function shouldOfferMicroConversion(
  score: LeadScore,
  state: ConversationState
): MicroConversionType | null {
  // Pokud už máme lead, nic nenabízíme
  if (state.leadCaptured) return null;

  // Email capture: score >= 40, alespoň 3 turny, viděl widget, ještě nenabídnuto
  if (
    score.score >= 40 &&
    state.turnCount >= 3 &&
    state.widgetsShown.length >= 1 &&
    !state.microConversionsOffered?.includes('email_capture')
  ) {
    return 'email_capture';
  }

  // Zmínka specialisty: score >= 20, alespoň 2 turny, ještě nezmíněno
  if (
    score.score >= 20 &&
    state.turnCount >= 2 &&
    !state.microConversionsOffered?.includes('specialist_mention')
  ) {
    return 'specialist_mention';
  }

  return null;
}
