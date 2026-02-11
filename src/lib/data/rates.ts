/**
 * Aktuální sazby a data trhu
 * 
 * Live data: ČNB ARAD REST API (https://www.cnb.cz/aradb/api/v1)
 *   - 2T repo sazba ČNB (MIRFMSR2TXRATPECD) - denní
 *   - Diskontní sazba (SFTP02M11) - měsíční
 *   - Lombardní sazba (SFTP03M11) - měsíční
 *   - PRIBOR 1D-1Y (SFTP04M21xx) - měsíční, ke konci měsíce
 * 
 * Fallback: statické hodnoty
 * Cache: 1 hodina
 * 
 * MIGRACE NA PRODUKCI:
 * - Přidat bankovní feedy (Hypoindex, Fincentrum)
 * - Přidat IRS swapy z Bloomberg/Reuters API
 */

const ARAD_BASE = 'https://www.cnb.cz/aradb/api/v1';
const ARAD_API_KEY = '202611020853228993488993483ZHG4W4URZKDGU37';

// ČNB ARAD indicator IDs
const INDICATORS = {
  // 2T repo sazba ČNB - denní
  repoDaily: 'MIRFMSR2TXRATPECD',
  // Úrokové sazby ČNB - ke konci měsíce
  repoMonthly: 'SFTP01M11',
  discount: 'SFTP02M11',
  lombard: 'SFTP03M11',
  // PRIBOR - ke konci měsíce
  pribor1d: 'SFTP04M2101',
  pribor1w: 'SFTP04M2102',
  pribor2w: 'SFTP04M2103',
  pribor1m: 'SFTP04M2104',
  pribor3m: 'SFTP04M2106',
  pribor6m: 'SFTP04M2107',
  pribor1y: 'SFTP04M2109',
};

// Fallback statické hodnoty (použijí se když API nefunguje)
const FALLBACK_MARKET_RATES = {
  cnbRepo: 3.75,
  cnbDiscount: 2.75,
  cnbLombard: 4.75,
  pribor1w: 3.82,
  pribor1m: 3.85,
  pribor3m: 3.88,
  pribor6m: 3.90,
  pribor1y: 3.95,
  irs5y: 3.45,
  irs10y: 3.60,
};

interface LiveRates {
  cnbRepo: number;
  cnbDiscount: number;
  cnbLombard: number;
  pribor1w: number;
  pribor1m: number;
  pribor3m: number;
  pribor6m: number;
  pribor1y: number;
  irs5y: number;
  irs10y: number;
  lastUpdated: string;
  source: 'live' | 'fallback';
}

let cachedRates: LiveRates | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hodina

/**
 * Stáhne data z ČNB ARAD API
 * Vrací mapu indicator_id -> poslední hodnota
 */
async function fetchFromArad(indicatorIds: string[]): Promise<Record<string, number> | null> {
  try {
    const idList = indicatorIds.join(',');
    const url = `${ARAD_BASE}/data?indicator_id_list=${idList}&months_before=2&api_key=${ARAD_API_KEY}&delimiter=pipe&decimal_separator=point&period_sort=desc`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.error(`[ARAD] HTTP ${res.status}`);
      return null;
    }

    // ARAD vrací windows-1250, ale čísla jsou OK
    const buffer = await res.arrayBuffer();
    const text = new TextDecoder('windows-1250').decode(buffer);
    const lines = text.trim().split('\n');

    if (lines.length < 2) return null;

    // Header: indicator_id|snapshot_id|period|value
    // Data:   "MIRFMSR2TXRATPECD"|82|"20260210"|3.5
    const result: Record<string, number> = {};
    const seen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('|');
      if (parts.length < 4) continue;

      const id = parts[0].replace(/"/g, '').trim();
      const value = parseFloat(parts[3].replace(/"/g, '').trim());

      // Bereme jen první (nejnovější) hodnotu pro každý indicator
      if (!seen.has(id) && !isNaN(value)) {
        result[id] = value;
        seen.add(id);
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    console.error(`[ARAD] Fetch error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/**
 * Vrátí aktuální sazby (live z ČNB ARAD API nebo fallback)
 */
export async function getMarketRates(): Promise<LiveRates> {
  // Vrať cache pokud je čerstvá
  if (cachedRates && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedRates;
  }

  // Stáhni live data z ČNB ARAD
  const allIds = Object.values(INDICATORS);
  const data = await fetchFromArad(allIds);

  if (data) {
    const repo = data[INDICATORS.repoDaily] ?? data[INDICATORS.repoMonthly] ?? FALLBACK_MARKET_RATES.cnbRepo;

    cachedRates = {
      cnbRepo: repo,
      cnbDiscount: data[INDICATORS.discount] ?? FALLBACK_MARKET_RATES.cnbDiscount,
      cnbLombard: data[INDICATORS.lombard] ?? FALLBACK_MARKET_RATES.cnbLombard,
      pribor1w: data[INDICATORS.pribor1w] ?? FALLBACK_MARKET_RATES.pribor1w,
      pribor1m: data[INDICATORS.pribor1m] ?? FALLBACK_MARKET_RATES.pribor1m,
      pribor3m: data[INDICATORS.pribor3m] ?? FALLBACK_MARKET_RATES.pribor3m,
      pribor6m: data[INDICATORS.pribor6m] ?? FALLBACK_MARKET_RATES.pribor6m,
      pribor1y: data[INDICATORS.pribor1y] ?? FALLBACK_MARKET_RATES.pribor1y,
      irs5y: FALLBACK_MARKET_RATES.irs5y,
      irs10y: FALLBACK_MARKET_RATES.irs10y,
      lastUpdated: new Date().toISOString().slice(0, 10),
      source: 'live',
    };
    cacheTimestamp = Date.now();
    console.log(`[Rates] Live ČNB ARAD: repo ${repo}%, diskont ${cachedRates.cnbDiscount}%, lombard ${cachedRates.cnbLombard}%, PRIBOR 3M ${cachedRates.pribor3m}%, 1Y ${cachedRates.pribor1y}%`);
    return cachedRates;
  }

  // Fallback
  cachedRates = {
    ...FALLBACK_MARKET_RATES,
    lastUpdated: '2026-02-11',
    source: 'fallback',
  };
  cacheTimestamp = Date.now();
  console.log('[Rates] Using fallback rates (ARAD API unavailable)');
  return cachedRates;
}

export const MARKET_RATES = FALLBACK_MARKET_RATES;

// Bankovní marže (spread) nad repo sazbou ČNB
// Skutečná hypoteční sazba = repo sazba + spread banky
// Spread závisí na délce fixace (delší fixace = vyšší spread kvůli úrokovému riziku)
const BANK_SPREADS = [
  { name: 'Hypoteční banka', spread3y: 0.79, spread5y: 0.99, spread10y: 1.39 },
  { name: 'Česká spořitelna', spread3y: 0.89, spread5y: 1.09, spread10y: 1.49 },
  { name: 'Komerční banka', spread3y: 0.99, spread5y: 1.19, spread10y: 1.59 },
  { name: 'ČSOB', spread3y: 0.89, spread5y: 1.09, spread10y: 1.49 },
  { name: 'Raiffeisenbank', spread3y: 0.79, spread5y: 0.99, spread10y: 1.39 },
  { name: 'mBank', spread3y: 0.59, spread5y: 0.89, spread10y: 1.29 },
  { name: 'UniCredit Bank', spread3y: 0.89, spread5y: 1.09, spread10y: 1.49 },
  { name: 'Moneta', spread3y: 1.09, spread5y: 1.29, spread10y: 1.69 },
];

// Naše marže - nižší díky objemu a partnerstvím
const OUR_SPREAD = { spread3y: 0.29, spread5y: 0.49, spread10y: 0.89 };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Dynamicky spočítá sazby bank z aktuální repo sazby + spread
 */
export function getBankRates(repoRate: number) {
  const banks = BANK_SPREADS.map(b => ({
    name: b.name,
    rate3y: round2(repoRate + b.spread3y),
    rate5y: round2(repoRate + b.spread5y),
    rate10y: round2(repoRate + b.spread10y),
  }));

  const avg = (arr: number[]) => round2(arr.reduce((a, b) => a + b, 0) / arr.length);
  const min = (arr: number[]) => round2(Math.min(...arr));

  return {
    banks,
    average3y: avg(banks.map(b => b.rate3y)),
    average5y: avg(banks.map(b => b.rate5y)),
    average10y: avg(banks.map(b => b.rate10y)),
    best3y: min(banks.map(b => b.rate3y)),
    best5y: min(banks.map(b => b.rate5y)),
    best10y: min(banks.map(b => b.rate10y)),
  };
}

/**
 * Dynamicky spočítá naše nabídkové sazby z repo sazby + náš spread
 */
export function getOurRates(repoRate: number) {
  return {
    fix3y: round2(repoRate + OUR_SPREAD.spread3y),
    fix5y: round2(repoRate + OUR_SPREAD.spread5y),
    fix10y: round2(repoRate + OUR_SPREAD.spread10y),
  };
}

/**
 * Generuje textový přehled sazeb pro system prompt
 * Všechny sazby se dynamicky počítají z live repo sazby ČNB + marže
 */
export async function getRatesContext(): Promise<string> {
  const rates = await getMarketRates();
  const bankRates = getBankRates(rates.cnbRepo);
  const ourRates = getOurRates(rates.cnbRepo);

  return `AKTUÁLNÍ SAZBY (${rates.lastUpdated}, zdroj: ${rates.source === 'live' ? 'ČNB ARAD API' : 'statická data'}):

KLÍČOVÉ SAZBY ČNB:
- 2T repo sazba: ${rates.cnbRepo} % (klíčová sazba - od ní se odvíjí cena hypoték)
- Diskontní sazba: ${rates.cnbDiscount} %
- Lombardní sazba: ${rates.cnbLombard} %

JAK SE POČÍTÁ HYPOTEČNÍ SAZBA:
- Banka si půjčí od ČNB za repo sazbu (${rates.cnbRepo} %) a přidá svou marži (spread)
- Kratší fixace = nižší spread (menší riziko pro banku)
- Delší fixace = vyšší spread (banka nese úrokové riziko déle)
- Typický spread: fixace 3r ~0.8%, fixace 5r ~1.0%, fixace 10r ~1.4%

MEZIBANKOVNÍ SAZBY (PRIBOR):
- PRIBOR 3M: ${rates.pribor3m} %
- PRIBOR 1R: ${rates.pribor1y} %

ORIENTAČNÍ ROZSAH SAZEB NA TRHU (repo ${rates.cnbRepo} % + marže bank):
- Fixace 3 roky: orientačně od ${bankRates.best3y} % do ${round2(bankRates.average3y + 0.3)} %
- Fixace 5 let: orientačně od ${bankRates.best5y} % do ${round2(bankRates.average5y + 0.3)} %
- Fixace 10 let: orientačně od ${bankRates.best10y} % do ${round2(bankRates.average10y + 0.3)} %

DŮLEŽITÉ - PRAVIDLA PRO KOMUNIKACI SAZEB:
- NIKDY neslibuj žádnou konkrétní sazbu. Vše je vždy "od", "orientačně", "v rozmezí", "závisí na individuálním posouzení"
- Konkrétní sazbu může stanovit POUZE poradce po kompletní analýze bonity, výše úvěru, LTV, typu nemovitosti a dalších faktorů
- Sazba závisí na mnoha faktorech: výše úvěru, LTV, příjem, typ nemovitosti, účel, délka fixace, pojištění, cross-sell produkty banky
- Když klient chce vědět přesnou sazbu, řekni: "Přesnou sazbu vám sdělí náš poradce po analýze - závisí na mnoha faktorech. Orientačně se sazby na trhu pohybují od X %."
- Můžeš vysvětlit jak se sazba skládá (repo + marže) - to budí důvěru a ukazuje odbornost
- Díky objemu a partnerstvím s bankami dokážeme vyjednat výhodnější podmínky - ale konkrétní číslo závisí na situaci klienta
- Při refinancování můžeš porovnat aktuální sazbu klienta s orientačním rozsahem na trhu
- Vždy zdůrazni, že nezávazná konzultace s poradcem je zdarma a teprve tam se klient dozví konkrétní nabídku`;
}
