'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../layout';
import { Plus, Save, Trash2, Loader2, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface Prompt {
  id: string;
  tenant_id: string;
  slug: string;
  category: string;
  content: string;
  description: string | null;
  phase: string | null;
  sort_order: number;
  is_active: boolean;
}

const CATEGORIES = [
  { value: 'base_prompt', label: 'Základní prompt' },
  { value: 'phase_instruction', label: 'Fáze konverzace' },
  { value: 'tool_instruction', label: 'Instrukce nástrojů' },
  { value: 'guardrail', label: 'Guardrail' },
  { value: 'personalization', label: 'Personalizace' },
  { value: 'business_rules', label: 'Business pravidla' },
  { value: 'rates_context', label: 'Kontext sazeb' },
  { value: 'custom', label: 'Vlastní' },
];

const PHASES = [
  { value: '', label: '-- žádná --' },
  { value: 'greeting', label: 'Greeting' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'followup', label: 'Followup' },
];

export function PromptEditor() {
  const { activeTenant } = useAdmin();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Prompt>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.value)));

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/prompts?tenantId=${activeTenant}`);
    const data = await res.json();
    setPrompts(data.prompts ?? []);
    setLoading(false);
  }, [activeTenant]);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const handleEdit = (p: Prompt) => {
    setEditingId(p.id);
    setEditForm({ ...p });
    setCreating(false);
  };

  const handleNew = () => {
    setCreating(true);
    setEditingId(null);
    setEditForm({
      tenant_id: activeTenant,
      slug: '',
      category: 'custom',
      content: '',
      description: '',
      phase: null,
      sort_order: 0,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    if (creating) {
      await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
    } else {
      await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, tenant_id: activeTenant, ...editForm }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditingId(null);
    setCreating(false);
    fetchPrompts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat tento prompt?')) return;
    await fetch(`/api/admin/prompts?id=${id}`, { method: 'DELETE' });
    fetchPrompts();
  };

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    prompts: prompts.filter(p => p.category === cat.value),
  })).filter(g => g.prompts.length > 0);

  const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-violet-400 transition-all";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Prompt Templates</h2>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-all">
          <Plus className="w-4 h-4" /> Nový prompt
        </button>
      </div>

      {/* Edit/Create form */}
      {(editingId || creating) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border-2 border-violet-200">
          <h3 className="text-sm font-bold text-violet-700">{creating ? 'Nový prompt' : 'Editace promptu'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
              <input className={input} value={editForm.slug ?? ''} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))} placeholder="base_identity" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Kategorie</label>
              <select className={input} value={editForm.category ?? 'custom'} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fáze</label>
              <select className={input} value={editForm.phase ?? ''} onChange={e => setEditForm(f => ({ ...f, phase: e.target.value || null }))}>
                {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Popis</label>
            <input className={input} value={editForm.description ?? ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Obsah promptu</label>
            <textarea
              className={`${input} min-h-[200px] font-mono text-xs leading-relaxed`}
              value={editForm.content ?? ''}
              onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Pořadí</label>
              <input type="number" className={`${input} w-24`} value={editForm.sort_order ?? 0} onChange={e => setEditForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex-1" />
            <button onClick={() => { setEditingId(null); setCreating(false); }} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Zrušit</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
        </div>
      )}

      {/* Grouped list */}
      {grouped.map(group => (
        <div key={group.value} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => toggleCat(group.value)} className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-gray-50 transition-all">
            {expandedCats.has(group.value) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <span className="text-sm font-bold text-gray-700">{group.label}</span>
            <span className="text-xs text-gray-400 ml-1">({group.prompts.length})</span>
          </button>
          {expandedCats.has(group.value) && (
            <div className="border-t border-gray-100">
              {group.prompts.map(p => (
                <div key={p.id} className={`px-5 py-3 border-b border-gray-50 hover:bg-violet-50/30 cursor-pointer transition-all ${editingId === p.id ? 'bg-violet-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0" onClick={() => handleEdit(p)}>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{p.slug}</code>
                        {p.phase && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{p.phase}</span>}
                        <span className="text-[10px] text-gray-400">#{p.sort_order}</span>
                      </div>
                      {p.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>}
                    </div>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {prompts.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">Žádné prompt templates pro tento tenant.</div>
      )}
    </div>
  );
}
