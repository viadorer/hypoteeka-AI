# Napojení hypoteeka.cz na systém PTF reality

Hypoteeka běží jako **tenant PTF reality**: sdílí Supabase projekt PTF
(databáze + auth), vlastní tabulky si nese v odděleném Postgres schématu
`hypoteeka` a leady předává do PTF CRM přes backend API. **Struktura PTF se
nijak nemění** — žádné altery, žádné nové tabulky v `public`, žádné triggery
na sdílených objektech.

## Architektura

```
hypoteeka.cz (Vercel, tento repozitář)
 ├── Supabase PTF projektu
 │    ├── schéma public     → PTF reality (NEDOTČENO; jen řádek v tenants/offices)
 │    ├── schéma hypoteeka  → sessions, messages, prompty, KB, consent log, …
 │    └── auth              → sdílená identita (Supabase Auth PTF projektu)
 └── PTF backend (Railway)  → POST /api/leads  (X-Tenant-Slug: hypoteeka)
                              spouští PTF workflow: welcome email, auto-assign, demand
```

Leady vznikají v hypoteece dvěma cestami (`/api/leads` formulář, auto-lead
z chatu) a obě po lokálním uložení volají `submitLeadToPtf()`
([src/lib/integrations/ptf-leads.ts](../../src/lib/integrations/ptf-leads.ts)).
Záměrně přes API, ne přímým insertem — přímý zápis do `public.leads` by obešel
PTF workflow engine.

## Postup nasazení

### 1. SQL v Supabase PTF projektu (SQL editor, v tomto pořadí)

1. **`01_tenant_hypoteeka.sql`** — založí tenanta `hypoteeka` + pobočku.
   Idempotentní. Před spuštěním doplň IČO QUADRUM s.r.o. (TODO v souboru).
2. **`02_hypoteeka_schema.sql`** — celé schéma hypoteeky (generováno ze
   `supabase/migrations/`, needitovat ručně). Spustit **celý soubor najednou**
   (spoléhá na `set search_path`).

### 2. Nastavení Supabase dashboardu PTF projektu (jednorázově)

- **Settings → Data API → Exposed schemas**: přidat `hypoteeka`.
  Bez toho supabase-js klient schéma nevidí (`db: { schema: 'hypoteeka' }`).
- **Authentication → URL Configuration → Redirect URLs**: přidat
  `https://hypoteeka.cz/**` a `https://www.hypoteeka.cz/**`
  (auth callback, reset hesla).

### 3. Vercel environment variables (projekt hypoteeka)

| Proměnná | Hodnota |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase projektu PTF |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key PTF projektu |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key PTF projektu |
| `PTF_API_URL` | `https://ptf-production.up.railway.app` |
| `PTF_TENANT_SLUG` | `ptf-reality` (leady musí padat pod tenanta, kterého vidí PTF admin) |
| `NEXT_PUBLIC_TENANT_ID` | `hypoteeka` (beze změny) |
| + stávající | `GOOGLE_GENERATIVE_AI_API_KEY`, `BREVO_API_KEY`, `CNB_ARAD_API_KEY`, Realvisor |

Produkce bez Supabase proměnných **tvrdě selže** při prvním použití storage
(žádný tichý JSON fallback — na serverless by znamenal ztracené leady).

### 4. PTF strana — nic

Backend na Railway se nemění ani neredeployuje; tenanta pozná z hlavičky
`X-Tenant-Slug`. CORS se řešit nemusí — předání leadu jde ze serveru na
server (API routa na Vercelu → Railway), CORS je browserová ochrana.

**Viditelnost leadů v adminu:** PTF admin filtruje případy přes
`leads.tenant_id = admin_users.tenant_id` a nemá přepínač tenantů, proto
leady posíláme pod tenantem `ptf-reality` a rozlišujeme je přes
`metadata.origin = 'hypoteeka'` (admin na to má filtr, stejně jako
u `mamtip` / `webnabidky`). Tenant `hypoteeka` v tabulce `tenants`
existuje, ale pro leady se nepoužívá.

## Co bylo při generování schématu záměrně vynecháno

1. **Trigger `on_auth_user_created` na `auth.users`** — auth je sdílená s PTF,
   trigger by se pouštěl pro signupy všech tenantů. Profil zakládá aplikace
   v [signup route](../../src/app/api/auth/signup/route.ts).
2. **Seed `bank_spreads`** (migrace 003) — dopočítané sazby konkrétních bank
   bez zdroje (CLAUDE.md bod 3.1, riziko klamavé obchodní praktiky). Tabulka
   existuje prázdná; stránka srovnání bank tedy nemá co zobrazit, což je
   v souladu s pokynem `/nabidky` odpojit.
3. **`supabase/seed_full.sql`** se nepoužívá (stejný problém + duplicitní
   seedy). Seedy promptů, knowledge base a ČNB limitů jsou součástí migrací
   a aplikují se normálně.

## Bezpečnostní model

- Schéma `hypoteeka`: `service_role` plný přístup (serverový klient),
  `authenticated` jen přes RLS (dashboard, admin — role v `profiles.role`),
  `anon` nemá žádný grant. RLS je zapnuté na všech tabulkách schématu
  (závěrečný blok `02_hypoteeka_schema.sql`).
- Service role key smí existovat jen na serveru (Vercel env), nikdy
  v `NEXT_PUBLIC_*`.
- GDPR: souhlas s předáním (`handoff_partner`) se loguje do
  `hypoteeka.consent_log` před odesláním leadu; text souhlasu musí zmiňovat
  předání v rámci PTF/QUADRUM.

## Omezení

- PTF endpoint `/api/leads` vyžaduje e-mail — lead jen s telefonem se do PTF
  nepředá (zůstává v `hypoteeka.leads` a v Realvisoru, zaloguje se warn).
- PTF endpoint má rate limit 3 požadavky / 10 min / IP — při běžném objemu
  leadů nevadí, hromadný import přes něj nedělat.
- Data ze starého (pauznutého) Supabase projektu hypoteeky tímto **nejsou**
  zachráněna — po obnovení projektu je lze importovat do schématu `hypoteeka`
  (`pg_dump --schema=public` + přepsání `public.` → `hypoteeka.`).

## Regenerace schématu

Při změně `supabase/migrations/` přegenerovat:

```bash
python3 db/ptf-setup/generate.py
```

(transformace: `public.` → `hypoteeka.`, vynechání auth triggeru
a bank_spreads seedu, RLS + granty v patičce)
