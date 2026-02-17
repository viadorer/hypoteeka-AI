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

  async listSessions(tenantId?: string, authorId?: string): Promise<SessionData[]> {
    ensureDirs();
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    const sessions: SessionData[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8');
        const session = JSON.parse(raw) as SessionData;
        // Filter by tenantId
        if (tenantId && session.tenantId !== tenantId && session.tenantId) {
          continue;
        }
        // Filter by authorId
        if (authorId && session.authorId !== authorId && session.authorId) {
          continue;
        }
        sessions.push(session);
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
        title: 'ČNB snížila základní sazbu na 3,75 %',
        slug: 'cnb-sazba-2025-02',
        summary: 'Česká národní banka snížila repo sazbu o 0,25 procentního bodu. Co to znamená pro hypotéky?',
        content: '## ČNB snížila základní sazbu na 3,75 %\n\nČeská národní banka na svém posledním zasedání rozhodla o snížení repo sazby o 0,25 procentního bodu na **3,75 %**.\n\n### Co to znamená pro hypotéky?\n\n- **Nižší úrokové sazby** -- banky postupně snižují nabídkové sazby hypoték\n- **Průměrná sazba** nové hypotéky klesla na přibližně 4,8 %\n- **Dostupnost bydlení** se mírně zlepšuje\n\n### Doporučení\n\nPokud zvažujete hypotéku, je vhodné:\n\n1. Porovnat nabídky více bank\n2. Zvážit delší fixaci (5 let) pro jistotu nízké sazby\n3. Nechat si spočítat bonitu -- naše AI vám s tím pomůže',
        published: true,
        publishedAt: '2025-02-05T10:00:00+01:00',
        createdAt: '2025-02-05T10:00:00+01:00',
        updatedAt: '2025-02-05T10:00:00+01:00',
      },
      {
        id: 'news-2',
        tenantId: 'hypoteeka',
        title: 'Nové limity ČNB pro rok 2025',
        slug: 'cnb-limity-2025',
        summary: 'Od ledna 2025 platí nové limity pro ukazatele LTV, DSTI a DTI. Shrnujeme změny.',
        content: '## Nové limity ČNB pro rok 2025\n\nOd **1. ledna 2025** platí aktualizované limity České národní banky.\n\n### Aktuální limity\n\n| Ukazatel | Limit | Poznámka |\n|----------|-------|----------|\n| **LTV** | max 80 % | Pro osoby do 36 let až 90 % |\n| **DSTI** | max 45 % | Poměr splátky k příjmu |\n| **DTI** | max 8,5x | Poměr dluhu k ročnímu příjmu |\n\n### Co to znamená v praxi?\n\n- Při koupi bytu za **5 000 000 Kč** potřebujete minimálně **1 000 000 Kč** vlastních zdrojů\n- Mladí do 36 let mohou mít vlastní zdroje pouze **500 000 Kč**',
        published: true,
        publishedAt: '2025-01-15T09:00:00+01:00',
        createdAt: '2025-01-15T09:00:00+01:00',
        updatedAt: '2025-01-15T09:00:00+01:00',
      },
      {
        id: 'news-3',
        tenantId: 'hypoteeka',
        title: 'Nová funkce: srovnání nájmu a hypotéky',
        slug: 'nova-funkce-najem-vs-hypo',
        summary: 'Přidali jsme novou funkci pro srovnání měsíčních nákladů na nájem a hypotéku.',
        content: '## Nová funkce: Nájem vs. hypotéka\n\nPřidali jsme do naší AI kalkulačky novou funkci -- **srovnání nájmu a hypotéky**.\n\n### Jak to funguje?\n\n1. Zadejte cenu nemovitosti a vaši aktuální výši nájmu\n2. AI spočítá měsíční splátku hypotéky\n3. Porovnáte celkové náklady za 30 let\n4. Zjistíte, kdy se hypotéka začne vyplácet (break-even bod)',
        published: true,
        publishedAt: '2025-01-28T14:00:00+01:00',
        createdAt: '2025-01-28T14:00:00+01:00',
        updatedAt: '2025-01-28T14:00:00+01:00',
      },
    ];
  }
}
