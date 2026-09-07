/**
 * Postgres schéma s tabulkami hypoteeky ve sdílené PTF reality DB.
 *
 * Všechny tabulky hypoteeky žijí v odděleném schématu "hypoteeka"
 * (viz db/ptf-setup/), aby se nesrazily s tabulkami PTF v public schématu.
 * Samostatný modul bez závislostí — bezpečný pro server i browser bundle.
 */
export const HYPOTEEKA_DB_SCHEMA = 'hypoteeka';
