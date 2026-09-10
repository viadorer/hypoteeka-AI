/**
 * Přepis session pro poradce — co klient řekl, co Hugo spočítal.
 *
 * Sestaví z dat, která hypoteeka drží ve schématu `hypoteeka`
 * (sessions, messages, widget_events), čitelný text a strukturovaný objekt.
 * Používá se při předání leadu do PTF, aby poradce v případu viděl celý
 * kontext a nemusel se klienta ptát na to, co už Hugovi řekl.
 */

import { storage } from '../storage';
import { formatCZK, formatNumber, formatPercent } from '../format';
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

/** Číselníky profilu na lidský text — poradce nemá číst `nothing_much`. */
const ENUM_LABELS: Record<string, Record<string, string>> = {
  purpose: {
    vlastni_bydleni: 'vlastní bydlení',
    investice: 'investice',
    refinancovani: 'refinancování',
    refixace: 'refixace',
    prodej: 'prodej',
  },
  propertyType: { byt: 'byt', dum: 'dům', pozemek: 'pozemek', rekonstrukce: 'rekonstrukce' },
  employmentType: {
    zamestnanec: 'zaměstnanec',
    osvc: 'OSVČ',
    kombinace: 'zaměstnání + podnikání',
  },
  propertyRating: {
    bad: 'špatný',
    nothing_much: 'podprůměrný',
    good: 'dobrý',
    very_good: 'velmi dobrý',
    new: 'novostavba',
    excellent: 'výborný',
  },
  propertyConstruction: {
    brick: 'cihla',
    panel: 'panel',
    wood: 'dřevo',
    stone: 'kámen',
    montage: 'montovaná',
    mixed: 'smíšená',
  },
  propertyOwnership: { private: 'osobní', cooperative: 'družstevní', council: 'obecní' },
  valuationKind: { sale: 'prodej', lease: 'pronájem' },
  investmentExperience: { none: 'žádná', one: '1 nemovitost', portfolio: '2+ nemovitostí' },
  legalForm: { fyzicka_osoba: 'fyzická osoba', sro: 's.r.o.', kombinace: 'FO + s.r.o.' },
};

type ValueKind =
  | 'czk' | 'rate' | 'pct' | 'share' | 'text' | 'years' | 'months'
  | 'm2' | 'days' | 'bool' | 'date' | 'enum';

/**
 * Pole profilu pro poradce, po skupinách.
 *
 * Do `description` patří všechno, co Hugo zjistil — `activities.metadata`
 * s celým profilem admin PTF nevrací, takže co není tady, poradce nevidí.
 */
const PROFILE_GROUPS: Array<{ title: string; fields: Array<[string, string, ValueKind]> }> = [
  {
    title: 'Záměr',
    fields: [
      ['purpose', 'Účel', 'enum'],
      ['horizonMonths', 'Časový horizont', 'months'],
      ['targetLoanAmount', 'Požadovaný úvěr', 'czk'],
    ],
  },
  {
    title: 'Nemovitost',
    fields: [
      ['propertyPrice', 'Cena nemovitosti', 'czk'],
      ['propertyType', 'Typ', 'enum'],
      ['propertySize', 'Dispozice', 'text'],
      ['propertyAddress', 'Adresa (ověřená)', 'text'],
      ['location', 'Lokalita', 'text'],
      ['floorArea', 'Užitná plocha', 'm2'],
      ['lotArea', 'Plocha pozemku', 'm2'],
      ['propertyRating', 'Stav', 'enum'],
      ['propertyConstruction', 'Konstrukce', 'enum'],
      ['propertyFloor', 'Patro', 'text'],
      ['propertyTotalFloors', 'Podlaží celkem', 'text'],
      ['propertyElevator', 'Výtah', 'bool'],
      ['propertyOwnership', 'Vlastnictví', 'enum'],
      ['cadastralArea', 'Katastrální území', 'text'],
      ['parcelNumber', 'Číslo parcely', 'text'],
    ],
  },
  {
    title: 'Ocenění (RealVisor)',
    fields: [
      ['valuationKind', 'Typ ocenění', 'enum'],
      ['valuationAvgPrice', 'Odhad ceny', 'czk'],
      ['valuationMinPrice', 'Odhad — dolní hranice', 'czk'],
      ['valuationMaxPrice', 'Odhad — horní hranice', 'czk'],
      ['valuationAvgPriceM2', 'Cena za m²', 'czk'],
      ['valuationCalcArea', 'Počítaná plocha', 'm2'],
      ['valuationAvgDuration', 'Prům. doba prodeje', 'days'],
      ['valuationAvgScore', 'Skóre shody srovnatelných', 'share'],
      ['valuationDate', 'Datum ocenění', 'date'],
      ['valuationId', 'ID ocenění', 'text'],
    ],
  },
  {
    title: 'Příjmy a výdaje',
    fields: [
      ['monthlyIncome', 'Měsíční příjem', 'czk'],
      ['partnerIncome', 'Příjem partnera', 'czk'],
      ['totalMonthlyIncome', 'Příjem domácnosti celkem', 'czk'],
      ['employmentType', 'Typ příjmu', 'enum'],
      ['monthlyExpenses', 'Měsíční výdaje', 'czk'],
      ['currentRent', 'Současný nájem', 'czk'],
      ['age', 'Věk', 'years'],
      ['isYoung', 'Do 36 let (vyšší LTV limit)', 'bool'],
    ],
  },
  {
    title: 'Financování',
    fields: [
      ['equity', 'Vlastní zdroje', 'czk'],
      ['existingLoans', 'Stávající úvěry', 'czk'],
      ['existingMortgageBalance', 'Zůstatek stávající hypotéky', 'czk'],
      ['existingMortgageRate', 'Sazba stávající hypotéky', 'rate'],
      ['existingMortgageYears', 'Zbývající splatnost', 'years'],
      ['maxMonthlyPayment', 'Max. splátka', 'czk'],
    ],
  },
  {
    title: 'Investiční záměr',
    fields: [
      ['expectedRentalIncome', 'Očekávaný nájem', 'czk'],
      ['targetRentalYield', 'Cílový výnos p.a.', 'pct'],
      ['isFirstInvestment', 'První investiční nemovitost', 'bool'],
      ['investmentExperience', 'Zkušenost s investicemi', 'enum'],
      ['legalForm', 'Forma pořízení', 'enum'],
    ],
  },
  {
    title: 'Preference',
    fields: [
      ['preferredRate', 'Preferovaná sazba', 'rate'],
      ['preferredYears', 'Preferovaná splatnost', 'years'],
    ],
  },
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

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return `${n} ${one}`;
  if (n >= 2 && n <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

function fmtValue(key: string, value: unknown, kind: ValueKind): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (kind === 'bool') return value ? 'ano' : 'ne';
  if (kind === 'enum') return ENUM_LABELS[key]?.[String(value)] ?? String(value);
  if (kind === 'date') {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('cs-CZ');
  }

  if (typeof value === 'number') {
    if (kind === 'czk') return formatCZK(value);
    if (kind === 'rate') return formatPercent(value, 2);
    if (kind === 'share') return formatPercent(value, 0);
    if (kind === 'pct') return `${String(value).replace('.', ',')} %`;
    if (kind === 'm2') return `${formatNumber(value)} m²`;
    if (kind === 'years') return plural(value, 'rok', 'roky', 'let');
    if (kind === 'days') return plural(value, 'den', 'dny', 'dní');
    if (kind === 'months') return value === 0 ? 'hned' : plural(value, 'měsíc', 'měsíce', 'měsíců');
  }

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
  for (const group of PROFILE_GROUPS) {
    const groupLines: string[] = [];
    for (const [key, label, kind] of group.fields) {
      const formatted = fmtValue(key, profile[key], kind);
      if (formatted) groupLines.push(`  • ${label}: ${formatted}`);
    }
    if (groupLines.length === 0) continue;
    if (lines.length > 0) lines.push('');
    lines.push(`  ${group.title}:`, ...groupLines);
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
