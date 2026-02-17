'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../layout';
import { Save, Loader2, Check, Plus, Trash2 } from 'lucide-react';

interface QuickAction {
  label: string;
  prompt: string;
}

interface WelcomeConfig {
  welcomeTitle: string;
  welcomeSubtitle: string;
  quickActions: QuickAction[];
}

export function WelcomeEditor() {
  const { activeTenant, tenants } = useAdmin();
  const tenant = tenants.find(t => t.id === activeTenant);
  const [form, setForm] = useState<WelcomeConfig>({
    welcomeTitle: '',
    welcomeSubtitle: '',
    quickActions: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    const wc = (tenant.welcome_config ?? {}) as Partial<WelcomeConfig>;
    setForm({
      welcomeTitle: wc.welcomeTitle ?? '',
      welcomeSubtitle: wc.welcomeSubtitle ?? '',
      quickActions: wc.quickActions ?? [],
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
        welcome_config: form,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [activeTenant, form]);

  const addAction = () => {
    setForm(f => ({ ...f, quickActions: [...f.quickActions, { label: '', prompt: '' }] }));
  };

  const removeAction = (idx: number) => {
    setForm(f => ({ ...f, quickActions: f.quickActions.filter((_, i) => i !== idx) }));
  };

  const updateAction = (idx: number, field: keyof QuickAction, value: string) => {
    setForm(f => ({
      ...f,
      quickActions: f.quickActions.map((a, i) => i === idx ? { ...a, [field]: value } : a),
    }));
  };

  const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-violet-400 transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Welcome Screen</h2>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Ukládám...' : saved ? 'Uloženo' : 'Uložit'}
        </button>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-3 border-2 border-dashed border-gray-200">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Náhled</p>
        <h3 className="text-2xl font-bold text-gray-900">{form.welcomeTitle || 'Titulek...'}</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">{form.welcomeSubtitle || 'Podtitulek...'}</p>
        {form.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {form.quickActions.map((a, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-medium">
                {a.label || '...'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Texty</h3>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Titulek</label>
          <input className={input} value={form.welcomeTitle} onChange={e => setForm(f => ({ ...f, welcomeTitle: e.target.value }))} placeholder="Jsem Hugo, váš hypoteční poradce" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Podtitulek</label>
          <textarea className={`${input} min-h-[80px]`} value={form.welcomeSubtitle} onChange={e => setForm(f => ({ ...f, welcomeSubtitle: e.target.value }))} placeholder="Pomohu vám s hypotékou..." />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Quick Actions (tlačítka)</h3>
          <button onClick={addAction} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-600 hover:bg-violet-50 transition-all">
            <Plus className="w-3.5 h-3.5" /> Přidat
          </button>
        </div>
        {form.quickActions.length === 0 && (
          <p className="text-sm text-gray-400">Žádné quick actions. Klikněte na Přidat.</p>
        )}
        {form.quickActions.map((action, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Label (text tlačítka)</label>
                <input className={input} value={action.label} onChange={e => updateAction(idx, 'label', e.target.value)} placeholder="Spočítat splátku" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Prompt (zpráva do chatu)</label>
                <input className={input} value={action.prompt} onChange={e => updateAction(idx, 'prompt', e.target.value)} placeholder="Chci si spočítat splátku hypotéky." />
              </div>
            </div>
            <button onClick={() => removeAction(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all mt-4">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
