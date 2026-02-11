/**
 * Supabase Storage - produkční implementace StorageProvider
 * 
 * Ukládá sessions, messages a leads do Supabase Postgres.
 * Používá service_role klient (obchází RLS).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StorageProvider, SessionData, LeadRecord } from './types';

export class SupabaseStorage implements StorageProvider {
  constructor(private db: SupabaseClient) {}

  async getSession(sessionId: string): Promise<SessionData | null> {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) return null;

    // Načti messages pro session
    const { data: messages } = await this.db
      .from('messages')
      .select('role, content, tool_calls, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    return {
      id: data.id,
      tenantId: data.tenant_id,
      profile: data.client_profile ?? {},
      state: {
        phase: data.phase,
        widgetsShown: data.conversation_state?.widgetsShown ?? [],
        questionsAsked: data.conversation_state?.questionsAsked ?? [],
        dataCollected: data.conversation_state?.dataCollected ?? [],
        leadScore: data.lead_score,
        leadQualified: data.lead_qualified,
        leadCaptured: data.lead_captured,
        turnCount: data.turn_count,
      },
      messages: (messages ?? []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        toolCalls: m.tool_calls,
        timestamp: m.created_at,
      })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async saveSession(session: SessionData): Promise<void> {
    const { error } = await this.db
      .from('sessions')
      .upsert({
        id: session.id,
        tenant_id: session.tenantId,
        phase: session.state.phase,
        lead_score: session.state.leadScore,
        lead_qualified: session.state.leadQualified,
        lead_captured: session.state.leadCaptured,
        turn_count: session.state.turnCount,
        client_profile: session.profile,
        conversation_state: {
          widgetsShown: session.state.widgetsShown,
          questionsAsked: session.state.questionsAsked,
          dataCollected: session.state.dataCollected,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error('[SupabaseStorage] saveSession error:', error.message);
    }

    // Uložit nové messages (pokud jsou)
    if (session.messages.length > 0) {
      const newMessages = session.messages.map(m => ({
        session_id: session.id,
        tenant_id: session.tenantId,
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls ?? [],
        created_at: m.timestamp,
      }));

      const { error: msgError } = await this.db
        .from('messages')
        .upsert(newMessages, { onConflict: 'id', ignoreDuplicates: true });

      if (msgError) {
        console.error('[SupabaseStorage] saveMessages error:', msgError.message);
      }
    }
  }

  async listSessions(tenantId?: string): Promise<SessionData[]> {
    let query = this.db
      .from('sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      profile: row.client_profile ?? {},
      state: {
        phase: row.phase,
        widgetsShown: row.conversation_state?.widgetsShown ?? [],
        questionsAsked: row.conversation_state?.questionsAsked ?? [],
        dataCollected: row.conversation_state?.dataCollected ?? [],
        leadScore: row.lead_score,
        leadQualified: row.lead_qualified,
        leadCaptured: row.lead_captured,
        turnCount: row.turn_count,
      },
      messages: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async saveLead(lead: LeadRecord): Promise<void> {
    const { error } = await this.db
      .from('leads')
      .insert({
        id: lead.id,
        tenant_id: lead.tenantId,
        session_id: lead.sessionId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        context: lead.context,
        profile_snapshot: lead.profile,
        lead_score: lead.leadScore,
        lead_temperature: lead.leadTemperature,
      });

    if (error) {
      console.error('[SupabaseStorage] saveLead error:', error.message);
    }
  }

  async getLeads(tenantId?: string): Promise<LeadRecord[]> {
    let query = this.db
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      sessionId: row.session_id,
      name: row.name,
      email: row.email ?? '',
      phone: row.phone ?? '',
      context: row.context ?? '',
      profile: row.profile_snapshot ?? {},
      leadScore: row.lead_score,
      leadTemperature: row.lead_temperature,
      createdAt: row.created_at,
    }));
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await this.db
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('[SupabaseStorage] deleteSession error:', error.message);
    }
  }
}
