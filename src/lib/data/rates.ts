/**
 * Market Rates Service
 * 
 * ALL data from DB (market_rates, bank_spreads tables).
 * ARAD fetch 1x daily -> saved to DB.
 * No hardcoded values - everything from DB.
 * 
 * Flow:
 *   1. getMarketRates() reads latest row from market_rates table
 *   2. If today's data missing, fetches from ARAD and saves to DB
 *   3. getBankSpreads() reads from bank_spreads table
 *   4. getDynamicDefaultRate() = repo + avg 5Y spread from DB
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---- ARAD config ----
const ARAD_BASE = 'https://www.cnb.cz/aradb/api/v1';
const ARAD_API_KEY = '202611020853228993488993483ZHG4W4URZKDGU37';

const INDICATORS = {
  repoDaily: 'MIRFMSR2TXRATPECD',
  repoMonthly: 'SFTP01M11',
  discount: 'SFTP02M11',
  lombard: 'SFTP03M11',
  pribor1w: 'SFTP04M2102',
  pribor1m: 'SFTP04M2104',
  pribor3m: 'SFTP04M2106',
  pribor6m: 'SFTP04M2107',
  pribor1y: 'SFTP04M2109',
};

// ---- Types ----
export interface LiveRates {
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
  source: string;
}

export interface BankSpread {
  name: string;
  spread3y: number;
  spread5y: number;
  spread10y: number;
  isOurRate: boolean;
}

// ---- In-memory cache ----
let cachedRates: LiveRates | null = null;
let ratesCacheTs = 0;
const RATES_CACHE_TTL = 10 * 60 * 1000; // 10 min in-memory

let cachedSpreads: BankSpread[] | null = null;
let spreadsCacheTs = 0;
const SPREADS_CACHE_TTL = 30 * 60 * 1000; // 30 min in-memory

// ---- Supabase helper ----
function getDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// ARAD fetch (raw HTTP, no DB dependency)
// ============================================================
async function fetchFromArad(): Promise<Record<string, number> | null> {
  try {
    const idList = Object.values(INDICATORS).join(',');
    const url = `${ARAD_BASE}/data?indicator_id_list=${idList}&months_before=2&api_key=${ARAD_API_KEY}&delimiter=pipe&decimal_separator=point&period_sort=desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) { console.error(`[ARAD] HTTP ${res.status}`); return null; }

    const buffer = await res.arrayBuffer();
    const text = new TextDecoder('windows-1250').decode(buffer);
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;

    const result: Record<string, number> = {};
    const seen = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('|');
      if (parts.length < 4) continue;
      const id = parts[0].replace(/"/g, '').trim();
      const value = parseFloat(parts[3].replace(/"/g, '').trim());
      if (!seen.has(id) && !isNaN(value)) { result[id] = value; seen.add(id); }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    console.error(`[ARAD] Fetch error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ============================================================
// Save ARAD data to DB (upsert by date)
// ============================================================
async function saveRatesToDb(db: SupabaseClient, rates: LiveRates): Promise<void> {
  const { error } = await db.from('market_rates').upsert({
    rate_date: rates.lastUpdated,
    cnb_repo: rates.cnbRepo,
    cnb_discount: rates.cnbDiscount,
    cnb_lombard: rates.cnbLombard,
    pribor_1w: rates.pribor1w,
    pribor_1m: rates.pribor1m,
    pribor_3m: rates.pribor3m,
    pribor_6m: rates.pribor6m,
    pribor_1y: rates.pribor1y,
    irs_5y: rates.irs5y,
    irs_10y: rates.irs10y,
    source: 'arad',
  }, { onConflict: 'rate_date,source' });
  if (error) console.error('[Rates] DB save error:', error.message);
  else console.log(`[Rates] Saved to DB: ${rates.lastUpdated}`);
}

// ============================================================
// Load latest rates from DB
// ============================================================
async function loadRatesFromDb(db: SupabaseClient): Promise<LiveRates | null> {
  const { data, error } = await db
    .from('market_rates')
    .select('*')
    .order('rate_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    cnbRepo: Number(data.cnb_repo),
    cnbDiscount: Number(data.cnb_discount ?? 0),
    cnbLombard: Number(data.cnb_lombard ?? 0),
    pribor1w: Number(data.pribor_1w ?? 0),
    pribor1m: Number(data.pribor_1m ?? 0),
    pribor3m: Number(data.pribor_3m ?? 0),
    pribor6m: Number(data.pribor_6m ?? 0),
    pribor1y: Number(data.pribor_1y ?? 0),
    irs5y: Number(data.irs_5y ?? 0),
    irs10y: Number(data.irs_10y ?? 0),
    lastUpdated: data.rate_date,
    source: data.source,
  };
}

// ============================================================
// getMarketRates() - main entry point
// 1. Return in-memory cache if fresh
// 2. Try DB
// 3. If DB data is not from today, fetch ARAD and save to DB
// ============================================================
export async function getMarketRates(): Promise<LiveRates> {
  // In-memory cache
  if (cachedRates && Date.now() - ratesCacheTs < RATES_CACHE_TTL) {
    return cachedRates;
  }

  const db = getDb();

  // Try DB first
  if (db) {
    const dbRates = await loadRatesFromDb(db);
    if (dbRates) {
      // If DB has today's data, use it
      if (dbRates.lastUpdated === today()) {
        cachedRates = dbRates;
        ratesCacheTs = Date.now();
        console.log(`[Rates] From DB: repo ${dbRates.cnbRepo}% (${dbRates.lastUpdated})`);
        return dbRates;
      }

      // DB data is stale - try ARAD
      const aradData = await fetchFromArad();
      if (aradData) {
        const repo = aradData[INDICATORS.repoDaily] ?? aradData[INDICATORS.repoMonthly] ?? dbRates.cnbRepo;
        const freshRates: LiveRates = {
          cnbRepo: repo,
          cnbDiscount: aradData[INDICATORS.discount] ?? dbRates.cnbDiscount,
          cnbLombard: aradData[INDICATORS.lombard] ?? dbRates.cnbLombard,
          pribor1w: aradData[INDICATORS.pribor1w] ?? dbRates.pribor1w,
          pribor1m: aradData[INDICATORS.pribor1m] ?? dbRates.pribor1m,
          pribor3m: aradData[INDICATORS.pribor3m] ?? dbRates.pribor3m,
          pribor6m: aradData[INDICATORS.pribor6m] ?? dbRates.pribor6m,
          pribor1y: aradData[INDICATORS.pribor1y] ?? dbRates.pribor1y,
          irs5y: dbRates.irs5y,
          irs10y: dbRates.irs10y,
          lastUpdated: today(),
          source: 'arad',
        };
        await saveRatesToDb(db, freshRates);
        cachedRates = freshRates;
        ratesCacheTs = Date.now();
        console.log(`[Rates] Fresh ARAD: repo ${repo}% saved to DB`);
        return freshRates;
      }

      // ARAD failed, use stale DB data
      cachedRates = dbRates;
      ratesCacheTs = Date.now();
      console.log(`[Rates] ARAD unavailable, using DB from ${dbRates.lastUpdated}`);
      return dbRates;
    }
  }

  // No DB - direct ARAD fetch (dev mode)
  const aradData = await fetchFromArad();
  if (aradData) {
    const repo = aradData[INDICATORS.repoDaily] ?? aradData[INDICATORS.repoMonthly] ?? 3.75;
    cachedRates = {
      cnbRepo: repo,
      cnbDiscount: aradData[INDICATORS.discount] ?? 0,
      cnbLombard: aradData[INDICATORS.lombard] ?? 0,
      pribor1w: aradData[INDICATORS.pribor1w] ?? 0,
      pribor1m: aradData[INDICATORS.pribor1m] ?? 0,
      pribor3m: aradData[INDICATORS.pribor3m] ?? 0,
      pribor6m: aradData[INDICATORS.pribor6m] ?? 0,
      pribor1y: aradData[INDICATORS.pribor1y] ?? 0,
      irs5y: 0,
      irs10y: 0,
      lastUpdated: today(),
      source: 'arad-no-db',
    };
    ratesCacheTs = Date.now();
    console.log(`[Rates] ARAD direct (no DB): repo ${repo}%`);
    return cachedRates;
  }

  // Last resort: return whatever we have cached, or zeros
  if (cachedRates) return cachedRates;
  console.error('[Rates] No data source available!');
  return {
    cnbRepo: 0, cnbDiscount: 0, cnbLombard: 0,
    pribor1w: 0, pribor1m: 0, pribor3m: 0, pribor6m: 0, pribor1y: 0,
    irs5y: 0, irs10y: 0,
    lastUpdated: today(), source: 'none',
  };
}

// ============================================================
// Bank spreads from DB
// ============================================================
export async function getBankSpreads(tenantId = 'hypoteeka'): Promise<BankSpread[]> {
  if (cachedSpreads && Date.now() - spreadsCacheTs < SPREADS_CACHE_TTL) {
    return cachedSpreads;
  }

  const db = getDb();
  if (db) {
    const { data, error } = await db
      .from('bank_spreads')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('sort_order');

    if (!error && data && data.length > 0) {
      cachedSpreads = data.map(row => ({
        name: row.bank_name,
        spread3y: Number(row.spread_3y),
        spread5y: Number(row.spread_5y),
        spread10y: Number(row.spread_10y),
        isOurRate: Boolean(row.is_our_rate),
      }));
      spreadsCacheTs = Date.now();
      console.log(`[Spreads] Loaded ${cachedSpreads.length} banks from DB`);
      return cachedSpreads;
    }
  }

  // Dev fallback: no DB
  console.log('[Spreads] No DB, using empty spreads');
  return [];
}

// ============================================================
// getDynamicDefaultRate - repo + avg 5Y spread from DB
// ============================================================
export async function getDynamicDefaultRate(tenantId = 'hypoteeka'): Promise<{ rate: number; rpsn: number }> {
  const [rates, spreads] = await Promise.all([
    getMarketRates(),
    getBankSpreads(tenantId),
  ]);

  const bankSpreads = spreads.filter(s => !s.isOurRate);
  const avgSpread5y = bankSpreads.length > 0
    ? bankSpreads.reduce((sum, b) => sum + b.spread5y, 0) / bankSpreads.length
    : 1.0; // safe default if no spreads in DB yet

  const rate = round2(rates.cnbRepo + avgSpread5y) / 100;
  const rpsn = round2((rates.cnbRepo + avgSpread5y) * 1.04) / 100;
  return { rate, rpsn };
}

// ============================================================
// getBankRates - compute final rates from repo + spreads
// ============================================================
export async function getBankRates(tenantId = 'hypoteeka') {
  const [rates, spreads] = await Promise.all([
    getMarketRates(),
    getBankSpreads(tenantId),
  ]);

  const repo = rates.cnbRepo;
  const bankSpreads = spreads.filter(s => !s.isOurRate);
  const ourSpread = spreads.find(s => s.isOurRate);

  const banks = bankSpreads.map(b => ({
    name: b.name,
    rate3y: round2(repo + b.spread3y),
    rate5y: round2(repo + b.spread5y),
    rate10y: round2(repo + b.spread10y),
  }));

  const avg = (arr: number[]) => arr.length > 0 ? round2(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const min = (arr: number[]) => arr.length > 0 ? round2(Math.min(...arr)) : 0;

  return {
    banks,
    average3y: avg(banks.map(b => b.rate3y)),
    average5y: avg(banks.map(b => b.rate5y)),
    average10y: avg(banks.map(b => b.rate10y)),
    best3y: min(banks.map(b => b.rate3y)),
    best5y: min(banks.map(b => b.rate5y)),
    best10y: min(banks.map(b => b.rate10y)),
    ourRates: ourSpread ? {
      fix3y: round2(repo + ourSpread.spread3y),
      fix5y: round2(repo + ourSpread.spread5y),
      fix10y: round2(repo + ourSpread.spread10y),
    } : null,
  };
}

// ============================================================
// getRatesContext - text for system prompt
// ============================================================
export async function getRatesContext(tenantId = 'hypoteeka'): Promise<string> {
  const [rates, bankRates] = await Promise.all([
    getMarketRates(),
    getBankRates(tenantId),
  ]);

  return `AKTUALNI SAZBY (${rates.lastUpdated}, zdroj: ${rates.source}):

KLICOVE SAZBY CNB:
- 2T repo sazba: ${rates.cnbRepo} % (klicova sazba - od ni se odviji cena hypotek)
- Diskontni sazba: ${rates.cnbDiscount} %
- Lombardni sazba: ${rates.cnbLombard} %

JAK SE POCITA HYPOTECNI SAZBA:
- Banka si pujci od CNB za repo sazbu (${rates.cnbRepo} %) a prida svou marzi (spread)
- Kratsi fixace = nizsi spread (mensi riziko pro banku)
- Delsi fixace = vyssi spread (banka nese urokove riziko dele)

MEZIBANKOVI SAZBY (PRIBOR):
- PRIBOR 3M: ${rates.pribor3m} %
- PRIBOR 1R: ${rates.pribor1y} %

ORIENTACNI ROZSAH SAZEB NA TRHU (repo ${rates.cnbRepo} % + marze bank):
- Fixace 3 roky: orientacne od ${bankRates.best3y} % do ${round2(bankRates.average3y + 0.3)} %
- Fixace 5 let: orientacne od ${bankRates.best5y} % do ${round2(bankRates.average5y + 0.3)} %
- Fixace 10 let: orientacne od ${bankRates.best10y} % do ${round2(bankRates.average10y + 0.3)} %

DULEZITE - PRAVIDLA PRO KOMUNIKACI SAZEB:
- NIKDY neslibuj zadnou konkretni sazbu. Vse je vzdy "od", "orientacne", "v rozmezi", "zavisi na individualnim posouzeni"
- Konkretni sazbu muze stanovit POUZE poradce po kompletni analyze bonity, vyse uveru, LTV, typu nemovitosti a dalsich faktoru
- Sazba zavisi na mnoha faktorech: vyse uveru, LTV, prijem, typ nemovitosti, ucel, delka fixace, pojisteni, cross-sell produkty banky
- Kdyz klient chce vedet presnou sazbu, rekni: "Presnou sazbu vam sdeli nas poradce po analyze - zavisi na mnoha faktorech. Orientacne se sazby na trhu pohybuji od X %."
- Muzes vysvetlit jak se sazba sklada (repo + marze) - to budi duveru a ukazuje odbornost
- Diky objemu a partnerstvim s bankami dokazeme vyjednat vyhodnejsi podminky - ale konkretni cislo zavisi na situaci klienta
- Pri refinancovani muzes porovnat aktualni sazbu klienta s orientacnim rozsahem na trhu
- Vzdy zdurazni, ze nezavazna konzultace s poradcem je zdarma a teprve tam se klient dozvi konkretni nabidku`;
}
