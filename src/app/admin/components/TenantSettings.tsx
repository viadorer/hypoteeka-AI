'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../layout';
import { Save, Loader2, Check } from 'lucide-react';

export function TenantSettings() {
  const { activeTenant, tenants } = useAdmin();
  const tenant = tenants.find(t => t.id === activeTenant);
  const [form, setForm] = useState({
    name: '',
    domain: '',
    agent_name: '',
    is_active: true,
    // Branding
    primary_color: '',
    accent_color: '',
    title: '',
    description: '',
    logo_url: '',
    // AI Config
    provider: '',
    model: '',
    temperature: 0.7,
    max_steps: 5,
    api_key_env: '',
    // Features
    live_rates: false,
    vocative_greeting: true,
    lead_capture: true,
    knowledge_base_rag: false,
    primary_flow: 'mortgage',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    const b = (tenant.branding ?? {}) as Record<string, unknown>;
    const a = (tenant.ai_config ?? {}) as Record<string, unknown>;
    const f = (tenant.features ?? {}) as Record<string, unknown>;
    setForm({
      name: tenant.name ?? '',
      domain: tenant.domain ?? '',
      agent_name: tenant.agent_name ?? '',
      is_active: tenant.is_active ?? true,
      primary_color: (b.primary_color as string) ?? '',
      accent_color: (b.accent_color as string) ?? '',
      title: (b.title as string) ?? '',
      description: (b.description as string) ?? '',
      logo_url: (b.logo_url as string) ?? '',
      provider: (a.provider as string) ?? 'google',
      model: (a.model as string) ?? 'gemini-2.0-flash',
      temperature: (a.temperature as number) ?? 0.7,
      max_steps: (a.max_steps as number) ?? 5,
      api_key_env: (a.api_key_env as string) ?? '',
      live_rates: (f.live_rates as boolean) ?? false,
      vocative_greeting: (f.vocative_greeting as boolean) ?? true,
      lead_capture: (f.lead_capture as boolean) ?? true,
      knowledge_base_rag: (f.knowledge_base_rag as boolean) ?? false,
      primary_flow: (f.primaryFlow as string) ?? (f.primary_flow as string) ?? 'mortgage',
    });
  }, [tenant]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    await fetch('/api/admin/tenants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeTenant,
        name: form.name,
        domain: form.domain,
        agent_name: form.agent_name,
        is_active: form.is_active,
        branding: {
          primary_color: form.primary_color,
          accent_color: form.accent_color,
          title: form.title,
          description: form.description,
          logo_url: form.logo_url || undefined,
        },
        ai_config: {
          provider: form.provider,
          model: form.model,
          temperature: form.temperature,
          max_steps: form.max_steps,
          api_key_env: form.api_key_env,
        },
        features: {
          live_rates: form.live_rates,
          vocative_greeting: form.vocative_greeting,
          lead_capture: form.lead_capture,
          knowledge_base_rag: form.knowledge_base_rag,
          primaryFlow: form.primary_flow,
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [activeTenant, form]);

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );

  const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-violet-400 transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Nastavení tenantu: {activeTenant}</h2>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Ukládám...' : saved ? 'Uloženo' : 'Uložit'}
        </button>
      </div>

      {/* General */}
      <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Obecné</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Název">
            <input className={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Doména">
            <input className={input} value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} />
          </Field>
          <Field label="Jméno agenta">
            <input className={input} value={form.agent_name} onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))} placeholder="Hugo" />
          </Field>
          <Field label="Aktivní">
            <label className="flex items-center gap-2 mt-1">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-600">Tenant je aktivní</span>
            </label>
          </Field>
        </div>
      </section>

      {/* Branding */}
      <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Branding</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primární barva">
            <div className="flex gap-2 items-center">
              <input type="color" value={form.primary_color || '#E91E63'} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
              <input className={input} value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} placeholder="#E91E63" />
            </div>
          </Field>
          <Field label="Akcentová barva">
            <div className="flex gap-2 items-center">
              <input type="color" value={form.accent_color || '#0047FF'} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
              <input className={input} value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} placeholder="#0047FF" />
            </div>
          </Field>
          <Field label="Titulek">
            <input className={input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Popis">
            <input className={input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Logo URL">
            <input className={input} value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="/images/logo.png" />
          </Field>
        </div>
      </section>

      {/* AI Config */}
      <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">AI Konfigurace</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Provider">
            <select className={input} value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
              <option value="google">Google (Gemini)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </Field>
          <Field label="Model">
            <input className={input} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          </Field>
          <Field label="Teplota">
            <input type="number" step="0.1" min="0" max="2" className={input} value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: parseFloat(e.target.value) || 0 }))} />
          </Field>
          <Field label="Max kroků">
            <input type="number" min="1" max="20" className={input} value={form.max_steps} onChange={e => setForm(f => ({ ...f, max_steps: parseInt(e.target.value) || 5 }))} />
          </Field>
          <Field label="API Key env var">
            <input className={input} value={form.api_key_env} onChange={e => setForm(f => ({ ...f, api_key_env: e.target.value }))} placeholder="GOOGLE_AI_KEY_HYPOTEEKA" />
          </Field>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Features</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primární flow">
            <select className={input} value={form.primary_flow} onChange={e => setForm(f => ({ ...f, primary_flow: e.target.value }))}>
              <option value="mortgage">Hypotéka</option>
              <option value="valuation">Ocenění</option>
            </select>
          </Field>
          <div className="space-y-2 pt-5">
            {([
              ['live_rates', 'Živé sazby ČNB'],
              ['vocative_greeting', 'Oslovení vokativem'],
              ['lead_capture', 'Lead capture'],
              ['knowledge_base_rag', 'Knowledge Base RAG'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-600">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
