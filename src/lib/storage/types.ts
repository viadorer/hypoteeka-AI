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
  authorId: string; // Browser fingerprint or user ID for session ownership
  profile: ClientProfile;
  state: ConversationState;
  messages: MessageRecord[];
  uiMessages?: unknown[]; // Complete AI SDK UIMessage[] for conversation restore
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
  realvisorLeadId?: string;
  realvisorContactId?: string;
  createdAt: string;
}

export interface WidgetEventRecord {
  tenantId: string;
  sessionId: string;
  widgetType: string;
  inputData: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  interaction?: string;
}

export interface PropertyRecord {
  tenantId: string;
  sessionId: string;
  price?: number;
  propertyType?: string;
  location?: string;
  purpose?: string;
  equity?: number;
  loanAmount?: number;
  ltv?: number;
  monthlyPayment?: number;
  interestRate?: number;
  fixationYears?: number;
  expectedRentalIncome?: number;
  rentalYield?: number;
  details?: Record<string, unknown>;
}

export interface ProjectRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  profile: ClientProfile;
  sessionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NewsRecord {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  published: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageProvider {
  // Sessions
  getSession(sessionId: string): Promise<SessionData | null>;
  saveSession(session: SessionData): Promise<void>;
  listSessions(tenantId?: string, authorId?: string): Promise<SessionData[]>;

  // Leads
  saveLead(lead: LeadRecord): Promise<void>;
  getLeads(tenantId?: string): Promise<LeadRecord[]>;

  // Widget events
  saveWidgetEvent(event: WidgetEventRecord): Promise<void>;

  // Properties
  saveProperty(property: PropertyRecord): Promise<void>;

  // Projects
  getProject(projectId: string): Promise<ProjectRecord | null>;
  saveProject(project: ProjectRecord): Promise<void>;
  listProjects(tenantId?: string): Promise<ProjectRecord[]>;
  deleteProject(projectId: string): Promise<void>;

  // News
  listNews(tenantId?: string): Promise<NewsRecord[]>;

  // Cleanup
  deleteSession(sessionId: string): Promise<void>;
}
