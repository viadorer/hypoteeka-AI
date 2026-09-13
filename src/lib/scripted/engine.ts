/**
 * Skriptované kroky konverzace — odpověď bez LLM, zapsaná do historie
 * ve stejném tvaru, v jakém ji zapisuje AI.
 *
 * Klik na připravenou volbu pošle text se značkou `[STEP:pole=hodnota]`.
 * Server značku ověří proti definici kroků, zapíše volbu do profilu a odpoví
 * streamem: volání nástroje profilu, pak text další otázky. Navazující AI
 * volbu vidí v historii i v profilu, jako by ji zjistila sama.
 *
 * Modul nezná personu ani nástroje konkrétního asistenta — název nástroje
 * profilu a jeho výstup dostává zvenku.
 */

import { createUIMessageStream, createUIMessageStreamResponse, generateId } from 'ai';

export interface ScriptOption {
  label: string;
  value: string;
  /** Odpověď po výběru — typicky další otázka scénáře. */
  reply: string;
}

export interface ScriptStep {
  /** Pole profilu, které krok zapisuje. */
  field: string;
  options: ScriptOption[];
}

export interface ResolvedStep {
  step: ScriptStep;
  option: ScriptOption;
}

const MARKER = /\s*\[STEP:([A-Za-z]+)=([A-Za-z0-9_]+)\]/;
const MARKER_ALL = /\s*\[STEP:[A-Za-z]+=[A-Za-z0-9_]+\]/g;

export function buildStepMessage(step: ScriptStep, option: ScriptOption): string {
  return `${option.label} [STEP:${step.field}=${option.value}]`;
}

/** Značka je pro server — klient ani model ji nemají vidět. */
export function stripStepMarkers(text: string): string {
  return text.replace(MARKER_ALL, '');
}

/**
 * Najde krok podle značky. Značku může klient napsat i ručně, proto platí
 * jen pole a hodnota, které definice kroků zná — nic jiného do profilu nejde.
 */
export function resolveStep(text: string, steps: ScriptStep[]): ResolvedStep | null {
  const match = text.match(MARKER);
  if (!match) return null;
  const [, field, value] = match;
  const step = steps.find(s => s.field === field);
  const option = step?.options.find(o => o.value === value);
  return step && option ? { step, option } : null;
}

/** Všechny platné volby ze skriptu v pořadí, v jakém je klient udělal. */
export function collectResolvedSteps(texts: string[], steps: ScriptStep[]): ResolvedStep[] {
  return texts
    .map(text => resolveStep(text, steps))
    .filter((resolved): resolved is ResolvedStep => resolved !== null);
}

export function scriptedStepResponse({
  resolved,
  profileToolName,
  toolOutput,
}: {
  resolved: ResolvedStep;
  profileToolName: string;
  toolOutput: unknown;
}): Response {
  const { step, option } = resolved;
  const toolCallId = `script-${step.field}-${generateId()}`;
  const textId = generateId();

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'start' });

      // Pořadí jako u AI: krok s voláním nástroje, pak krok s textem.
      // convertToModelMessages z toho sestaví volání, výsledek a odpověď —
      // tvar, který model zná z vlastních tahů.
      writer.write({ type: 'start-step' });
      writer.write({
        type: 'tool-input-available',
        toolCallId,
        toolName: profileToolName,
        input: { [step.field]: option.value },
      });
      writer.write({ type: 'tool-output-available', toolCallId, output: toolOutput });
      writer.write({ type: 'finish-step' });

      writer.write({ type: 'start-step' });
      writer.write({ type: 'text-start', id: textId });
      writer.write({ type: 'text-delta', id: textId, delta: option.reply });
      writer.write({ type: 'text-end', id: textId });
      writer.write({ type: 'finish-step' });

      writer.write({ type: 'finish' });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
