/**
 * Viditelnost webu pro vyhledávače.
 *
 * Projekt je v dev módu (viz CLAUDE.md, bod 1) a NESMÍ být indexovatelný:
 * běží na veřejné doméně a obsahuje tvrzení, která zatím neobstojí
 * (sazby bank v /nabidky, neaktuální limity ČNB).
 *
 * Default je "neveřejný". Indexování se zapne až vědomým nastavením
 * SITE_INDEXABLE=true v prostředí — tedy ve chvíli, kdy projekt jde ostře
 * a body 2 a 3 z CLAUDE.md jsou vyřešené.
 *
 * Tohle NENAHRAZUJE Password Protection na Vercelu. robots/noindex řeší
 * jen vyhledávače, ne přístup k webu.
 */
export const IS_INDEXABLE = process.env.SITE_INDEXABLE === 'true';
