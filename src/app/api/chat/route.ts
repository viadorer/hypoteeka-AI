import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { toolDefinitions } from '@/lib/ai-tools';
import type { ClientProfile } from '@/lib/agent/client-profile';
import { createInitialState, determinePhase } from '@/lib/agent/conversation-state';
import type { ConversationState } from '@/lib/agent/conversation-state';
import { calculateLeadScore } from '@/lib/agent/lead-scoring';
import { buildAgentPrompt } from '@/lib/agent/prompt-builder';
import { storage } from '@/lib/storage';
import { getTenantConfig, getTenantApiKey } from '@/lib/tenant/config';

export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPart = Record<string, any>;

function reconstructProfileFromMessages(messages: Array<{ role: string; parts?: AnyPart[] }>): ClientProfile {
  const profile: ClientProfile = {};
  for (const msg of messages) {
    if (!msg.parts) continue;
    for (const part of msg.parts) {
      // AI SDK v6: tool parts are 'tool-update_profile' or 'dynamic-tool' with toolName
      const isUpdateProfile =
        part.type === 'tool-update_profile' ||
        (part.type === 'dynamic-tool' && part.toolName === 'update_profile');
      if (isUpdateProfile && part.state === 'output-available' && part.input) {
        Object.assign(profile, Object.fromEntries(
          Object.entries(part.input as Record<string, unknown>).filter(([, v]) => v !== undefined)
        ));
      }
    }
  }
  return profile;
}

function getCollectedFields(profile: ClientProfile): string[] {
  return Object.entries(profile)
    .filter(([k, v]) => v !== undefined && k !== 'firstMessageAt' && k !== 'lastMessageAt' && k !== 'messageCount')
    .map(([k]) => k);
}

function getShownWidgets(messages: Array<{ role: string; parts?: AnyPart[] }>): string[] {
  const widgets: string[] = [];
  for (const msg of messages) {
    if (!msg.parts) continue;
    for (const part of msg.parts) {
      // AI SDK v6: tool parts are 'tool-show_payment' etc or 'dynamic-tool'
      let toolName: string | null = null;
      if (part.type === 'dynamic-tool') {
        toolName = part.toolName;
      } else if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
        toolName = part.type.replace(/^tool-/, '');
      }
      if (toolName && toolName.startsWith('show_') && !widgets.includes(toolName)) {
        widgets.push(toolName);
      }
    }
  }
  return widgets;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;
    const sessionId: string = body.sessionId ?? 'default';
    const tenantId: string = body.tenantId ?? 'hypoteeka';

    const tenantConfig = getTenantConfig(tenantId);
    const apiKey = getTenantApiKey(tenantId);

    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return new Response(
        JSON.stringify({ error: `Missing API key for tenant '${tenantId}'. Set ${tenantConfig.aiConfig.apiKeyEnv} in .env.local` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load or create session
    const existing = await storage.getSession(sessionId);
    const profile: ClientProfile = existing?.profile ?? { firstMessageAt: new Date().toISOString(), messageCount: 0 };
    const state: ConversationState = existing?.state ?? createInitialState();

    // Reconstruct profile from message history
    const reconstructed = reconstructProfileFromMessages(messages);
    Object.assign(profile, reconstructed);
    profile.lastMessageAt = new Date().toISOString();
    profile.messageCount = messages.filter((m: { role: string }) => m.role === 'user').length;

    // Update conversation state
    const collectedFields = getCollectedFields(profile);
    state.dataCollected = collectedFields;
    state.widgetsShown = getShownWidgets(messages);
    state.turnCount = profile.messageCount ?? 0;
    state.phase = determinePhase(state, collectedFields);

    // Calculate lead score
    const leadScore = calculateLeadScore(profile, state);
    state.leadScore = leadScore.score;
    state.leadQualified = leadScore.qualified;

    // Build dynamic prompt (async - fetches live rates from ČNB API)
    const systemPrompt = await buildAgentPrompt(profile, state, leadScore);

    console.log(`[Agent] Tenant: ${tenantId}, Session: ${sessionId}, Phase: ${state.phase}, Score: ${leadScore.score}/${leadScore.temperature}, Fields: ${collectedFields.join(',')}`);

    // Save session before streaming (captures current state)
    await storage.saveSession({
      id: sessionId,
      tenantId,
      profile,
      state,
      messages: messages.map((m: { role: string; parts?: AnyPart[] }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.parts?.filter((p: AnyPart) => p.type === 'text').map((p: AnyPart) => p.text).join('') ?? '',
        timestamp: new Date().toISOString(),
      })),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const modelMessages = await convertToModelMessages(messages, {
      tools: toolDefinitions,
    });

    const result = streamText({
      model: createGoogleGenerativeAI({ apiKey })(tenantConfig.aiConfig.model),
      system: systemPrompt,
      messages: modelMessages,
      tools: toolDefinitions,
      stopWhen: stepCountIs(tenantConfig.aiConfig.maxSteps),
      onStepFinish: ({ toolResults }) => {
        if (toolResults) {
          for (const tr of toolResults) {
            if (typeof tr.toolName === 'string' && tr.toolName.startsWith('show_')) {
              if (!state.widgetsShown.includes(tr.toolName)) {
                state.widgetsShown.push(tr.toolName);
              }
            }
            if (tr.toolName === 'show_lead_capture') {
              state.leadCaptured = true;
            }
            if (tr.toolName === 'update_profile' && 'input' in tr && tr.input && typeof tr.input === 'object') {
              const input = tr.input as Record<string, unknown>;
              Object.assign(profile, Object.fromEntries(
                Object.entries(input).filter(([, v]) => v !== undefined)
              ));
              const fields = getCollectedFields(profile);
              state.dataCollected = fields;
              state.phase = determinePhase(state, fields);
            }
          }
        }
        // Persist after each step
        storage.saveSession({
          id: sessionId,
          tenantId,
          profile,
          state,
          messages: [],
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch(err => console.error('[Storage] Save error:', err));
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Neznama chyba';
    console.error('Chat API error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
