-- ============================================================
-- Hypoteeka AI - Prompt Management & Communication Style (Multitenant)
-- ============================================================
-- Prompty a styl komunikace uložené v DB, ne v kódu.
-- Změna promptu = UPDATE v DB, ne deploy.
-- Každý tenant má vlastní sadu promptů, stylů a znalostí.
--
-- AI konfigurace (model, teplota, api_key_env) je v tenants.ai_config (001).
-- Tady řešíme CO a JAK agent říká.
-- ============================================================

-- ============================================================
-- 1. PROMPT TEMPLATES - šablony promptů (per tenant)
-- ============================================================
create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),

  slug text not null,
  category text not null check (category in (
    'base_prompt',
    'phase_instruction',
    'rates_context',
    'tool_instruction',
    'guardrail',
    'personalization',
    'business_rules',
    'custom'
  )),

  content text not null,
  description text,

  phase text check (phase in ('greeting','discovery','analysis','qualification','conversion','followup')),

  sort_order integer not null default 0,
  is_active boolean not null default true,

  version integer not null default 1,
  previous_version_id uuid references public.prompt_templates(id),

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_prompt_templates_tenant_slug_version
  on public.prompt_templates(tenant_id, slug, version);
create index idx_prompt_templates_tenant_active
  on public.prompt_templates(tenant_id, is_active, category, sort_order);

-- ============================================================
-- 2. COMMUNICATION STYLES - styly komunikace (per tenant)
-- ============================================================
create table public.communication_styles (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),

  slug text not null,
  name text not null,
  description text,

  tone text not null default 'professional',
  style_prompt text not null,

  example_conversations jsonb default '[]',

  max_response_length integer default 150,
  use_formal_you boolean default true,
  allowed_phrases jsonb default '[]',
  forbidden_phrases jsonb default '[]',

  is_active boolean not null default true,
  is_default boolean not null default false,
  ab_weight integer not null default 100,

  avg_lead_score numeric default 0,
  conversion_rate numeric default 0,
  avg_session_length numeric default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_comm_styles_tenant_slug
  on public.communication_styles(tenant_id, slug);
create index idx_comm_styles_tenant_active
  on public.communication_styles(tenant_id, is_active);

-- ============================================================
-- 3. KNOWLEDGE BASE - znalostní báze (per tenant)
-- ============================================================
create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),

  category text not null check (category in (
    'faq',
    'cnb_rules',
    'bank_process',
    'legal',
    'product',
    'objection_handling',
    'competitor',
    'valuation',
    'custom'
  )),

  title text not null,
  content text not null,
  keywords text[] default '{}',

  trigger_conditions jsonb default '{}',

  -- embedding vector(1536), -- pgvector pro RAG

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_knowledge_base_tenant on public.knowledge_base(tenant_id);
create index idx_knowledge_base_tenant_category on public.knowledge_base(tenant_id, category);
create index idx_knowledge_base_keywords on public.knowledge_base using gin(keywords);

-- ============================================================
-- 4. PROMPT ANALYTICS - měření efektivity (per tenant)
-- ============================================================
create table public.prompt_analytics (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'hypoteeka' references public.tenants(id),
  session_id uuid not null references public.sessions(id) on delete cascade,

  communication_style_id uuid references public.communication_styles(id),
  prompt_versions jsonb default '{}',

  final_phase text,
  final_lead_score integer,
  lead_captured boolean default false,
  turn_count integer default 0,
  session_duration_seconds integer,

  quality_rating integer check (quality_rating between 1 and 5),
  user_feedback text,

  created_at timestamptz not null default now()
);

create index idx_prompt_analytics_tenant on public.prompt_analytics(tenant_id);
create index idx_prompt_analytics_style on public.prompt_analytics(communication_style_id);

-- ============================================================
-- 5. RLS
-- ============================================================
alter table public.prompt_templates enable row level security;
alter table public.communication_styles enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.prompt_analytics enable row level security;

-- Prompt config tables: readable by all (public config), writable by service role only
create policy "Prompt templates are publicly readable"
  on public.prompt_templates for select using (true);
create policy "Communication styles are publicly readable"
  on public.communication_styles for select using (true);
create policy "Knowledge base is publicly readable"
  on public.knowledge_base for select using (true);
create policy "Prompt analytics insertable"
  on public.prompt_analytics for insert with check (true);
create policy "Prompt analytics readable by session owner"
  on public.prompt_analytics for select using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  );

-- ============================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================
create trigger set_updated_at before update on public.prompt_templates
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.communication_styles
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.knowledge_base
  for each row execute function public.update_updated_at();

-- ============================================================
-- 7. SEED DATA - tenant 'hypoteeka'
-- ============================================================

-- Styly komunikace pro hypoteeka
insert into public.communication_styles (tenant_id, slug, name, tone, style_prompt, is_default, example_conversations) values
('hypoteeka', 'professional', 'Profesionální poradce', 'professional',
'Komunikuješ profesionálně ale přátelsky. Vykáš. Jsi věcný a konkrétní. Nepoužíváš emotikony. Odpovídáš krátce, max 2-3 věty. Když máš čísla, ukazuješ je. Nemluvíš obecně.',
true,
'[
  {"user": "Chci si koupit byt za 4 miliony", "assistant": "Byt za 4 000 000 Kč. Kolik máte vlastních zdrojů na financování?"},
  {"user": "Mám milion", "assistant": "S vlastními zdroji 1 000 000 Kč by úvěr činil 3 000 000 Kč. Měsíční splátka vychází na přibližně 15 900 Kč. Jaký je váš čistý měsíční příjem?"}
]'),
('hypoteeka', 'friendly', 'Přátelský poradce', 'friendly',
'Komunikuješ přátelsky a neformálně, ale stále odborně. Vykáš. Používáš kratší věty. Občas přidáš povzbuzení. Vysvětluješ jednoduše.',
false,
'[
  {"user": "Chci si koupit byt za 4 miliony", "assistant": "Byt za 4 miliony, to zní dobře! Kolik máte naspořeno na začátek?"},
  {"user": "Mám milion", "assistant": "Milion je dobrý základ. Úvěr by byl 3 miliony, splátka kolem 15 900 Kč měsíčně. Jaký máte příjem, ať ověříme bonitu?"}
]'),
('hypoteeka', 'expert', 'Expert analytik', 'expert',
'Komunikuješ jako zkušený finanční analytik. Používáš odbornou terminologii, ale vysvětluješ ji. Vždy uvádíš kontext a čísla. Proaktivně upozorňuješ na rizika a příležitosti.',
false,
'[
  {"user": "Chci si koupit byt za 4 miliony", "assistant": "Nemovitost v hodnotě 4 000 000 Kč. Pro stanovení parametrů úvěru potřebuji znát výši vlastních zdrojů. Aktuální repo sazba ČNB je 3,5 %, orientační sazby hypoték se pohybují od 4,1 %."},
  {"user": "Mám milion", "assistant": "LTV vychází na 75 %, což je pod limitem ČNB (80 %). Úvěr 3 000 000 Kč při orientační sazbě kolem 4,5 % a splatnosti 30 let znamená splátku přibližně 15 900 Kč. Pro ověření DSTI a DTI limitu potřebuji váš čistý měsíční příjem."}
]');

-- Prompt templates pro hypoteeka
insert into public.prompt_templates (tenant_id, slug, category, content, description, sort_order, phase) values

('hypoteeka', 'base_language', 'base_prompt',
'JAZYK: Vždy odpovídej POUZE česky. Každá tvoje odpověď musí být v češtině s diakritikou.',
'Jazykové pravidlo', 5, null),

('hypoteeka', 'base_identity', 'base_prompt',
'Jsi Hypoteeka AI - profesionální hypoteční poradce na webu hypoteeka.cz. Komunikuješ v češtině, přirozeným a přátelským tónem, ale zároveň profesionálně a věcně.',
'Základní identita agenta', 10, null),

('hypoteeka', 'base_communication', 'base_prompt',
'PRAVIDLA KOMUNIKACE:
- Piš krátce a věcně, max 2-3 věty na odpověď
- Neptej se na všechno najednou - postupuj krok po kroku
- Když klient zadá více informací najednou, zpracuj všechny najednou
- Používej české formáty čísel (1 000 000 Kč)
- Nikdy nepoužívej emotikony ani ikony
- Buď konkrétní - ukazuj čísla, ne obecné fráze
- Nikdy nevymýšlej čísla - počítej přesně podle vzorců
- Pokud ti chybí informace, zeptej se
- Buď upřímný - pokud klient nesplňuje limity, řekni to a navrhni řešení',
'Pravidla komunikace', 20, null),

('hypoteeka', 'personalization_vocative', 'personalization',
'PERSONALIZACE - OSLOVENÍ KLIENTA:
- Pokud znáš jméno klienta, oslovuj ho v 5. pádu (vokativ) českého jazyka
- Příklady: David -> Davide, Adam -> Adame, Jiří -> Jiří, Dominik -> Dominiku, Petr -> Petře, Jan -> Jane, Eva -> Evo, Marie -> Marie, Tomáš -> Tomáši
- U méně běžných jmen odvoď vokativ podle české gramatiky
- Oslovuj přirozeně, ne v každé větě',
'Vokativ a personalizace', 25, null),

('hypoteeka', 'guardrail_topic', 'guardrail',
'OMEZENÍ TÉMATU:
- Odpovídej POUZE na dotazy týkající se hypoték, financování nemovitostí, úvěrů, sazeb, ČNB pravidel, refinancování, investic do nemovitostí
- Pokud se klient ptá na něco mimo téma, zdvořile ho přesměruj a nabídni kontakt se specialistou
- Nikdy neodpovídej na dotazy o jiných finančních produktech (akcie, krypto, pojištění)',
'Omezení tématu', 30, null),

('hypoteeka', 'guardrail_rates', 'business_rules',
'PRAVIDLA PRO KOMUNIKACI SAZEB:
- NIKDY neslibuj žádnou konkrétní sazbu
- Vše je vždy "od", "orientačně", "v rozmezí", "závisí na individuálním posouzení"
- Konkrétní sazbu může stanovit POUZE poradce po kompletní analýze
- Sazba závisí na: výše úvěru, LTV, příjem, typ nemovitosti, účel, délka fixace, pojištění
- Vždy zdůrazni, že nezávazná konzultace s poradcem je zdarma',
'Pravidla pro sazby - nikdy neslibovat', 35, null),

('hypoteeka', 'cnb_rules', 'base_prompt',
'METODIKA ČNB 2026:
- LTV limit: 80 % (90 % pro mladé do 36 let)
- DSTI limit: 45 % (splátka / čistý měsíční příjem)
- DTI limit: 9,5 (výše úvěru / roční čistý příjem)
- Bázová sazba: 4,5 % p.a.
- Standardní splatnost: 30 let',
'Pravidla ČNB', 40, null),

('hypoteeka', 'phase_greeting', 'phase_instruction',
'AKTUÁLNÍ FÁZE: ÚVOD
- Pokud znáš jméno klienta, přivítej ho osobně v 5. pádu
- Pokud jméno neznáš, přivítej obecně a zeptej se, s čím mu můžeš pomoci
- Zjisti základní účel (vlastní bydlení, investice, refinancování)
- Pokud klient rovnou zadá data, zpracuj je a přejdi do další fáze',
'Instrukce pro fázi: Úvod', 100, 'greeting'),

('hypoteeka', 'phase_discovery', 'phase_instruction',
'AKTUÁLNÍ FÁZE: SBĚR DAT
- Postupně zjišťuj klíčové informace
- Po každém novém údaji ukazuj relevantní widget
- Neptej se na víc než jednu věc najednou
- Když máš cenu + vlastní zdroje, ukaž splátku
- Když máš i příjem, proveď bonitu',
'Instrukce pro fázi: Sběr dat', 101, 'discovery'),

('hypoteeka', 'phase_analysis', 'phase_instruction',
'AKTUÁLNÍ FÁZE: ANALÝZA
- Máš dostatek dat pro základní výpočty
- Zobrazuj widgety s výpočty
- Vysvětluj výsledky srozumitelně
- Ptej se na doplňující informace (příjem, věk)',
'Instrukce pro fázi: Analýza', 102, 'analysis'),

('hypoteeka', 'phase_qualification', 'phase_instruction',
'AKTUÁLNÍ FÁZE: KVALIFIKACE
- Proveď kompletní kontrolu bonity (LTV, DSTI, DTI)
- Jasně řekni, zda klient splňuje podmínky
- Pokud nesplňuje, navrhni konkrétní řešení
- Pokud splňuje, pochval a nabídni další kroky',
'Instrukce pro fázi: Kvalifikace', 103, 'qualification'),

('hypoteeka', 'phase_conversion', 'phase_instruction',
'AKTUÁLNÍ FÁZE: KONVERZE
- Klient je kvalifikovaný - nabídni mu konkrétní další kroky
- Nabídni kontaktní formulář pro nezávaznou konzultaci
- Zdůrazňuj hodnotu osobního poradce
- Použij show_lead_capture když je to vhodné',
'Instrukce pro fázi: Konverze', 104, 'conversion'),

('hypoteeka', 'phase_followup', 'phase_instruction',
'AKTUÁLNÍ FÁZE: NÁSLEDNÁ PÉČE
- Klient už odeslal kontakt
- Odpovídej na doplňující dotazy
- Nabídni další výpočty pokud má zájem
- Ujisti ho, že se mu poradce ozve',
'Instrukce pro fázi: Následná péče', 105, 'followup'),

('hypoteeka', 'tool_instructions', 'tool_instruction',
'POUŽÍVÁNÍ NÁSTROJŮ:
- show_property: když máš cenu nemovitosti
- show_payment: když máš cenu + vlastní zdroje
- show_eligibility: když máš cenu + zdroje + příjem
- show_rent_vs_buy: když se ptá na nájem vs koupení
- show_investment: když se ptá na investiční nemovitost
- show_affordability: když se ptá kolik si může dovolit
- show_refinance: když se ptá na refinancování
- show_amortization: když chce vidět splácení v čase
- show_lead_capture: když je klient kvalifikovaný a připraven
- update_profile: VŽDY když klient zadá nové údaje
- Můžeš použít více nástrojů najednou pokud máš dostatek dat',
'Instrukce pro používání nástrojů', 200, null);

-- Znalostní báze pro hypoteeka
insert into public.knowledge_base (tenant_id, category, title, content, keywords) values

('hypoteeka', 'faq', 'Co je LTV?',
'LTV (Loan-to-Value) je poměr výše úvěru k hodnotě nemovitosti. Například při ceně nemovitosti 5 000 000 Kč a vlastních zdrojích 1 000 000 Kč je LTV 80 %. ČNB doporučuje maximální LTV 80 % (90 % pro žadatele do 36 let).',
'{ltv, loan to value, poměr, vlastní zdroje}'),

('hypoteeka', 'faq', 'Co je DSTI?',
'DSTI (Debt Service-to-Income) je poměr měsíční splátky všech úvěrů k čistému měsíčnímu příjmu. ČNB doporučuje maximum 45 %. Pokud máte příjem 50 000 Kč, celkové měsíční splátky by neměly přesáhnout 22 500 Kč.',
'{dsti, splátka, příjem, poměr}'),

('hypoteeka', 'faq', 'Co je DTI?',
'DTI (Debt-to-Income) je poměr celkového dluhu k ročnímu čistému příjmu. ČNB doporučuje maximum 9,5. Při ročním příjmu 600 000 Kč by celkový dluh neměl přesáhnout 5 700 000 Kč.',
'{dti, dluh, příjem, roční}'),

('hypoteeka', 'objection_handling', 'Klient říká že je to drahé',
'Když klient říká že je hypotéka drahá, porovnej s nájmem. Při nájmu platí cizí hypotéku. Při vlastní hypotéce si buduje majetek. Po splacení má nemovitost, po nájmu nemá nic. Navíc nemovitosti dlouhodobě rostou na hodnotě.',
'{drahé, nájem, porovnání, investice}'),

('hypoteeka', 'objection_handling', 'Klient se bojí úrokového rizika',
'Při obavě z růstu sazeb doporuč delší fixaci (5-10 let). Vysvětli že aktuální sazby jsou historicky stále příznivé. Při fixaci je sazba garantovaná po celou dobu fixace. Po skončení fixace lze refinancovat.',
'{úrok, riziko, fixace, sazba, strach}'),

('hypoteeka', 'cnb_rules', 'Výjimka LTV pro mladé',
'Žadatelé do 36 let mohou získat hypotéku s LTV až 90 % (místo standardních 80 %). Podmínka: alespoň jeden ze žadatelů musí být mladší 36 let v den podání žádosti. Platí pro hypotéky na vlastní bydlení.',
'{mladí, 36 let, ltv, výjimka, 90}'),

('hypoteeka', 'bank_process', 'Jak dlouho trvá schválení hypotéky',
'Standardní doba schválení hypotéky je 2-4 týdny od podání kompletní žádosti. Některé banky nabízejí expresní schválení do 5 pracovních dnů. Předschválení (prescoring) lze získat do 24 hodin.',
'{schválení, doba, jak dlouho, proces, prescoring}');
