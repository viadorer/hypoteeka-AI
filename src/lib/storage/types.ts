/**
 * Storage abstraction layer
 * 
 * MIGRACE NA PRODUKCI:
 * 1. Vytvor novy soubor napr. src/lib/storage/supabase-storage.ts
 * 2. Implementuj interface StorageProvider s Supabase klientem
 * 3. V src/lib/storage/index.ts zmen export na novou implementaci
 * 4. Hotovo - zbytek kodu se nemeni
 * 
 * Alternativy pro produkci:
 * - Supabase (Postgres + realtime + auth) - doporuceno
 * - Vercel KV (Redis) - pro session data
 * - PlanetScale (MySQL) - skalovatelne
 * - Neon (serverless Postgres)
 */

import type { ClientProfile } from '../agent/client-profile';
import type { ConversationState } from '../agent/conversation-state';

export interface SessionData {
  id: string;
  tenantId: string;
  profile: ClientProfile;
  state: ConversationState;
  messages: MessageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: string[];
  timestamp: string;
}

export interface LeadRecord {
  id: string;
  tenantId: string;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  context: string;
  profile: ClientProfile;
  leadScore: number;
  leadTemperature: string;
  createdAt: string;
}

export interface StorageProvider {
  // Sessions
  getSession(sessionId: string): Promise<SessionData | null>;
  saveSession(session: SessionData): Promise<void>;
  listSessions(tenantId?: string): Promise<SessionData[]>;

  // Leads
  saveLead(lead: LeadRecord): Promise<void>;
  getLeads(tenantId?: string): Promise<LeadRecord[]>;

  // Cleanup
  deleteSession(sessionId: string): Promise<void>;
}
