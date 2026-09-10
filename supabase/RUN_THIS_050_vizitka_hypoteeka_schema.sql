-- ============================================================================
-- Migrace 050 (ověřená čísla ve vizitce poradce) — pro schéma "hypoteeka"
-- ============================================================================
-- Vygenerováno přes db/ptf-setup/generate.py (přepis public. -> hypoteeka.).
-- Spustit v SQL editoru projektu ptf-reality (ref kkbkqeuytktnsodzoggl).
-- Idempotentní: prostý UPDATE, lze spustit opakovaně.
-- ============================================================================


-- ============================================================================
-- MIGRACE: 050_broker_bio_verified.sql
-- ============================================================================
set search_path to hypoteeka;

-- ============================================================
-- 050: Ověřená čísla ve vizitce poradce
-- ============================================================
-- Popis Davida v DB (short_description) pochází z původního seedu 042
-- a tvrdil „nabídky 8+ bank" — číslo, které nikdo nedoložil (CLAUDE.md
-- bod 8). Majitel potvrdil skutečné hodnoty: 26 let praxe v oboru,
-- 11 bank a řada dalších institucí. Tenhle text jede na dvou místech,
-- která klient reálně vidí: vizitka specialisty v chatu (show_specialists)
-- a stránka /poradce.
--
-- POZOR: nespouštět tento soubor přímo — obsahuje "hypoteeka." prefixy,
-- které patří do schématu "hypoteeka". Pusť vygenerovanou podobu z
-- db/ptf-setup/02_hypoteeka_schema.sql (viz generate.py).
-- ============================================================

UPDATE hypoteeka.brokers
SET short_description =
      'Vázaný zástupce SAB servis pro spotřebitelské úvěry, 26 let praxe v oboru. '
      || 'Porovnám nabídky 11 bank a dalších institucí a vyjednám podmínky, které běžně nedostanete. '
      || 'Konzultace je zdarma — odměnu hradí banka.',
    bio =
      'Hypoteční specialista s 26 lety praxe. Řeší prvokupující, mladé rodiny, OSVČ, '
      || 'investice i refinancování. Spolupracuje s 11 bankami a dalšími institucemi.',
    updated_at = now()
WHERE slug = 'david-choc';

