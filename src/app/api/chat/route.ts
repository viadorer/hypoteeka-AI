import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { toolDefinitions } from '@/lib/ai-tools';
import type { ClientProfile } from '@/lib/agent/client-profile';
import { createInitialState, determinePhase, detectPersona } from '@/lib/agent/conversation-state';
import type { ConversationState } from '@/lib/agent/conversation-state';
import { calculateLeadScore } from '@/lib/agent/lead-scoring';
import { buildAgentPrompt } from '@/lib/agent/prompt-builder';
import type { CtaIntensity } from '@/lib/agent/prompt-builder';
import { storage } from '@/lib/storage';
import { getTenantConfig, getTenantApiKey, getDefaultTenantId } from '@/lib/tenant/config';
import { submitLeadToRealvisor, buildRealvisorPayload } from '@/lib/realvisor';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPart = Record<string, any>;

function reconstructProfileFromMessages(messages: Array<{ role: string; parts?: AnyPart[] }>): ClientProfile {
  const profile: ClientProfile = {};
  if (!Array.isArray(messages)) return profile;
  for (const msg of messages) {
    if (!msg.parts || !Array.isArray(msg.parts)) continue;
    for (const part of msg.parts) {
      // Determine tool name from part
      let toolName: string | null = null;
      if (part.type === 'dynamic-tool') {
        toolName = part.toolName;
      } else if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
        toolName = part.type.replace(/^tool-/, '');
      }
      if (!toolName || part.state !== 'output-available' || !part.input) continue;
      const input = part.input as Record<string, unknown>;

      // update_profile: direct merge
      if (toolName === 'update_profile') {
        Object.assign(profile, Object.fromEntries(
          Object.entries(input).filter(([, v]) => v !== undefined)
        ));
      }

      // Auto-extract from show_ widgets (safety net)
      if (toolName === 'show_property' || toolName === 'show_payment' || toolName === 'show_eligibility') {
        if (input.propertyPrice !== undefined) profile.propertyPrice = input.propertyPrice as number;
        if (input.propertyType !== undefined) profile.propertyType = input.propertyType as ClientProfile['propertyType'];
        if (input.location !== undefined) profile.location = input.location as string;
        if (input.equity !== undefined) profile.equity = input.equity as number;
        if (input.monthlyIncome !== undefined) profile.monthlyIncome = input.monthlyIncome as number;
        if (input.isYoung !== undefined) profile.isYoung = input.isYoung as boolean;
      }
      if (toolName === 'show_investment') {
        if (input.propertyPrice !== undefined) profile.propertyPrice = input.propertyPrice as number;
        if (input.expectedRentalIncome !== undefined) profile.expectedRentalIncome = input.expectedRentalIncome as number;
        if (!profile.purpose) profile.purpose = 'investice';
      }
      if (toolName === 'show_rent_vs_buy') {
        if (input.propertyPrice !== undefined) profile.propertyPrice = input.propertyPrice as number;
        if (input.currentRent !== undefined) profile.currentRent = input.currentRent as number;
      }
      if (toolName === 'show_refinance') {
        if (input.currentBalance !== undefined) profile.existingMortgageBalance = input.currentBalance as number;
        if (input.currentRate !== undefined) profile.existingMortgageRate = input.currentRate as number;
        if (!profile.purpose) profile.purpose = 'refinancovani';
      }
      if (toolName === 'send_email_summary' && input.email !== undefined) {
        profile.email = input.email as string;
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
  if (!Array.isArray(messages)) return widgets;
  for (const msg of messages) {
    if (!msg.parts || !Array.isArray(msg.parts)) continue;
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
    const tenantId: string = body.tenantId ?? getDefaultTenantId();
    const ctaIntensity: CtaIntensity | undefined = body.ctaIntensity;

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

    // Reconstruct profile from message history (only adds fields found in message parts)
    const reconstructed = reconstructProfileFromMessages(messages);
    // Only merge defined fields from reconstructed (don't overwrite existing with undefined)
    for (const [key, value] of Object.entries(reconstructed)) {
      if (value !== undefined) {
        (profile as Record<string, unknown>)[key] = value;
      }
    }
    console.log(`[Profile] After merge: equity=${profile.equity}, price=${profile.propertyPrice}, purpose=${profile.purpose}, income=${profile.monthlyIncome}, email=${profile.email}`);
    profile.lastMessageAt = new Date().toISOString();
    profile.messageCount = messages.filter((m: { role: string }) => m.role === 'user').length;

    // Update conversation state
    const collectedFields = getCollectedFields(profile);
    state.dataCollected = collectedFields;
    state.widgetsShown = getShownWidgets(messages);
    state.turnCount = profile.messageCount ?? 0;
    state.phase = determinePhase(state, collectedFields);
    state.persona = detectPersona(profile);

    // Calculate lead score
    const leadScore = calculateLeadScore(profile, state);
    state.leadScore = leadScore.score;
    state.leadQualified = leadScore.qualified;

    // Extract last user message for knowledge base matching
    const msgArray = Array.isArray(messages) ? messages : [];
    const lastUserMessage = [...msgArray].reverse().find((m: { role: string }) => m.role === 'user')?.content as string | undefined;

    // Build dynamic prompt (async - fetches live rates from ČNB API + knowledge base)
    const systemPrompt = await buildAgentPrompt(profile, state, leadScore, tenantId, lastUserMessage, ctaIntensity);

    console.log(`[Agent] Tenant: ${tenantId}, Session: ${sessionId}, Phase: ${state.phase}, Score: ${leadScore.score}/${leadScore.temperature}, Fields: ${collectedFields.join(',')}`);

    // Save session before streaming (captures current state + full UI messages for restore)
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
      uiMessages: messages, // Complete UI messages for conversation restore
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
            const toolName = typeof tr.toolName === 'string' ? tr.toolName : '';
            const input = ('input' in tr && tr.input && typeof tr.input === 'object')
              ? tr.input as Record<string, unknown>
              : {};

            // Track shown widgets
            if (toolName.startsWith('show_')) {
              if (!state.widgetsShown.includes(toolName)) {
                state.widgetsShown.push(toolName);
              }
              // Save widget event to DB
              storage.saveWidgetEvent({
                tenantId,
                sessionId,
                widgetType: toolName.replace('show_', ''),
                inputData: input,
              }).catch(err => console.error('[Storage] Widget event save error:', err));
            }

            if (toolName === 'show_lead_capture') {
              state.leadCaptured = true;
            }

            // Save property record when property-related widgets are shown
            if (toolName === 'show_property' || toolName === 'show_payment' || toolName === 'show_eligibility') {
              storage.saveProperty({
                tenantId,
                sessionId,
                price: input.propertyPrice as number | undefined,
                propertyType: input.propertyType as string | undefined,
                location: input.location as string | undefined,
                equity: input.equity as number | undefined,
                interestRate: input.rate as number | undefined,
                fixationYears: input.years as number | undefined,
              }).catch(err => console.error('[Storage] Property save error:', err));

              // SAFETY NET: auto-extract data from widget inputs into profile
              // Even if agent doesn't call update_profile, we capture the data
              const widgetProfileData: Record<string, unknown> = {};
              if (input.propertyPrice !== undefined) widgetProfileData.propertyPrice = input.propertyPrice;
              if (input.propertyType !== undefined) widgetProfileData.propertyType = input.propertyType;
              if (input.location !== undefined) widgetProfileData.location = input.location;
              if (input.equity !== undefined) widgetProfileData.equity = input.equity;
              if (input.monthlyIncome !== undefined) widgetProfileData.monthlyIncome = input.monthlyIncome;
              if (input.isYoung !== undefined) widgetProfileData.isYoung = input.isYoung;
              if (Object.keys(widgetProfileData).length > 0) {
                Object.assign(profile, widgetProfileData);
                console.log(`[Profile] Auto-captured from ${toolName}: ${Object.keys(widgetProfileData).join(', ')}`);
              }
            }

            // Auto-capture from other show_ widgets
            if (toolName === 'show_rent_vs_buy' && input.currentRent !== undefined) {
              profile.currentRent = input.currentRent as number;
              if (input.propertyPrice !== undefined) profile.propertyPrice = input.propertyPrice as number;
              console.log(`[Profile] Auto-captured from show_rent_vs_buy: currentRent`);
            }
            if (toolName === 'show_investment') {
              if (input.propertyPrice !== undefined) profile.propertyPrice = input.propertyPrice as number;
              if (input.expectedRentalIncome !== undefined) profile.expectedRentalIncome = input.expectedRentalIncome as number;
              if (!profile.purpose) profile.purpose = 'investice';
              console.log(`[Profile] Auto-captured from show_investment: purpose=investice`);
            }
            if (toolName === 'show_refinance') {
              if (input.currentBalance !== undefined) profile.existingMortgageBalance = input.currentBalance as number;
              if (input.currentRate !== undefined) profile.existingMortgageRate = input.currentRate as number;
              if (!profile.purpose) profile.purpose = 'refinancovani';
              console.log(`[Profile] Auto-captured from show_refinance: purpose=refinancovani`);
            }
            if (toolName === 'send_email_summary' && input.email !== undefined) {
              if (!profile.email) {
                profile.email = input.email as string;
                console.log(`[Profile] Auto-captured email from send_email_summary`);
              }
            }

            // After any show_ widget, refresh dataCollected + phase from auto-captured data
            if (toolName.startsWith('show_') || toolName === 'send_email_summary') {
              const fields = getCollectedFields(profile);
              state.dataCollected = fields;
              state.phase = determinePhase(state, fields);
            }

            // Update profile from update_profile tool
            if (toolName === 'update_profile' && Object.keys(input).length > 0) {
              const hadEmail = !!profile.email;
              const hadPhone = !!profile.phone;
              Object.assign(profile, Object.fromEntries(
                Object.entries(input).filter(([, v]) => v !== undefined)
              ));
              const fields = getCollectedFields(profile);
              state.dataCollected = fields;
              state.phase = determinePhase(state, fields);

              // Auto-submit lead to Realvisor + save to our DB when we get new contact info
              const gotNewContact = (!hadEmail && profile.email) || (!hadPhone && profile.phone);
              if (gotNewContact && (profile.email || profile.phone)) {
                const leadName = profile.name ?? 'Neznamy';
                const leadTemp = state.leadQualified ? 'qualified' : (state.leadScore >= 40 ? 'hot' : (state.leadScore >= 20 ? 'warm' : 'cold'));
                const rvPayload = buildRealvisorPayload(
                  leadName,
                  profile.email ?? '',
                  profile.phone ?? '',
                  `Auto-lead z chatu (${state.phase})`,
                  profile as Record<string, unknown>,
                  { sessionId, tenantId, leadScore: state.leadScore, leadTemperature: leadTemp }
                );
                submitLeadToRealvisor(rvPayload)
                  .then(rv => {
                    console.log(`[Lead] Auto-submitted to Realvisor: ${rv.success ? rv.leadId : 'failed'}`);
                    // Save lead to our DB
                    storage.saveLead({
                      id: uuidv4(),
                      tenantId,
                      sessionId,
                      name: leadName,
                      email: profile.email ?? '',
                      phone: profile.phone ?? '',
                      context: `Auto-lead z chatu (${state.phase})`,
                      profile,
                      leadScore: state.leadScore ?? 0,
                      leadTemperature: leadTemp,
                      realvisorLeadId: rv.leadId,
                      realvisorContactId: rv.contactId,
                      createdAt: new Date().toISOString(),
                    }).catch(err => console.error('[Lead] DB save error:', err));
                  })
                  .catch(err => console.error('[Lead] Auto-submit error:', err));
              }
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
    const stack = error instanceof Error ? error.stack : '';
    console.error('Chat API error:', message);
    console.error('Chat API stack:', stack);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
