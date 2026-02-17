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
  console.log('[Storage] Using JsonFileStorage (local dev)');
  return new JsonFileStorage();
}

export const storage: StorageProvider = createStorage();

export type { StorageProvider, SessionData, LeadRecord, MessageRecord, UserProfile } from './types';
