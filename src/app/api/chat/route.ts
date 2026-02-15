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
      if (toolName && (toolName.startsWith('show_') || toolName === 'geocode_address' || toolName === 'request_valuation') && !widgets.includes(toolName)) {
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

    // Parse ADDRESS_DATA from user messages (sent by AddressSuggestWidget)
    // Store full address components in profile + keep raw for valuation submit
    let parsedAddressData: Record<string, unknown> | null = null;
    for (const msg of (Array.isArray(messages) ? messages : [])) {
      if (msg.role !== 'user') continue;
      const text = msg.parts?.filter((p: AnyPart) => p.type === 'text').map((p: AnyPart) => p.text).join('') ?? (typeof msg.content === 'string' ? msg.content : '');
      const addrMatch = text.match(/\[ADDRESS_DATA:(.*?)\]/);
      if (addrMatch) {
        try {
          const addr = JSON.parse(addrMatch[1]);
          parsedAddressData = addr;
          if (addr.address) profile.propertyAddress = addr.address;
          if (addr.lat) profile.propertyLat = addr.lat;
          if (addr.lng) profile.propertyLng = addr.lng;
          if (addr.city) profile.location = addr.city;
          // Store street/district/region/postalCode for valuation submit
          if (addr.street) (profile as Record<string, unknown>)._addrStreet = addr.street;
          if (addr.streetNumber) (profile as Record<string, unknown>)._addrStreetNumber = addr.streetNumber;
          if (addr.district) (profile as Record<string, unknown>)._addrDistrict = addr.district;
          if (addr.region) (profile as Record<string, unknown>)._addrRegion = addr.region;
          if (addr.postalCode) (profile as Record<string, unknown>)._addrPostalCode = addr.postalCode;
          console.log(`[Profile] Parsed ADDRESS_DATA: ${addr.address}, lat=${addr.lat}, lng=${addr.lng}`);
        } catch { /* ignore parse errors */ }
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
    let systemPrompt = await buildAgentPrompt(profile, state, leadScore, tenantId, lastUserMessage, ctaIntensity);

    // Inject sessionId so Hugo can pass it to request_valuation
    systemPrompt += `\n\nSESSION_ID: "${sessionId}" -- POUŽIJ tuto hodnotu jako sessionId v request_valuation.`;

    // Inject full ADDRESS_DATA into system prompt (informational)
    if (parsedAddressData) {
      const a = parsedAddressData;
      systemPrompt += `\nVALIDOVANÁ ADRESA: "${a.address}" (lat=${a.lat}, lng=${a.lng}). Adresa je uložena v profilu.`;
    }

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

    // Override request_valuation execute with closure over current profile
    const tools = {
      ...toolDefinitions,
      request_valuation: {
        ...toolDefinitions.request_valuation,
        execute: async () => {
          const rvKey = process.env.REALVISOR_API_KEY;
          if (!rvKey) return { success: false, summary: 'Chybi REALVISOR_API_KEY.' };

          const typeMap: Record<string, string> = { byt: 'flat', dum: 'house', pozemek: 'land' };
          const pt = typeMap[profile.propertyType ?? ''] ?? profile.propertyType ?? 'flat';
          const nameParts = (profile.name ?? '').trim().split(/\s+/);
          const firstName = nameParts[0] || 'Klient';
          const lastName = nameParts.slice(1).join(' ') || firstName;
          const p = profile as ClientProfile & Record<string, unknown>;

          // Auto-fill ownership as private (always)
          if (!profile.propertyOwnership) profile.propertyOwnership = 'private';

          // Validate
          const miss: string[] = [];
          if (!firstName || firstName === 'Klient') miss.push('jmeno');
          if (!profile.email) miss.push('email');
          if (!profile.phone) miss.push('telefon (phone) - vysvetli ze odhadce potrebuje zavolat');
          if (!profile.propertyLat || !profile.propertyLng) miss.push('adresa (GPS souradnice - klient musi vybrat z naseptavace)');
          if (pt === 'flat') {
            if (!profile.floorArea) miss.push('uzitna plocha (floorArea)');
            if (!profile.propertyRating) miss.push('stav (propertyRating)');
            if (!profile.propertySize) miss.push('dispozice (propertySize: 2+1, 3+kk...)');
            if (!profile.propertyConstruction) miss.push('konstrukce (propertyConstruction)');
          } else if (pt === 'house') {
            if (!profile.floorArea) miss.push('uzitna plocha (floorArea)');
            if (!profile.lotArea) miss.push('plocha pozemku (lotArea)');
            if (!profile.propertyRating) miss.push('stav (propertyRating)');
            if (!profile.propertyConstruction) miss.push('konstrukce (propertyConstruction)');
          } else if (pt === 'land') {
            if (!profile.lotArea) miss.push('plocha pozemku (lotArea)');
          }

          if (miss.length > 0) {
            console.log(`[Valuation] Missing: ${miss.join(', ')}. Profile: ${JSON.stringify({name: profile.name, email: profile.email, type: profile.propertyType, lat: profile.propertyLat, floor: profile.floorArea, rating: profile.propertyRating, size: profile.propertySize, own: profile.propertyOwnership, constr: profile.propertyConstruction})}`);
            return {
              success: false, missingFields: miss,
              summary: `NELZE odeslat oceneni -- v profilu chybi: ${miss.join(', ')}. Zeptej se klienta a ULOZ pres update_profile. Pak zavolej request_valuation znovu.`,
            };
          }

          // Build payload from profile
          const payload: Record<string, unknown> = {
            firstName, lastName, email: profile.email, phone: profile.phone,
            kind: 'sale', propertyType: pt,
            address: profile.propertyAddress ?? '', lat: profile.propertyLat, lng: profile.propertyLng,
            street: p._addrStreet ?? '', streetNumber: p._addrStreetNumber ?? '',
            city: profile.location ?? '', district: p._addrDistrict ?? '',
            region: p._addrRegion ?? '', postalCode: p._addrPostalCode ?? '',
          };
          if (pt === 'flat') {
            Object.assign(payload, {
              floorArea: profile.floorArea, rating: profile.propertyRating,
              localType: profile.propertySize, ownership: profile.propertyOwnership,
              construction: profile.propertyConstruction,
            });
            if (profile.propertyFloor !== undefined) payload.floor = profile.propertyFloor;
            if (profile.propertyTotalFloors) payload.totalFloors = profile.propertyTotalFloors;
            if (profile.propertyElevator !== undefined) payload.elevator = profile.propertyElevator;
          } else if (pt === 'house') {
            Object.assign(payload, {
              floorArea: profile.floorArea, lotArea: profile.lotArea,
              rating: profile.propertyRating, ownership: profile.propertyOwnership,
              construction: profile.propertyConstruction, houseType: 'family_house',
            });
          } else if (pt === 'land') {
            Object.assign(payload, { lotArea: profile.lotArea, landType: 'building' });
          }
          const clean = Object.fromEntries(Object.entries(payload).filter(([, v]) => v != null && v !== ''));
          console.log('[Valuation] Submitting:', JSON.stringify(clean));

          try {
            const vRes = await fetch('https://api-production-88cf.up.railway.app/api/v1/public/api-leads/valuo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-API-Key': rvKey },
              body: JSON.stringify(clean),
            });
            const vText = await vRes.text();
            console.log(`[Valuation] Response ${vRes.status}: ${vText.substring(0, 300)}`);
            let vData;
            try { vData = JSON.parse(vText); } catch { return { success: false, summary: `Oceneni selhalo: neplatna odpoved API` }; }

            if (vData.success && vData.valuation) {
              const v = vData.valuation;
              const cad = vData.cadastre;
              const prop = vData.property;
              const fmt = (n: number) => Math.round(n).toLocaleString('cs-CZ');

              // Save rich data to profile for follow-up analyses
              profile.valuationId = vData.valuationId;
              profile.valuationPropertyId = vData.propertyId;
              profile.valuationAvgPrice = v.avgPrice;
              profile.valuationMinPrice = v.minPrice;
              profile.valuationMaxPrice = v.maxPrice;
              profile.valuationAvgPriceM2 = v.avgPriceM2;
              profile.valuationMinPriceM2 = v.minPriceM2;
              profile.valuationMaxPriceM2 = v.maxPriceM2;
              profile.valuationCalcArea = v.calcArea;
              profile.valuationAvgDuration = v.avgDuration;
              profile.valuationAvgScore = v.avgScore;
              profile.valuationAvgDistance = v.avgDistance;
              profile.valuationAvgAge = v.avgAge;
              profile.valuationDate = v.asOf;
              profile.valuationCurrency = v.currency;
              if (cad) {
                profile.cadastralArea = cad.cadastralArea;
                profile.parcelNumber = cad.parcelNumber;
                profile.ruianCode = cad.ruianCode;
              }
              if (prop?.panoramaUrl) profile.panoramaUrl = prop.panoramaUrl;
              profile.valuationEmailSent = vData.emailSent;
              profile.valuationLeadId = vData.leadId;
              profile.valuationContactId = vData.contactId;

              // Use propertyPrice for mortgage calculations
              if (!profile.propertyPrice) profile.propertyPrice = v.avgPrice;

              return {
                success: true, displayed: true,
                // Core valuation
                valuationId: vData.valuationId, propertyId: vData.propertyId,
                avgPrice: v.avgPrice, minPrice: v.minPrice, maxPrice: v.maxPrice,
                avgPriceM2: v.avgPriceM2, minPriceM2: v.minPriceM2, maxPriceM2: v.maxPriceM2,
                avgDuration: v.avgDuration, calcArea: v.calcArea,
                // Quality metrics
                avgScore: v.avgScore, avgDistance: v.avgDistance, avgAge: v.avgAge,
                searchRadius: v.distance,
                // Cadastre
                cadastralArea: cad?.cadastralArea, parcelNumber: cad?.parcelNumber,
                // Widget display
                address: profile.propertyAddress, propertyType: pt,
                contactEmail: profile.email, emailSent: vData.emailSent,
                summary: (() => {
                  const parts: string[] = [];
                  parts.push(`Oceneni dokonceno. Odhadni cena: ${fmt(v.avgPrice)} Kc (rozmezi ${fmt(v.minPrice)} - ${fmt(v.maxPrice)} Kc). Cena za m2: ${fmt(v.avgPriceM2)} Kc/m2. Prumerna doba prodeje: ${v.avgDuration} dni.`);

                  // Quality warnings for Hugo to mention
                  const warnings: string[] = [];
                  const rangeP = v.avgPrice > 0 ? Math.round(((v.maxPrice - v.minPrice) / v.avgPrice) * 100) : 0;
                  if (v.avgAge && v.avgAge > 90) warnings.push(`data jsou v prumeru ${Math.round(v.avgAge)} dni stara`);
                  if (v.avgDistance && v.avgDistance > 1000) warnings.push(`srovnatelne nemovitosti jsou v prumeru ${(v.avgDistance / 1000).toFixed(1)} km daleko`);
                  if (v.avgScore && v.avgScore < 0.6) warnings.push(`nizka shoda se srovnatelnymi (${(v.avgScore * 100).toFixed(0)}%)`);
                  if (rangeP > 40) warnings.push(`velky cenovy rozptyl (${rangeP}%)`);

                  if (warnings.length > 0) {
                    parts.push(`UPOZORNENI NA KVALITU DAT: ${warnings.join(', ')}. Rekni klientovi: "Musim upozornit, ze ${warnings.join(' a ')}. Proto doporucuji osobni posouzeni nasim specialistou -- je to nezavazne a zdarma, a vysledek bude mnohem presnejsi."`);
                  } else {
                    parts.push(`Kvalita dat je dobra (shoda ${v.avgScore ? (v.avgScore * 100).toFixed(0) : '?'}%, prumerna vzdalenost ${v.avgDistance ?? '?'} m). Rekni: "Toto je orientacni odhad. Nas specialista vas bude kontaktovat pro upresneni -- nezavazne a zdarma."`);
                  }

                  parts.push(`Vysledek odeslan na email ${profile.email}.`);
                  parts.push(`UPSELL: Cena nemovitosti ulozena jako propertyPrice=${fmt(v.avgPrice)} Kc. Nabidni: 1) vypocet hypoteky, 2) investicni analyzu, 3) srovnani najem vs koupi. Rekni: "Chcete spocitat hypoteku na zaklade teto ceny? Staci rict kolik mate nasporenych penez."`);
                  return parts.join(' ');
                })(),
              };
            }
            return { success: false, summary: `Oceneni selhalo: ${vData.error ?? 'neznama chyba'}` };
          } catch (err) {
            console.error('[Valuation] Error:', err);
            return { success: false, summary: 'Chyba pri odesilani oceneni.' };
          }
        },
      },
    };

    const modelMessages = await convertToModelMessages(messages, {
      tools: tools,
    });

    const result = streamText({
      model: createGoogleGenerativeAI({ apiKey })(tenantConfig.aiConfig.model),
      system: systemPrompt,
      messages: modelMessages,
      tools: tools,
      stopWhen: stepCountIs(tenantConfig.aiConfig.maxSteps),
      onStepFinish: async ({ toolResults }) => {
        if (toolResults) {
          // PASS 1: Process update_profile FIRST so profile has latest data
          for (const tr of toolResults) {
            const toolName = typeof tr.toolName === 'string' ? tr.toolName : '';
            const input = ('input' in tr && tr.input && typeof tr.input === 'object')
              ? tr.input as Record<string, unknown>
              : {};
            if (toolName === 'update_profile' && Object.keys(input).length > 0) {
              const hadEmail = !!profile.email;
              const hadPhone = !!profile.phone;
              Object.assign(profile, Object.fromEntries(
                Object.entries(input).filter(([, v]) => v !== undefined)
              ));
              console.log(`[Profile] update_profile (pass 1): ${Object.keys(input).filter(k => input[k] !== undefined).join(', ')}`);
              const fields = getCollectedFields(profile);
              state.dataCollected = fields;
              state.phase = determinePhase(state, fields);

              // Auto-submit lead to Realvisor when we get new contact info
              const gotNewContact = (!hadEmail && profile.email) || (!hadPhone && profile.phone);
              if (gotNewContact && (profile.email || profile.phone)) {
                const leadName = profile.name ?? 'Neznamy';
                const leadTemp = state.leadQualified ? 'qualified' : (state.leadScore >= 40 ? 'hot' : (state.leadScore >= 20 ? 'warm' : 'cold'));
                const rvPayload = buildRealvisorPayload(
                  leadName, profile.email ?? '', profile.phone ?? '',
                  `Auto-lead z chatu (${state.phase})`,
                  profile as Record<string, unknown>,
                  { sessionId, tenantId, leadScore: state.leadScore, leadTemperature: leadTemp }
                );
                submitLeadToRealvisor(rvPayload)
                  .then(rv => {
                    console.log(`[Lead] Auto-submitted to Realvisor: ${rv.success ? rv.leadId : 'failed'}`);
                    storage.saveLead({
                      id: uuidv4(), tenantId, sessionId,
                      name: leadName, email: profile.email ?? '', phone: profile.phone ?? '',
                      context: `Auto-lead z chatu (${state.phase})`, profile,
                      leadScore: state.leadScore ?? 0, leadTemperature: leadTemp,
                      realvisorLeadId: rv.leadId, realvisorContactId: rv.contactId,
                      createdAt: new Date().toISOString(),
                    }).catch(e => console.error('[Storage] Lead save error:', e));
                  })
                  .catch(err => console.error('[Lead] Realvisor submit error:', err));
              }
            }
          }

          // PASS 2: Process all other tools (including request_valuation which needs updated profile)
          for (const tr of toolResults) {
            const toolName = typeof tr.toolName === 'string' ? tr.toolName : '';
            const input = ('input' in tr && tr.input && typeof tr.input === 'object')
              ? tr.input as Record<string, unknown>
              : {};

            // Track shown widgets + valuation tools
            if (toolName.startsWith('show_') || toolName === 'geocode_address' || toolName === 'request_valuation') {
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

            // Auto-capture from valuation tools
            if (toolName === 'geocode_address') {
              console.log(`[Profile] Geocode called for: ${input.query}`);
            }
            if (toolName === 'request_valuation') {
              // Valuation submission now happens in execute (closure over profile)
              // Just capture result into profile
              const result = 'output' in tr ? tr.output as Record<string, unknown> : {};
              if (result.valuationId) profile.valuationId = result.valuationId as string;
              if (result.avgPrice) profile.valuationAvgPrice = result.avgPrice as number;
              console.log(`[Valuation] Result: success=${result.success}, valuationId=${result.valuationId ?? 'none'}`);
            }

            // After any show_ widget or valuation tool, refresh dataCollected + phase
            if (toolName.startsWith('show_') || toolName === 'send_email_summary' || toolName === 'request_valuation' || toolName === 'geocode_address') {
              const fields = getCollectedFields(profile);
              state.dataCollected = fields;
              state.phase = determinePhase(state, fields);
            }

            // update_profile already processed in PASS 1 above
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
