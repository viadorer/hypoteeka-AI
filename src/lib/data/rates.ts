/**
 * Market Rates Service
 *
 * ALL data from DB (market_rates, bank_spreads tables).
 * ARAD fetch 1x daily (cron at 7:00) -> saved to DB.
 * No hardcoded values - everything from DB.
 *
 * Data sources from ČNB ARAD:
 *   - 2T repo sazba (denní)
 *   - Průměrné sazby nových hypoték na bydlení (měsíční, podle fixace)
 *   - RPSN hypoték na bydlení (měsíční)
 *   - Objemy nových hypoték (měsíční)
 *   - PRIBOR sazby (pro interní účely, nezobrazovat klientům)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getDefaultTenantId } from '../tenant/config';

// ---- ARAD config ----
const ARAD_BASE = 'https://www.cnb.cz/aradb/api/v1';
const ARAD_API_KEY = '202611020853228993488993483ZHG4W4URZKDGU37';

const INDICATORS = {
  // ČNB klíčové sazby (denní/měsíční)
  repoDaily: 'MIRFMSR2TXRATPECD',
  repoMonthly: 'SFTP01M11',
  discount: 'SFTP02M11',
  lombard: 'SFTP03M11',
  // PRIBOR (interní, nezobrazovat klientům)
  pribor3m: 'SFTP04M2106',
  pribor1y: 'SFTP04M2109',
  // Průměrné sazby nových hypoték na bydlení (MĚSÍČNÍ - klíčová data!)
  mortgageAvgRate: 'SMIRNOOBUVMIRS305CZK011111',       // celkem
  mortgageRateFix1y: 'SMIRNOOBUVMIRS305CZK051111',     // floating a do 1 roku
  mortgageRateFix5y: 'SMIRNOOBUVMIRS305CZK031111',     // 1-5 let
  mortgageRateFix10y: 'SMIRNOOBUVMIRS305CZK061111',    // 5-10 let
  mortgageRateFix10yPlus: 'SMIRNOOBUVMIRS305CZK071111', // nad 10 let
  // RPSN hypoték na bydlení
  mortgageRpsn: 'SMIRNOOBUVMRPS405CZK011111',
  // Objemy nových hypoték (mil. CZK)
  mortgageVolumeTotal: 'SMIRNOOBUVMOBJ305CZK011111',
  mortgageVolumeFix5y: 'SMIRNOOBUVMOBJ305CZK031111',
};

// ---- Types ----
export interface LiveRates {
  cnbRepo: number;
  cnbDiscount: number;
  cnbLombard: number;
  pribor3m: number;
  pribor1y: number;
  // Průměrné sazby hypoték z ČNB (reálná tržní data)
  mortgageAvgRate: number;
  mortgageRateFix1y: number;
  mortgageRateFix5y: number;
  mortgageRateFix10y: number;
  mortgageRateFix10yPlus: number;
  mortgageRpsn: number;
  // Objemy (mil. CZK)
  mortgageVolumeTotal: number;
  mortgageVolumeFix5y: number;
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
const RATES_CACHE_TTL = 60 * 60 * 1000; // 1 hour (data fetched 1x daily)

let cachedSpreads: BankSpread[] | null = null;
let spreadsCacheTs = 0;
const SPREADS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

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
// ARAD fetch (raw HTTP)
// ============================================================
async function fetchFromArad(): Promise<Record<string, number> | null> {
  try {
    const idList = Object.values(INDICATORS).join(',');
    const url = `${ARAD_BASE}/data?indicator_id_list=${idList}&months_before=3&api_key=${ARAD_API_KEY}&delimiter=pipe&decimal_separator=point&period_sort=desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
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
    console.log(`[ARAD] Fetched ${Object.keys(result).length} indicators`);
    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    console.error(`[ARAD] Fetch error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ============================================================
// Build LiveRates from ARAD data + previous values as fallback
// ============================================================
function buildRates(aradData: Record<string, number>, prev: Partial<LiveRates> = {}): LiveRates {
  return {
    cnbRepo: aradData[INDICATORS.repoDaily] ?? aradData[INDICATORS.repoMonthly] ?? prev.cnbRepo ?? 0,
    cnbDiscount: aradData[INDICATORS.discount] ?? prev.cnbDiscount ?? 0,
    cnbLombard: aradData[INDICATORS.lombard] ?? prev.cnbLombard ?? 0,
    pribor3m: aradData[INDICATORS.pribor3m] ?? prev.pribor3m ?? 0,
    pribor1y: aradData[INDICATORS.pribor1y] ?? prev.pribor1y ?? 0,
    mortgageAvgRate: aradData[INDICATORS.mortgageAvgRate] ?? prev.mortgageAvgRate ?? 0,
    mortgageRateFix1y: aradData[INDICATORS.mortgageRateFix1y] ?? prev.mortgageRateFix1y ?? 0,
    mortgageRateFix5y: aradData[INDICATORS.mortgageRateFix5y] ?? prev.mortgageRateFix5y ?? 0,
    mortgageRateFix10y: aradData[INDICATORS.mortgageRateFix10y] ?? prev.mortgageRateFix10y ?? 0,
    mortgageRateFix10yPlus: aradData[INDICATORS.mortgageRateFix10yPlus] ?? prev.mortgageRateFix10yPlus ?? 0,
    mortgageRpsn: aradData[INDICATORS.mortgageRpsn] ?? prev.mortgageRpsn ?? 0,
    mortgageVolumeTotal: aradData[INDICATORS.mortgageVolumeTotal] ?? prev.mortgageVolumeTotal ?? 0,
    mortgageVolumeFix5y: aradData[INDICATORS.mortgageVolumeFix5y] ?? prev.mortgageVolumeFix5y ?? 0,
    lastUpdated: today(),
    source: 'arad',
  };
}

// ============================================================
// Save to DB (upsert by date)
// ============================================================
async function saveRatesToDb(db: SupabaseClient, rates: LiveRates): Promise<void> {
  const { error } = await db.from('market_rates').upsert({
    rate_date: rates.lastUpdated,
    cnb_repo: rates.cnbRepo,
    cnb_discount: rates.cnbDiscount,
    cnb_lombard: rates.cnbLombard,
    pribor_3m: rates.pribor3m,
    pribor_1y: rates.pribor1y,
    mortgage_avg_rate: rates.mortgageAvgRate,
    mortgage_rate_fix1y: rates.mortgageRateFix1y,
    mortgage_rate_fix5y: rates.mortgageRateFix5y,
    mortgage_rate_fix10y: rates.mortgageRateFix10y,
    mortgage_rate_fix10yplus: rates.mortgageRateFix10yPlus,
    mortgage_rpsn: rates.mortgageRpsn,
    mortgage_volume_total: rates.mortgageVolumeTotal,
    mortgage_volume_fix5y: rates.mortgageVolumeFix5y,
    source: 'arad',
  }, { onConflict: 'rate_date,source' });
  if (error) console.error('[Rates] DB save error:', error.message);
  else console.log(`[Rates] Saved to DB: ${rates.lastUpdated}, repo ${rates.cnbRepo}%, avg mortgage ${rates.mortgageAvgRate}%`);
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
    pribor3m: Number(data.pribor_3m ?? 0),
    pribor1y: Number(data.pribor_1y ?? 0),
    mortgageAvgRate: Number(data.mortgage_avg_rate ?? 0),
    mortgageRateFix1y: Number(data.mortgage_rate_fix1y ?? 0),
    mortgageRateFix5y: Number(data.mortgage_rate_fix5y ?? 0),
    mortgageRateFix10y: Number(data.mortgage_rate_fix10y ?? 0),
    mortgageRateFix10yPlus: Number(data.mortgage_rate_fix10yplus ?? 0),
    mortgageRpsn: Number(data.mortgage_rpsn ?? 0),
    mortgageVolumeTotal: Number(data.mortgage_volume_total ?? 0),
    mortgageVolumeFix5y: Number(data.mortgage_volume_fix5y ?? 0),
    lastUpdated: data.rate_date,
    source: data.source,
  };
}

// ============================================================
// getMarketRates() - main entry point
// ============================================================
export async function getMarketRates(): Promise<LiveRates> {
  if (cachedRates && Date.now() - ratesCacheTs < RATES_CACHE_TTL) {
    return cachedRates;
  }

  const db = getDb();
  if (!db) {
    console.error('[Rates] No DB connection');
    if (cachedRates) return cachedRates;
    return emptyRates();
  }

  const dbRates = await loadRatesFromDb(db);
  if (dbRates && dbRates.lastUpdated === today()) {
    cachedRates = dbRates;
    ratesCacheTs = Date.now();
    console.log(`[Rates] From DB: repo ${dbRates.cnbRepo}%, avg mortgage ${dbRates.mortgageAvgRate}% (${dbRates.lastUpdated})`);
    return dbRates;
  }

  // DB data stale or missing - fetch from ARAD
  const aradData = await fetchFromArad();
  if (aradData) {
    const freshRates = buildRates(aradData, dbRates ?? {});
    await saveRatesToDb(db, freshRates);
    cachedRates = freshRates;
    ratesCacheTs = Date.now();
    return freshRates;
  }

  // ARAD failed - use stale DB data
  if (dbRates) {
    cachedRates = dbRates;
    ratesCacheTs = Date.now();
    console.log(`[Rates] ARAD unavailable, using DB from ${dbRates.lastUpdated}`);
    return dbRates;
  }

  console.error('[Rates] No data available');
  return emptyRates();
}

function emptyRates(): LiveRates {
  return {
    cnbRepo: 0, cnbDiscount: 0, cnbLombard: 0,
    pribor3m: 0, pribor1y: 0,
    mortgageAvgRate: 0, mortgageRateFix1y: 0, mortgageRateFix5y: 0,
    mortgageRateFix10y: 0, mortgageRateFix10yPlus: 0, mortgageRpsn: 0,
    mortgageVolumeTotal: 0, mortgageVolumeFix5y: 0,
    lastUpdated: today(), source: 'none',
  };
}

// ============================================================
// refreshRates() - called by cron endpoint
// Forces fresh ARAD fetch and DB save regardless of cache
// ============================================================
export async function refreshRates(): Promise<{ success: boolean; rates?: LiveRates; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'No DB connection' };

  const aradData = await fetchFromArad();
  if (!aradData) return { success: false, error: 'ARAD fetch failed' };

  const prev = await loadRatesFromDb(db);
  const freshRates = buildRates(aradData, prev ?? {});
  await saveRatesToDb(db, freshRates);

  cachedRates = freshRates;
  ratesCacheTs = Date.now();

  return { success: true, rates: freshRates };
}

// ============================================================
// Bank spreads from DB
// ============================================================
export async function getBankSpreads(tenantId = getDefaultTenantId()): Promise<BankSpread[]> {
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

  console.error('[Spreads] No DB connection - bank spreads unavailable');
  return [];
}

// ============================================================
// getDynamicDefaultRate - uses real ČNB avg mortgage rate
// ============================================================
export async function getDynamicDefaultRate(): Promise<{ rate: number; rpsn: number }> {
  const rates = await getMarketRates();

  // Use real avg mortgage rate from ČNB (fix 1-5y is most common)
  if (rates.mortgageRateFix5y > 0) {
    return {
      rate: rates.mortgageRateFix5y / 100,
      rpsn: (rates.mortgageRpsn > 0 ? rates.mortgageRpsn : rates.mortgageRateFix5y * 1.04) / 100,
    };
  }

  // Fallback to avg rate
  if (rates.mortgageAvgRate > 0) {
    return {
      rate: rates.mortgageAvgRate / 100,
      rpsn: (rates.mortgageRpsn > 0 ? rates.mortgageRpsn : rates.mortgageAvgRate * 1.04) / 100,
    };
  }

  // Last resort: repo + 1% margin
  const rate = round2(rates.cnbRepo + 1.0) / 100;
  return { rate, rpsn: rate * 1.04 };
}

// ============================================================
// getBankRates - compute final rates from repo + spreads
// ============================================================
export async function getBankRates(tenantId = getDefaultTenantId()) {
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

  return {
    banks,
    ourRates: ourSpread ? {
      fix3y: round2(repo + ourSpread.spread3y),
      fix5y: round2(repo + ourSpread.spread5y),
      fix10y: round2(repo + ourSpread.spread10y),
    } : null,
  };
}

// ============================================================
// getRatesContext - text for system prompt (business-oriented)
// ============================================================
export async function getRatesContext(tenantId = getDefaultTenantId()): Promise<string> {
  const [rates, bankRates] = await Promise.all([
    getMarketRates(),
    getBankRates(tenantId),
  ]);

  const hasAvg = rates.mortgageAvgRate > 0;

  return `AKTUALNI SAZBY (${rates.lastUpdated}, zdroj: CNB ARAD):

ZAKLADNI SAZBA CNB:
- 2T repo sazba: ${rates.cnbRepo} %

${hasAvg ? `PRUMERNE SAZBY NOVYCH HYPOTEK NA BYDLENI (data CNB, prumer trhu):
- Prumer celkem: ${rates.mortgageAvgRate} %
- Fixace do 1 roku: ${rates.mortgageRateFix1y} %
- Fixace 1-5 let: ${rates.mortgageRateFix5y} %
- Fixace 5-10 let: ${rates.mortgageRateFix10y} %
- Fixace nad 10 let: ${rates.mortgageRateFix10yPlus} %
- RPSN (prumer): ${rates.mortgageRpsn} %` : `ORIENTACNI SAZBY (repo ${rates.cnbRepo} % + marze bank):
- Sazby se pohybuji v rozmezi ${round2(rates.cnbRepo + 0.6)} % az ${round2(rates.cnbRepo + 1.5)} %`}

${bankRates.ourRates ? `NASE SAZBY (diky exkluzivnim smlouvam se vsemi bankami):
- Fixace 3 roky: od ${bankRates.ourRates.fix3y} %
- Fixace 5 let: od ${bankRates.ourRates.fix5y} %
- Fixace 10 let: od ${bankRates.ourRates.fix10y} %
(Tyto sazby jsou orientacni - finalni nabidka zavisi na individualni situaci klienta)` : ''}

PRAVIDLA PRO KOMUNIKACI SAZEB:
- Sazby vyse jsou PRUMERNE sazby na trhu podle dat CNB. Klientovi rikej: "Prumerna sazba na trhu je aktualne X %, ale konkretni nabidka zavisi na vasi situaci."
- NIKDY nezminuj PRIBOR, IRS, diskontni sazbu - to jsou technicke pojmy
- Zduraznuj, ze diky nasim exkluzivnim smlouvam se vsemi bankami dokazeme nabidnout VYHODNEJSI podminky nez prumer trhu
- Presnou sazbu muze stanovit POUZE poradce po osobni konzultaci - zavisi na mnoha faktorech (vyse uveru, LTV, prijem, typ nemovitosti, ucel, fixace, pojisteni)
- Osobni konzultace je ZDARMA a NEZAVAZNA - pri ni se probere vse dukladne a duverně
- Kdyz klient chce presnou sazbu: "To je presne to, co vam nas poradce spocita na miru. Prumerna sazba na trhu je ${hasAvg ? rates.mortgageAvgRate : round2(rates.cnbRepo + 1.0)} %, ale my dokazeme nabidnout lepe. Staci zanechat kontakt."
- Klient casto nevi na co se zeptat - proto je osobni konzultace tak dulezita. Poradce probere vsechny moznosti a najde nejlepsi reseni.`;
}
