-- ============================================================
-- Hypoteeka AI - Supabase DB Schema (Multitenant)
-- ============================================================
-- Principy:
--   1. MULTITENANT: tenant_id na všech datových tabulkách
--   2. auth.users (Supabase Auth) = identita uživatele (sdílená across tenants)
--   3. JSONB pro dynamická data (profil, state) - nemusíme migrovat sloupce
--   4. Relační sloupce pro to, co se filtruje/indexuje
--   5. RLS - uživatel vidí jen svá data v rámci tenantu
--   6. Jeden uživatel = více sessions, může být ve více tenantech
-- ============================================================

-- ============================================================
-- 0. TENANTS - konfigurace produktů/webů
-- ============================================================
-- Každý tenant = jeden produkt/web (hypoteeka.cz, odhad.online, ...)
-- Tenant definuje branding, AI konfiguraci, features.
-- AI API key se NEUKLÁDÁ do DB - jen název env proměnné.
create table public.tenants (
  id text primary key,              -- 'hypoteeka', 'odhad', ...
  name text not null,               -- 'Hypoteeka.cz'
  domain text,                      -- 'hypoteeka.cz'

  -- Branding
  branding jsonb not null default '{}',
  -- { logo_url, primary_color, accent_color, title, description }

  -- AI konfigurace
  ai_config jsonb not null default '{}',
  -- { provider, model, temperature, max_tokens, max_steps, api_key_env }
  -- api_key_env = název env proměnné (např. "GOOGLE_AI_KEY_HYPOTEEKA")

  -- Feature flags per tenant
  features jsonb not null default '{}',
  -- { live_rates, vocative_greeting, lead_capture, knowledge_base_rag, ... }

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed: výchozí tenanti
insert into public.tenants (id, name, domain, branding, ai_config, features) values
('hypoteeka', 'Hypoteeka.cz', 'hypoteeka.cz',
  '{"primary_color": "#E91E63", "accent_color": "#0047FF", "title": "Hypoteeka AI", "description": "Hypoteční poradce"}',
  '{"provider": "google", "model": "gemini-2.0-flash", "temperature": 0.7, "max_steps": 5, "api_key_env": "GOOGLE_AI_KEY_HYPOTEEKA"}',
  '{"live_rates": true, "vocative_greeting": true, "lead_capture": true, "knowledge_base_rag": false}'),
('odhad', 'Odhad.online', 'odhad.online',
  '{"primary_color": "#2196F3", "accent_color": "#FF9800", "title": "Odhad.online", "description": "Odhad nemovitosti"}',
  '{"provider": "google", "model": "gemini-2.0-flash", "temperature": 0.5, "max_steps": 5, "api_key_env": "GOOGLE_AI_KEY_ODHAD"}',
  '{"live_rates": false, "vocative_greeting": true, "lead_capture": true, "knowledge_base_rag": false}');

-- ============================================================
-- 1. PROFILES - rozšířený profil uživatele (nad rámec auth.users)
-- ============================================================
-- Profil je SDÍLENÝ across tenants - jeden uživatel, jeden účet.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. SESSIONS - konverzační session (analýza)
-- ============================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),
  user_id uuid references public.profiles(id) on delete cascade,

  phase text not null default 'greeting'
    check (phase in ('greeting','discovery','analysis','qualification','conversion','followup')),
  lead_score integer not null default 0,
  lead_qualified boolean not null default false,
  lead_captured boolean not null default false,
  turn_count integer not null default 0,

  client_profile jsonb not null default '{}',
  conversation_state jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sessions_tenant on public.sessions(tenant_id);
create index idx_sessions_tenant_user on public.sessions(tenant_id, user_id);
create index idx_sessions_tenant_phase on public.sessions(tenant_id, phase);
create index idx_sessions_tenant_updated on public.sessions(tenant_id, updated_at desc);
create index idx_sessions_lead_score on public.sessions(lead_score desc);
create index idx_sessions_client_profile on public.sessions using gin(client_profile);

-- ============================================================
-- 3. MESSAGES - historie zpráv v session
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  tenant_id text not null default 'hypoteeka' references public.tenants(id),

  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  tool_calls jsonb default '[]',
  metadata jsonb default '{}',

  created_at timestamptz not null default now()
);

create index idx_messages_session on public.messages(session_id, created_at);
create index idx_messages_tenant on public.messages(tenant_id);

-- ============================================================
-- 4. LEADS - zachycené kontakty
-- ============================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),
  session_id uuid references public.sessions(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,

  name text not null,
  email text,
  phone text,

  context text default '',
  profile_snapshot jsonb not null default '{}',
  lead_score integer not null default 0,
  lead_temperature text default 'cold'
    check (lead_temperature in ('cold','warm','hot','qualified')),

  status text not null default 'new'
    check (status in ('new','contacted','meeting_scheduled','converted','lost')),
  assigned_to text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_tenant on public.leads(tenant_id);
create index idx_leads_tenant_status on public.leads(tenant_id, status);
create index idx_leads_tenant_created on public.leads(tenant_id, created_at desc);
create index idx_leads_user on public.leads(user_id);
create index idx_leads_session on public.leads(session_id);

-- ============================================================
-- 5. PROPERTIES - oceňované nemovitosti
-- ============================================================
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,

  price numeric,
  property_type text check (property_type in ('byt','dum','pozemek','rekonstrukce')),
  location text,
  purpose text check (purpose in ('vlastni_bydleni','investice','refinancovani','oceneni')),

  equity numeric,
  loan_amount numeric,
  ltv numeric,
  monthly_payment numeric,
  interest_rate numeric,
  fixation_years integer,

  expected_rental_income numeric,
  rental_yield numeric,

  -- Rozšiřitelná metadata (dispozice, plocha, stav, patro... pro odhad.online)
  details jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_tenant on public.properties(tenant_id);
create index idx_properties_tenant_user on public.properties(tenant_id, user_id);

-- ============================================================
-- 6. WIDGET_EVENTS - log zobrazených widgetů a interakcí
-- ============================================================
create table public.widget_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,

  widget_type text not null,
  input_data jsonb default '{}',
  output_data jsonb default '{}',
  interaction text,

  created_at timestamptz not null default now()
);

create index idx_widget_events_tenant on public.widget_events(tenant_id);
create index idx_widget_events_session on public.widget_events(session_id);
create index idx_widget_events_type on public.widget_events(tenant_id, widget_type);

-- ============================================================
-- 7. UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.tenants
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.sessions
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.leads
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.properties
  for each row execute function public.update_updated_at();

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Uživatel vidí jen svá data. Tenant izolace zajištěna přes session ownership.

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
alter table public.properties enable row level security;
alter table public.widget_events enable row level security;

-- Tenants: čitelné pro všechny (veřejná konfigurace)
create policy "Tenants are publicly readable"
  on public.tenants for select using (true);

-- Profiles: uživatel vidí jen svůj profil
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Sessions: uživatel vidí jen své sessions
create policy "Users can view own sessions"
  on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on public.sessions for insert with check (auth.uid() = user_id or user_id is null);
create policy "Users can update own sessions"
  on public.sessions for update using (auth.uid() = user_id or user_id is null);
create policy "Users can delete own sessions"
  on public.sessions for delete using (auth.uid() = user_id);

-- Messages: přes session ownership
create policy "Users can view messages of own sessions"
  on public.messages for select using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  );
create policy "Users can insert messages"
  on public.messages for insert with check (true);

-- Leads: uživatel vidí jen své leady
create policy "Users can view own leads"
  on public.leads for select using (auth.uid() = user_id);
create policy "Users can insert leads"
  on public.leads for insert with check (auth.uid() = user_id or user_id is null);

-- Properties: uživatel vidí jen své nemovitosti
create policy "Users can view own properties"
  on public.properties for select using (auth.uid() = user_id);
create policy "Users can manage own properties"
  on public.properties for all using (auth.uid() = user_id);

-- Widget events: přes session ownership
create policy "Users can view own widget events"
  on public.widget_events for select using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  );
create policy "Users can insert widget events"
  on public.widget_events for insert with check (true);

-- ============================================================
-- 9. VIEWS pro dashboard a analytics (tenant-scoped)
-- ============================================================

create or replace view public.session_summaries as
select
  s.id,
  s.tenant_id,
  s.user_id,
  s.phase,
  s.lead_score,
  s.lead_qualified,
  s.lead_captured,
  s.turn_count,
  s.client_profile->>'name' as client_name,
  (s.client_profile->>'propertyPrice')::numeric as property_price,
  s.client_profile->>'propertyType' as property_type,
  s.client_profile->>'location' as location,
  s.client_profile->>'purpose' as purpose,
  (s.client_profile->>'equity')::numeric as equity,
  (s.client_profile->>'monthlyIncome')::numeric as monthly_income,
  s.conversation_state->'widgetsShown' as widgets_shown,
  s.conversation_state->'dataCollected' as data_collected,
  s.created_at,
  s.updated_at
from public.sessions s;

-- Statistiky per tenant
create or replace view public.lead_stats as
select
  l.tenant_id,
  count(*) as total_leads,
  count(*) filter (where status = 'new') as new_leads,
  count(*) filter (where status = 'contacted') as contacted_leads,
  count(*) filter (where status = 'converted') as converted_leads,
  avg(lead_score) as avg_lead_score,
  count(*) filter (where l.created_at > now() - interval '7 days') as leads_last_7d,
  count(*) filter (where l.created_at > now() - interval '30 days') as leads_last_30d
from public.leads l
group by l.tenant_id;
