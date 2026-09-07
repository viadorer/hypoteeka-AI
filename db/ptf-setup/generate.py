#!/usr/bin/env python3
"""Vygeneruje db/ptf-setup/02_hypoteeka_schema.sql z supabase/migrations/*.sql.

Transformace:
1. public. -> hypoteeka.  (vsechny hypoteeka tabulky ziji v odedelenem schematu,
   PTF public schema zustava nedotcene)
2. Vynechan trigger on_auth_user_created na auth.users (sdilena auth vrstva PTF
   projektu - trigger by ovlivnil signupy vsech tenantu). Profil zaklada
   aplikace v signup route.
3. Vynechan seed bank_spreads z 003 (vymyslene sazby bank - CLAUDE.md 3.1).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIG = ROOT / "supabase" / "migrations"
OUT = ROOT / "db" / "ptf-setup" / "02_hypoteeka_schema.sql"

TRIGGER_RE = re.compile(
    r"create trigger on_auth_user_created\s*\n\s*after insert on auth\.users\s*\n"
    r"\s*for each row execute function public\.handle_new_user\(\);",
    re.IGNORECASE,
)
TRIGGER_NOTE = (
    "-- [ptf-setup] Trigger on_auth_user_created na auth.users VYNECHAN:\n"
    "-- auth.users je sdilena s PTF reality a trigger by se poustel pro signupy\n"
    "-- vsech tenantu. Radek v profiles zaklada aplikace (api/auth/signup)."
)

BANK_SEED_RE = re.compile(
    r"-- Seed: bank spreads\s*\nINSERT INTO bank_spreads[^;]*;",
    re.IGNORECASE,
)
BANK_SEED_NOTE = (
    "-- [ptf-setup] Seed bank_spreads VYNECHAN: dopocitane sazby konkretnich bank\n"
    "-- bez zdroje (viz CLAUDE.md bod 3.1 - klamava obchodni praktika).\n"
    "-- Tabulka existuje prazdna; realna data lze doplnit s datem a zdrojem."
)

HEADER = """-- ============================================================================
-- HYPOTEEKA schema pro sdilenou PTF reality Supabase DB
--
-- GENEROVANO z supabase/migrations/*.sql (scratchpad/gen_schema.py).
-- Needitovat rucne - pri zmene migraci pregenerovat.
--
-- Vsechny tabulky hypoteeky ziji v samostatnem Postgres schematu "hypoteeka".
-- PTF public schema se NIJAK nemeni (zadne nove tabulky, zadne altery).
--
-- SPUSTENI: cely soubor najednou v Supabase SQL editoru PTF projektu.
-- POTE NUTNE: Settings -> Data API -> Exposed schemas: pridat "hypoteeka"
--             (jinak supabase-js klient schema nevidi).
-- ============================================================================

create schema if not exists hypoteeka;

-- service_role = serverovy klient hypoteeky (obchazi RLS)
-- authenticated = prihlaseny uzivatel pres SSR klienta (dashboard, admin) - RLS
-- anon zamerne NEDOSTAVA nic: neprihlaseny REST pristup do schematu neni potreba
grant usage on schema hypoteeka to postgres, service_role, authenticated;
alter default privileges in schema hypoteeka grant all on tables    to service_role;
alter default privileges in schema hypoteeka grant all on sequences to service_role;
alter default privileges in schema hypoteeka grant all on functions to service_role;
alter default privileges in schema hypoteeka grant select, insert, update, delete on tables to authenticated;

set search_path to hypoteeka;
"""

FOOTER = """

-- ============================================================================
-- [ptf-setup] ZAVERECNE ZABEZPECENI
--
-- 1. RLS na VSECH tabulkach schematu (nektere migrace ho nezapinaly:
--    news, projects, cnb_limits, market_rates, bank_spreads).
--    Tabulka s RLS bez policy = pro anon/authenticated nedostupna;
--    service_role (serverovy klient hypoteeky) RLS obchazi.
-- 2. Granty na jiz existujici tabulky (default privileges plati jen
--    pro tabulky vytvorene az po nich).
-- ============================================================================
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'hypoteeka' loop
    execute format('alter table hypoteeka.%I enable row level security', r.tablename);
  end loop;
end $$;

grant all on all tables    in schema hypoteeka to service_role;
grant all on all sequences in schema hypoteeka to service_role;
grant all on all functions in schema hypoteeka to service_role;
grant select, insert, update, delete on all tables in schema hypoteeka to authenticated;
"""

parts = [HEADER]
files = sorted(MIG.glob("*.sql"))
assert files, "zadne migrace nenalezeny"

trigger_hits = bank_hits = 0
for f in files:
    sql = f.read_text(encoding="utf-8")

    if TRIGGER_RE.search(sql):
        sql = TRIGGER_RE.sub(TRIGGER_NOTE, sql)
        trigger_hits += 1
    if BANK_SEED_RE.search(sql):
        sql = BANK_SEED_RE.sub(BANK_SEED_NOTE, sql)
        bank_hits += 1

    sql = sql.replace("public.", "hypoteeka.").replace("PUBLIC.", "hypoteeka.")

    banner = (
        "\n\n-- ============================================================================\n"
        f"-- MIGRACE: {f.name}\n"
        "-- ============================================================================\n"
        "set search_path to hypoteeka;\n\n"
    )
    parts.append(banner + sql.strip() + "\n")

parts.append(FOOTER)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("".join(parts), encoding="utf-8")

out = OUT.read_text(encoding="utf-8")
leftover_public = [l for l in out.splitlines() if "public." in l and "search_path" not in l]
print(f"files: {len(files)}, trigger stripped: {trigger_hits}, bank seed stripped: {bank_hits}")
print(f"output: {OUT} ({len(out.splitlines())} lines)")
print("leftover 'public.':", len(leftover_public))
for l in leftover_public[:5]:
    print("  ", l.strip()[:100])
print("auth.users trigger left:", "after insert on auth.users" in out)
