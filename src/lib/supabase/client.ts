/**
 * Supabase Client
 *
 * Server-side klient pro API routes.
 * Používá service_role key - obchází RLS.
 *
 * DB = sdílený Supabase projekt PTF reality. Všechny tabulky hypoteeky žijí
 * v odděleném Postgres schématu "hypoteeka" (viz db/ptf-setup/), takže se
 * nemůžou srazit s tabulkami PTF (tenants, leads, news, ...) v public schématu.
 * Schéma musí být v PTF projektu přidané do Data API "Exposed schemas".
 */

import { createClient } from '@supabase/supabase-js';
import { HYPOTEEKA_DB_SCHEMA } from './schema';

export { HYPOTEEKA_DB_SCHEMA } from './schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY - falling back to JSON storage');
}

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      db: { schema: HYPOTEEKA_DB_SCHEMA },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
