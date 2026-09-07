/**
 * Storage singleton - auto-detect
 * 
 * Supabase: pokud jsou nastaveny NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * JSON:     fallback pro lokální vývoj bez Supabase
 */

import { JsonFileStorage } from './json-storage';
import { SupabaseStorage } from './supabase-storage';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import type { StorageProvider } from './types';

function createStorage(): StorageProvider {
  if (isSupabaseConfigured() && supabase) {
    console.log('[Storage] Using SupabaseStorage');
    return new SupabaseStorage(supabase);
  }
  // Na serverless hostingu zápisy do FS nepřežijí konec požadavku — tichý
  // JSON fallback na produkci znamená ztracené leady (CLAUDE.md 2.3).
  // Výjimka: prerender při `next build` (statické stránky jako /clanky) smí
  // proběhnout bez DB — leady vznikají jen za běhu, ne při buildu.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    throw new Error(
      '[Storage] Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY (PTF DB). ' +
      'Produkční build bez databáze je zakázán — doplň env proměnné ve Vercelu.'
    );
  }
  console.log('[Storage] Using JsonFileStorage (local dev)');
  return new JsonFileStorage();
}

// Lazy inicializace: bez env proměnných nesmí spadnout import modulu
// (next build importuje API routes při analýze), ale až první skutečné
// použití storage za běhu — to pak selže hlasitě, ne tichým fallbackem.
let instance: StorageProvider | null = null;

function getStorage(): StorageProvider {
  if (!instance) instance = createStorage();
  return instance;
}

export const storage: StorageProvider = new Proxy({} as StorageProvider, {
  get(_target, prop) {
    const s = getStorage();
    const value = s[prop as keyof StorageProvider];
    return typeof value === 'function' ? value.bind(s) : value;
  },
});

export type { StorageProvider, SessionData, LeadRecord, MessageRecord, UserProfile } from './types';
