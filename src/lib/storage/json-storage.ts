/**
 * JSON File Storage - lokalni ukladani pro vyvoj
 * 
 * Data se ukladaji do /data/*.json
 * Na produkci nahradit za supabase-storage.ts (viz types.ts)
 */

import fs from 'fs';
import path from 'path';
import type { StorageProvider, SessionData, LeadRecord, WidgetEventRecord, PropertyRecord, ProjectRecord, NewsRecord } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

function sessionPath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(SESSIONS_DIR, `${safe}.json`);
}

function projectPath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(PROJECTS_DIR, `${safe}.json`);
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
    // Preserve existing uiMessages if not provided (e.g. from onStepFinish)
    if (!session.uiMessages) {
      const existing = await this.getSession(session.id);
      if (existing?.uiMessages) {
        session.uiMessages = existing.uiMessages;
      }
    }
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

  async getProject(projectId: string): Promise<ProjectRecord | null> {
    const p = projectPath(projectId);
    if (!fs.existsSync(p)) return null;
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw) as ProjectRecord;
    } catch {
      return null;
    }
  }

  async saveProject(project: ProjectRecord): Promise<void> {
    ensureDirs();
    project.updatedAt = new Date().toISOString();
    fs.writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2), 'utf-8');
  }

  async listProjects(tenantId?: string): Promise<ProjectRecord[]> {
    ensureDirs();
    const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'));
    const projects: ProjectRecord[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf-8');
        const project = JSON.parse(raw) as ProjectRecord;
        if (!tenantId || project.tenantId === tenantId || !project.tenantId) {
          projects.push(project);
        }
      } catch { /* skip corrupted files */ }
    }
    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return projects;
  }

  async deleteProject(projectId: string): Promise<void> {
    const p = projectPath(projectId);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  async listNews(_tenantId?: string): Promise<NewsRecord[]> {
    // Local dev seed data
    return [
      {
        id: 'news-1',
        tenantId: 'hypoteeka',
        title: 'CNB snizila zakladni sazbu na 3,75 %',
        slug: 'cnb-sazba-2025-02',
        summary: 'Ceska narodni banka snizila repo sazbu o 0,25 procentniho bodu. Co to znamena pro hypoteky?',
        content: '## CNB snizila zakladni sazbu na 3,75 %\n\nCeska narodni banka na svem poslednim zasedani rozhodla o snizeni repo sazby o 0,25 procentniho bodu na **3,75 %**.\n\n### Co to znamena pro hypoteky?\n\n- **Nizsi urokove sazby** -- banky postupne snizuji nabidkove sazby hypotek\n- **Prumerna sazba** nove hypoteky klesla na priblizne 4,8 %\n- **Dostupnost bydleni** se mirne zlepsuje\n\n### Doporuceni\n\nPokud zvazujete hypoteku, je vhodne:\n\n1. Porovnat nabidky vice bank\n2. Zvazit delsi fixaci (5 let) pro jistotu nizke sazby\n3. Nechat si spocitat bonitu -- nase AI vam s tim pomuze',
        published: true,
        publishedAt: '2025-02-05T10:00:00+01:00',
        createdAt: '2025-02-05T10:00:00+01:00',
        updatedAt: '2025-02-05T10:00:00+01:00',
      },
      {
        id: 'news-2',
        tenantId: 'hypoteeka',
        title: 'Nove limity CNB pro rok 2025',
        slug: 'cnb-limity-2025',
        summary: 'Od ledna 2025 plati nove limity pro ukazatele LTV, DSTI a DTI. Shrnujeme zmeny.',
        content: '## Nove limity CNB pro rok 2025\n\nOd **1. ledna 2025** plati aktualizovane limity Ceske narodni banky.\n\n### Aktualni limity\n\n| Ukazatel | Limit | Poznamka |\n|----------|-------|----------|\n| **LTV** | max 80 % | Pro osoby do 36 let az 90 % |\n| **DSTI** | max 45 % | Pomer splatky k prijmu |\n| **DTI** | max 8,5x | Pomer dluhu k rocnimu prijmu |\n\n### Co to znamena v praxi?\n\n- Pri koupi bytu za **5 000 000 Kc** potrebujete minimalne **1 000 000 Kc** vlastnich zdroju\n- Mladi do 36 let mohou mit vlastni zdroje pouze **500 000 Kc**',
        published: true,
        publishedAt: '2025-01-15T09:00:00+01:00',
        createdAt: '2025-01-15T09:00:00+01:00',
        updatedAt: '2025-01-15T09:00:00+01:00',
      },
      {
        id: 'news-3',
        tenantId: 'hypoteeka',
        title: 'Nova funkce: srovnani najmu a hypoteky',
        slug: 'nova-funkce-najem-vs-hypo',
        summary: 'Pridali jsme novou funkci pro srovnani mesicnich nakladu na najem a hypoteku.',
        content: '## Nova funkce: Najem vs. hypoteka\n\nPridali jsme do nasi AI kalkulacky novou funkci -- **srovnani najmu a hypoteky**.\n\n### Jak to funguje?\n\n1. Zadejte cenu nemovitosti a vasi aktualni vysi najmu\n2. AI spocita mesicni splatku hypoteky\n3. Porovnate celkove naklady za 30 let\n4. Zjistite, kdy se hypoteka zacne vyplacet (break-even bod)',
        published: true,
        publishedAt: '2025-01-28T14:00:00+01:00',
        createdAt: '2025-01-28T14:00:00+01:00',
        updatedAt: '2025-01-28T14:00:00+01:00',
      },
    ];
  }
}
