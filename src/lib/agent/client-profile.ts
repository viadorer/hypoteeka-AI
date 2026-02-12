/**
 * ClientProfile - strukturovaný profil klienta
 * Agent ho postupně plní daty z konverzace
 */

export interface ClientProfile {
  // Osobní údaje
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  isYoung?: boolean; // pod 36 let -> vyšší LTV limit

  // Příjmy
  monthlyIncome?: number;
  partnerIncome?: number;
  totalMonthlyIncome?: number;
  employmentType?: 'zamestnanec' | 'osvc' | 'kombinace';

  // Nemovitost
  propertyPrice?: number;
  propertyType?: 'byt' | 'dum' | 'pozemek' | 'rekonstrukce';
  location?: string;
  purpose?: 'vlastni_bydleni' | 'investice' | 'refinancovani';

  // Finance
  equity?: number;
  currentRent?: number;
  existingLoans?: number;
  existingMortgageBalance?: number;
  existingMortgageRate?: number;
  existingMortgageYears?: number;

  // Investiční parametry
  expectedRentalIncome?: number;
  monthlyExpenses?: number;

  // Preference
  preferredRate?: number;
  preferredYears?: number;
  maxMonthlyPayment?: number;

  // Metadata
  firstMessageAt?: string;
  lastMessageAt?: string;
  messageCount?: number;
}

/**
 * Zjistí, která klíčová data ještě chybí pro danou fázi
 */
export function getMissingFields(profile: ClientProfile, phase: string): string[] {
  const missing: string[] = [];

  // Základní fáze - potřebujeme cenu a účel
  if (!profile.propertyPrice && profile.purpose !== 'refinancovani') {
    missing.push('propertyPrice');
  }

  if (!profile.purpose) {
    // Neblokujeme, AI se zeptá přirozeně
  }

  // Pro výpočet splátky
  if (phase === 'analysis' || phase === 'qualification') {
    if (profile.equity === undefined || profile.equity === null) missing.push('equity');
    if (!profile.monthlyIncome && !profile.totalMonthlyIncome) missing.push('monthlyIncome');
  }

  // Pro kvalifikaci
  if (phase === 'qualification') {
    if (!profile.monthlyIncome && !profile.totalMonthlyIncome) missing.push('monthlyIncome');
  }

  return missing;
}

/**
 * Extrahuje strukturovaná data z profilu pro prompt
 */
export function profileSummary(profile: ClientProfile): string {
  const parts: string[] = [];

  if (profile.propertyPrice) parts.push(`Cena nemovitosti: ${fmt(profile.propertyPrice)} Kč`);
  if (profile.propertyType) parts.push(`Typ: ${profile.propertyType}`);
  if (profile.location) parts.push(`Lokalita: ${profile.location}`);
  if (profile.purpose) parts.push(`Účel: ${profile.purpose}`);
  if (profile.equity !== undefined && profile.equity !== null) parts.push(`Vlastní zdroje: ${fmt(profile.equity)} Kč`);
  if (profile.monthlyIncome) parts.push(`Měsíční příjem: ${fmt(profile.monthlyIncome)} Kč`);
  if (profile.partnerIncome) parts.push(`Příjem partnera: ${fmt(profile.partnerIncome)} Kč`);
  if (profile.totalMonthlyIncome) parts.push(`Celkový příjem: ${fmt(profile.totalMonthlyIncome)} Kč`);
  if (profile.age) parts.push(`Věk: ${profile.age} let`);
  if (profile.isYoung !== undefined) parts.push(`Mladý (do 36): ${profile.isYoung ? 'ano' : 'ne'}`);
  if (profile.currentRent) parts.push(`Současný nájem: ${fmt(profile.currentRent)} Kč`);
  if (profile.existingLoans) parts.push(`Stávající závazky: ${fmt(profile.existingLoans)} Kč`);
  if (profile.expectedRentalIncome) parts.push(`Očekávaný nájem: ${fmt(profile.expectedRentalIncome)} Kč`);
  if (profile.name) parts.push(`Jméno: ${profile.name}`);
  if (profile.email) parts.push(`Email: ${profile.email}`);
  if (profile.phone) parts.push(`Telefon: ${profile.phone}`);

  return parts.length > 0 ? parts.join('\n') : 'Zatím nemáme žádné údaje.';
}

function fmt(n: number): string {
  return n.toLocaleString('cs-CZ');
}
