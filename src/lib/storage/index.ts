/**
 * Storage singleton
 * 
 * MIGRACE NA PRODUKCI:
 * Zmen tento soubor - nahrad JsonFileStorage za novou implementaci:
 * 
 * import { SupabaseStorage } from './supabase-storage';
 * export const storage = new SupabaseStorage();
 */

import { JsonFileStorage } from './json-storage';
import type { StorageProvider } from './types';

export const storage: StorageProvider = new JsonFileStorage();

export type { StorageProvider, SessionData, LeadRecord, MessageRecord } from './types';
