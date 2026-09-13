/**
 * Skriptované kroky hypoteeka.cz — obsah, u kterého není co generovat.
 *
 * Texty odpovědí jsou pevné a jdou zkontrolovat jednou (CLAUDE.md body 3–4):
 * žádná tvrzení o bankách, limitech ČNB ani sazbách.
 */

import type { ScriptStep } from './engine';

/** Výběr záměru. Hodnoty odpovídají `ClientProfile.purpose`. */
export const PURPOSE_STEP: ScriptStep = {
  field: 'purpose',
  options: [
    {
      label: 'Vlastní bydlení',
      value: 'vlastni_bydleni',
      reply: 'Rozumím, vlastní bydlení. Kolik zhruba stojí nemovitost, kterou zvažujete?',
    },
    {
      label: 'Investiční nemovitost',
      value: 'investice',
      reply: 'Rozumím, investiční nemovitost. Kolik zhruba stojí nemovitost, kterou zvažujete?',
    },
    {
      label: 'Refinancování',
      value: 'refinancovani',
      reply: 'Rozumím, refinancování. Kolik vám zbývá doplatit na stávající hypotéce?',
    },
    {
      label: 'Refixace',
      value: 'refixace',
      reply: 'Rozumím, refixace. Kolik vám zbývá doplatit na stávající hypotéce?',
    },
    {
      label: 'Prodávám nemovitost',
      value: 'prodej',
      reply: 'Rozumím, prodej. O jakou nemovitost jde a kde leží?',
    },
  ],
};

export const HYPOTEEKA_STEPS: ScriptStep[] = [PURPOSE_STEP];
