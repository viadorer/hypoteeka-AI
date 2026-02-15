import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { toolDefinitions } from '@/lib/ai-tools';
import type { ClientProfile } from '@/lib/agent/client-profile';
import { createInitialState, determinePhase, detectPersona } from '@/lib/agent/conversation-state';
import type { ConversationState } from '@/lib/agent/conversation-state';
import { calculateLeadScore } from '@/lib/agent/lead-scoring';
import { buildAgentPrompt } from '@/lib/agent/prompt-builder';
import { getDefaultTenantId, getTenantConfig, getTenantApiKey } from '@/lib/tenant/config';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPart = Record<string, any>;

// CORS headers for cross-origin widget embedding
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Widget-Key',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    // Validate widget API key
    const widgetKey = req.headers.get('X-Widget-Key');
    if (!widgetKey) {
      return new Response(JSON.stringify({ error: 'Missing X-Widget-Key header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: Validate widgetKey against tenant widget keys in DB

    const body = await req.json();
    const { messages = [], sessionId = uuidv4(), config = {} } = body;

    const tenantId = config.tenantId || getDefaultTenantId();
    const tenantConfig = getTenantConfig(tenantId);
    const apiKey = getTenantApiKey(tenantId);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing AI API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const google = createGoogleGenerativeAI({ apiKey });

    // Build profile from message history (reconstruct from tool calls)
    const profile: ClientProfile = { firstMessageAt: new Date().toISOString(), messageCount: 0 };
    const widgetsShown: string[] = [];

    for (const msg of (Array.isArray(messages) ? messages : [])) {
      if (!msg.parts || !Array.isArray(msg.parts)) continue;
      for (const part of msg.parts) {
        let toolName: string | null = null;
        if (part.type === 'dynamic-tool') toolName = part.toolName;
        else if (typeof part.type === 'string' && part.type.startsWith('tool-')) toolName = part.type.replace(/^tool-/, '');
        if (toolName && !widgetsShown.includes(toolName)) widgetsShown.push(toolName);
        if (toolName === 'update_profile' && part.state === 'output-available' && part.input) {
          Object.assign(profile, Object.fromEntries(
            Object.entries(part.input as Record<string, unknown>).filter(([, v]) => v !== undefined)
          ));
        }
      }
    }

    // Parse ADDRESS_DATA from user messages
    for (const msg of (Array.isArray(messages) ? messages : [])) {
      if (msg.role !== 'user') continue;
      const text = msg.parts?.filter((p: AnyPart) => p.type === 'text').map((p: AnyPart) => p.text).join('') ?? (typeof msg.content === 'string' ? msg.content : '');
      const addrMatch = text.match(/\[ADDRESS_DATA:(.*?)\]/);
      if (addrMatch) {
        try {
          const addr = JSON.parse(addrMatch[1]);
          if (addr.address) profile.propertyAddress = addr.address;
          if (addr.lat) profile.propertyLat = addr.lat;
          if (addr.lng) profile.propertyLng = addr.lng;
          if (addr.city) profile.location = addr.city;
          if (addr.street) (profile as Record<string, unknown>)._addrStreet = addr.street;
          if (addr.streetNumber) (profile as Record<string, unknown>)._addrStreetNumber = addr.streetNumber;
          if (addr.district) (profile as Record<string, unknown>)._addrDistrict = addr.district;
          if (addr.region) (profile as Record<string, unknown>)._addrRegion = addr.region;
          if (addr.postalCode) (profile as Record<string, unknown>)._addrPostalCode = addr.postalCode;
        } catch { /* ignore */ }
      }
    }

    profile.lastMessageAt = new Date().toISOString();
    profile.messageCount = messages.filter((m: { role: string }) => m.role === 'user').length;

    // Build conversation state
    const collectedFields = Object.entries(profile)
      .filter(([k, v]) => v !== undefined && k !== 'firstMessageAt' && k !== 'lastMessageAt' && k !== 'messageCount')
      .map(([k]) => k);

    const state: ConversationState = {
      ...createInitialState(),
      dataCollected: collectedFields,
      widgetsShown,
      turnCount: profile.messageCount ?? 0,
    };
    state.phase = determinePhase(state, collectedFields);
    state.persona = detectPersona(profile);

    const leadScore = calculateLeadScore(profile, state);
    state.leadScore = leadScore.score;
    state.leadQualified = leadScore.qualified;

    // Get last user message for knowledge base context
    const msgArray = Array.isArray(messages) ? messages : [];
    const lastUserMessage = [...msgArray].reverse().find((m: { role: string }) => m.role === 'user')?.content as string | undefined;

    const systemPrompt = await buildAgentPrompt(
      profile, state, leadScore, tenantId, lastUserMessage,
    );

    const modelMessages = await convertToModelMessages(messages, {
      tools: toolDefinitions,
    });

    const result = streamText({
      model: google(tenantConfig.aiConfig.model),
      system: systemPrompt,
      messages: modelMessages,
      tools: toolDefinitions,
      stopWhen: stepCountIs(tenantConfig.aiConfig.maxSteps),
      onError: (err) => {
        console.error('[Widget Chat] Error:', err);
      },
    });

    const response = result.toUIMessageStreamResponse();

    // Add CORS headers to streaming response
    const originalHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => originalHeaders.set(k, v));

    return new Response(response.body, {
      status: response.status,
      headers: originalHeaders,
    });
  } catch (error) {
    console.error('[Widget Chat] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
