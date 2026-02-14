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

const SCORING_RULES: ScoringRule[] = [
  // Data completeness (max 40 bodů)
  { name: 'Má cenu nemovitosti', points: 10, condition: (p) => !!p.propertyPrice },
  { name: 'Má vlastní zdroje', points: 10, condition: (p) => p.equity !== undefined && p.equity !== null },
  { name: 'Má příjem', points: 10, condition: (p) => !!(p.monthlyIncome || p.totalMonthlyIncome) },
  { name: 'Má typ nemovitosti', points: 5, condition: (p) => !!p.propertyType },
  { name: 'Má lokalitu', points: 5, condition: (p) => !!p.location },

  // Engagement (max 25 bodů)
  { name: 'Více než 3 zprávy', points: 5, condition: (_, s) => s.turnCount > 3 },
  { name: 'Více než 6 zpráv', points: 5, condition: (_, s) => s.turnCount > 6 },
  { name: 'Viděl widget splátky', points: 5, condition: (_, s) => s.widgetsShown.includes('show_payment') },
  { name: 'Viděl widget bonity', points: 5, condition: (_, s) => s.widgetsShown.includes('show_eligibility') },
  { name: 'Viděl více widgetů', points: 5, condition: (_, s) => s.widgetsShown.length >= 3 },

  // Kvalita leadu (max 35 bodů)
  { name: 'Splňuje LTV', points: 10, condition: (p) => {
    if (!p.propertyPrice || p.equity === undefined || p.equity === null) return false;
    const ltv = (p.propertyPrice - p.equity) / p.propertyPrice;
    const limit = p.isYoung ? 0.9 : 0.8;
    return ltv <= limit;
  }},
  { name: 'Splňuje DSTI', points: 10, condition: (p) => {
    if (!p.propertyPrice || (p.equity === undefined || p.equity === null) || !p.monthlyIncome) return false;
    const loan = p.propertyPrice - p.equity;
    const r = 0.045 / 12;
    const n = 360;
    const payment = loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return (payment / p.monthlyIncome) <= 0.45;
  }},
  { name: 'Realistická cena (1-20M)', points: 5, condition: (p) => {
    if (!p.propertyPrice) return false;
    return p.propertyPrice >= 1_000_000 && p.propertyPrice <= 20_000_000;
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

  // What's missing for qualification
  if (!profile.propertyPrice) missingForQualification.push('cena nemovitosti');
  if (profile.equity === undefined || profile.equity === null) missingForQualification.push('vlastni zdroje');
  if (!profile.monthlyIncome && !profile.totalMonthlyIncome) missingForQualification.push('mesicni prijem');
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
