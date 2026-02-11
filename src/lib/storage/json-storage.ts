/**
 * JSON File Storage - lokalni ukladani pro vyvoj
 * 
 * Data se ukladaji do /data/*.json
 * Na produkci nahradit za supabase-storage.ts (viz types.ts)
 */

import fs from 'fs';
import path from 'path';
import type { StorageProvider, SessionData, LeadRecord, WidgetEventRecord, PropertyRecord } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionPath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(SESSIONS_DIR, `${safe}.json`);
}

export class JsonFileStorage implements StorageProvider {
  constructor() {
    ensureDirs();
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const p = sessionPath(sessionId);
    if (!fs.existsSync(p)) return null;
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  }

  async saveSession(session: SessionData): Promise<void> {
    ensureDirs();
    session.updatedAt = new Date().toISOString();
    fs.writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf-8');
  }

  async saveLead(lead: LeadRecord): Promise<void> {
    ensureDirs();
    const leads = await this.getLeads();
    leads.push(lead);
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  }

  async getLeads(tenantId?: string): Promise<LeadRecord[]> {
    if (!fs.existsSync(LEADS_FILE)) return [];
    try {
      const raw = fs.readFileSync(LEADS_FILE, 'utf-8');
      const leads = JSON.parse(raw) as LeadRecord[];
      if (tenantId) return leads.filter(l => l.tenantId === tenantId || !l.tenantId);
      return leads;
    } catch {
      return [];
    }
  }

  async listSessions(tenantId?: string): Promise<SessionData[]> {
    ensureDirs();
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    const sessions: SessionData[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8');
        const session = JSON.parse(raw) as SessionData;
        if (!tenantId || session.tenantId === tenantId || !session.tenantId) {
          sessions.push(session);
        }
      } catch { /* skip corrupted files */ }
    }
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sessions;
  }

  async saveWidgetEvent(event: WidgetEventRecord): Promise<void> {
    console.log(`[JsonStorage] Widget event: ${event.widgetType} (session: ${event.sessionId})`);
  }

  async saveProperty(property: PropertyRecord): Promise<void> {
    console.log(`[JsonStorage] Property saved: ${property.price} ${property.propertyType ?? ''} (session: ${property.sessionId})`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const p = sessionPath(sessionId);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
