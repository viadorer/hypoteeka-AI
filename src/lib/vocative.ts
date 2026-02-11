/**
 * Vokativ (5. pád) českých křestních jmen.
 * Server-side: parsuje mapu z DB promptu personalization_vocative.
 * Client-side: jednoduchý lookup z předparsované mapy.
 */

import { getPromptTemplates } from './agent/prompt-service';

let vocativeCache: Record<string, string> | null = null;

/**
 * Parsuje vokativní mapu z DB promptu personalization_vocative.
 * Formát v promptu: "Adam -> Adame, Alan -> Alane, ..."
 */
export async function loadVocativeMap(tenantId = 'hypoteeka'): Promise<Record<string, string>> {
  if (vocativeCache) return vocativeCache;

  const templates = await getPromptTemplates(tenantId);
  const vocTemplate = templates.find(t => t.slug === 'personalization_vocative');
  if (!vocTemplate) return {};

  const map: Record<string, string> = {};
  const content = vocTemplate.content;
  // Match all "Name -> Vocative" pairs
  const regex = /(\p{L}+)\s*->\s*(\p{L}+)/gu;
  let match;
  while ((match = regex.exec(content)) !== null) {
    map[match[1]] = match[2];
  }

  vocativeCache = map;
  return map;
}

/**
 * Server-side: převede jméno na vokativ z DB mapy.
 */
export async function getVocative(name: string, tenantId = 'hypoteeka'): Promise<string> {
  const trimmed = name.trim();
  const map = await loadVocativeMap(tenantId);
  return map[trimmed] ?? trimmed;
}

/**
 * Client-side: synchronní lookup z předparsované mapy (předané z API).
 */
export function toVocativeSync(name: string, map: Record<string, string>): string {
  const trimmed = name.trim();
  return map[trimmed] ?? trimmed;
}
