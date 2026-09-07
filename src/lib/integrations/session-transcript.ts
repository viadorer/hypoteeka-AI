/**
 * Přepis session pro poradce — co klient řekl, co Hugo spočítal.
 *
 * Sestaví z dat, která hypoteeka drží ve schématu `hypoteeka`
 * (sessions, messages, widget_events), čitelný text a strukturovaný objekt.
 * Používá se při předání leadu do PTF, aby poradce v případu viděl celý
 * kontext a nemusel se klienta ptát na to, co už Hugovi řekl.
 */

import { storage } from '../storage';
import { formatCZK, formatPercent } from '../format';
import type { SessionData, WidgetEventRecord } from '../storage/types';

/** Lidské názvy kalkulaček — widget_type je technický (payment, ltv…). */
const WIDGET_LABELS: Record<string, string> = {
  payment: 'Měsíční splátka',
  affordability: 'Kolik si můžu půjčit',
  eligibility: 'Posouzení bonity (LTV/DSTI/DTI)',
  amortization: 'Splátkový kalendář',
  rent_vs_buy: 'Nájem vs. hypotéka',
  investment: 'Investiční výnos',
  refinance: 'Refinancování',
  stress_test: 'Stress test sazby',
  rate_comparison: 'Srovnání sazeb',
  valuation: 'Odhad ceny nemovitosti',
  property: 'Detail nemovitosti',
  timeline: 'Časový plán',
  checklist: 'Checklist dokumentů',
  appointment: 'Objednání schůzky',
  specialists: 'Specialisté',
  lead_capture: 'Kontaktní formulář',
  geocode_address: 'Vyhledání adresy',
  request_valuation: 'Žádost o ocenění',
};

/** Pole profilu, která poradce zajímají, v pořadí pro výpis. */
const PROFILE_LABELS: Array<[string, string, 'czk' | 'pct' | 'text' | 'years']> = [
  ['propertyPrice', 'Cena nemovitosti', 'czk'],
  ['equity', 'Vlastní zdroje', 'czk'],
  ['targetLoanAmount', 'Požadovaný úvěr', 'czk'],
  ['monthlyIncome', 'Měsíční příjem', 'czk'],
  ['partnerIncome', 'Příjem partnera', 'czk'],
  ['totalMonthlyIncome', 'Příjem domácnosti celkem', 'czk'],
  ['monthlyExpenses', 'Měsíční výdaje', 'czk'],
  ['existingLoans', 'Stávající úvěry', 'czk'],
  ['maxMonthlyPayment', 'Max. splátka', 'czk'],
  ['currentRent', 'Současný nájem', 'czk'],
  ['expectedRentalIncome', 'Očekávaný nájem', 'czk'],
  ['propertyType', 'Typ nemovitosti', 'text'],
  ['propertyAddress', 'Adresa', 'text'],
  ['location', 'Lokalita', 'text'],
  ['propertySize', 'Velikost', 'text'],
  ['purpose', 'Účel', 'text'],
  ['employmentType', 'Typ příjmu', 'text'],
  ['age', 'Věk', 'text'],
  ['preferredYears', 'Preferovaná splatnost', 'years'],
  ['horizonMonths', 'Horizont (měsíce)', 'text'],
];

export interface SessionTranscript {
  /** Čitelný text pro poradce (aktivita/poznámka u případu). */
  text: string;
  /** Strukturovaná data pro metadata. */
  data: {
    sessionId: string;
    messageCount: number;
    phase?: string;
    leadScore?: number;
    persona?: string;
    calculators: Array<{
      type: string;
      label: string;
      input: Record<string, unknown>;
      output?: Record<string, unknown>;
      at?: string;
    }>;
    profile: Record<string, unknown>;
  };
}

function fmtValue(value: unknown, kind: 'czk' | 'pct' | 'text' | 'years'): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (kind === 'czk' && typeof value === 'number') return formatCZK(value);
  if (kind === 'pct' && typeof value === 'number') return formatPercent(value);
  if (kind === 'years' && typeof value === 'number') return `${value} let`;
  return String(value);
}

/** Zkrácení dlouhé zprávy, ať přepis zůstane čitelný. */
function trim(text: string, max = 600): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** Hodnoty z výstupu kalkulačky, které dávají smysl vypsat na jeden řádek. */
function summarizeOutput(output: Record<string, unknown> | undefined): string | null {
  if (!output) return null;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(output)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') continue; // vnořené struktury jdou jen do metadat
    parts.push(`${key}: ${String(value)}`);
    if (parts.length >= 8) break;
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

function buildProfileLines(profile: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const [key, label, kind] of PROFILE_LABELS) {
    const formatted = fmtValue(profile[key], kind);
    if (formatted) lines.push(`  • ${label}: ${formatted}`);
  }
  return lines;
}

function buildCalculatorLines(events: WidgetEventRecord[]): string[] {
  const lines: string[] = [];
  for (const ev of events) {
    const label = WIDGET_LABELS[ev.widgetType] ?? ev.widgetType;
    lines.push(`  • ${label}`);
    const inputSummary = summarizeOutput(ev.inputData);
    if (inputSummary) lines.push(`      vstup:   ${inputSummary}`);
    const outputSummary = summarizeOutput(ev.outputData);
    if (outputSummary) lines.push(`      výsledek: ${outputSummary}`);
  }
  return lines;
}

function buildConversationLines(session: SessionData): string[] {
  const lines: string[] = [];
  // uiMessages nesou i tool cally; pro poradce stačí čitelné role+text
  for (const m of session.messages) {
    const who = m.role === 'user' ? 'Klient' : 'Hugo';
    lines.push(`  [${who}] ${trim(m.content)}`);
  }
  return lines;
}

/**
 * Sestaví přepis session. Vrací null, když session neexistuje —
 * volající pak lead předá bez přepisu, místo aby selhal.
 */
export async function buildSessionTranscript(sessionId: string): Promise<SessionTranscript | null> {
  if (!sessionId) return null;

  const session = await storage.getSession(sessionId);
  if (!session) return null;

  const events = await storage.listWidgetEvents(sessionId);
  const profile = (session.profile ?? {}) as Record<string, unknown>;

  const sections: string[] = [];

  sections.push('═══ ZJIŠTĚNÉ ÚDAJE ═══');
  const profileLines = buildProfileLines(profile);
  sections.push(profileLines.length > 0 ? profileLines.join('\n') : '  (klient neuvedl žádné údaje)');

  if (events.length > 0) {
    sections.push('\n═══ POUŽITÉ KALKULAČKY ═══');
    sections.push(buildCalculatorLines(events).join('\n'));
  }

  sections.push('\n═══ PŘEPIS KONVERZACE ═══');
  const convLines = buildConversationLines(session);
  sections.push(convLines.length > 0 ? convLines.join('\n') : '  (bez zpráv)');

  const state = session.state;

  return {
    text: sections.join('\n'),
    data: {
      sessionId,
      messageCount: session.messages.length,
      phase: state?.phase,
      leadScore: state?.leadScore,
      persona: state?.persona,
      calculators: events.map(ev => ({
        type: ev.widgetType,
        label: WIDGET_LABELS[ev.widgetType] ?? ev.widgetType,
        input: ev.inputData,
        output: ev.outputData,
        at: ev.createdAt,
      })),
      profile,
    },
  };
}
