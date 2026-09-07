/**
 * Přímý přístup do PTF tabulek (schéma `public` sdíleného Supabase projektu).
 *
 * PROČ VEDLE API: PTF backend má veřejný endpoint jen pro založení leadu.
 * Aktivity (timeline případu) a `case_type` přes veřejné API nastavit nejde —
 * admin API je za přihlášením. Zapisujeme tedy service klíčem přímo do
 * `public.activities` a `public.leads`.
 *
 * Zapisují se JEN data do existujících tabulek. Struktura PTF se nemění:
 * žádný sloupec, žádný enum, žádný trigger.
 *
 * Hlavní klient hypoteeky míří do schématu `hypoteeka`, proto tu je druhá
 * instance klienta se schématem `public`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient<any, any, any, any, any> | null = null;

export function getPtfPublicDb(): SupabaseClient<any, any, any, any, any> | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  cached = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'public' },
  });
  return cached;
}
