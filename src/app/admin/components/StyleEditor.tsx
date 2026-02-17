'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../layout';
import { Plus, Save, Trash2, Loader2, Check, Star } from 'lucide-react';

interface Style {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  tone: string;
  style_prompt: string;
  example_conversations: unknown[];
  max_response_length: number;
  use_formal_you: boolean;
  allowed_phrases: unknown[];
  forbidden_phrases: unknown[];
  is_active: boolean;
  is_default: boolean;
  ab_weight: number;
}

export function StyleEditor() {
  const { activeTenant } = useAdmin();
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Style>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchStyles = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/styles?tenantId=${activeTenant}`);
    const data = await res.json();
    setStyles(data.styles ?? []);
    setLoading(false);
  }, [activeTenant]);

  useEffect(() => { fetchStyles(); }, [fetchStyles]);

  const handleEdit = (s: Style) => {
    setEditingId(s.id);
    setEditForm({ ...s });
    setCreating(false);
  };

  const handleNew = () => {
    setCreating(true);
    setEditingId(null);
    setEditForm({
      tenant_id: activeTenant,
      slug: '',
      name: '',
      tone: 'professional',
      style_prompt: '',
      max_response_length: 150,
      use_formal_you: true,
      is_default: false,
      ab_weight: 100,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    if (creating) {
      await fetch('/api/admin/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
    } else {
      await fetch('/api/admin/styles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditingId(null);
    setCreating(false);
    fetchStyles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat tento styl?')) return;
    await fetch(`/api/admin/styles?id=${id}`, { method: 'DELETE' });
    fetchStyles();
  };

  const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-violet-400 transition-all";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Komunikační styly</h2>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-all">
          <Plus className="w-4 h-4" /> Nový styl
        </button>
      </div>

      {/* Edit/Create form */}
      {(editingId || creating) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border-2 border-violet-200">
          <h3 className="text-sm font-bold text-violet-700">{creating ? 'Nový styl' : 'Editace stylu'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
              <input className={input} value={editForm.slug ?? ''} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))} placeholder="professional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Název</label>
              <input className={input} value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Profesionální poradce" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tón</label>
              <select className={input} value={editForm.tone ?? 'professional'} onChange={e => setEditForm(f => ({ ...f, tone: e.target.value }))}>
                <option value="professional">Profesionální</option>
                <option value="friendly">Přátelský</option>
                <option value="expert">Expert</option>
                <option value="casual">Neformální</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Popis</label>
            <input className={input} value={editForm.description ?? ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Style prompt (instrukce pro AI)</label>
            <textarea
              className={`${input} min-h-[150px] font-mono text-xs leading-relaxed`}
              value={editForm.style_prompt ?? ''}
              onChange={e => setEditForm(f => ({ ...f, style_prompt: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max délka odpovědi (slov)</label>
              <input type="number" className={input} value={editForm.max_response_length ?? 150} onChange={e => setEditForm(f => ({ ...f, max_response_length: parseInt(e.target.value) || 150 }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">A/B váha</label>
              <input type="number" min="0" max="100" className={input} value={editForm.ab_weight ?? 100} onChange={e => setEditForm(f => ({ ...f, ab_weight: parseInt(e.target.value) || 100 }))} />
            </div>
            <div className="space-y-2 pt-5">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.use_formal_you ?? true} onChange={e => setEditForm(f => ({ ...f, use_formal_you: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-600">Vykání</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.is_default ?? false} onChange={e => setEditForm(f => ({ ...f, is_default: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-600">Výchozí styl</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button onClick={() => { setEditingId(null); setCreating(false); }} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Zrušit</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {styles.map(s => (
          <div key={s.id} className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all ${editingId === s.id ? 'ring-2 ring-violet-300' : ''} ${!s.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0" onClick={() => handleEdit(s)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  {s.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                  <code className="text-xs font-mono text-gray-400">{s.slug}</code>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{s.tone}</span>
                </div>
                {s.description && <p className="text-xs text-gray-500 mt-1">{s.description}</p>}
                <p className="text-xs text-gray-400 mt-1 truncate font-mono">{s.style_prompt.slice(0, 120)}...</p>
              </div>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {styles.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">Žádné komunikační styly pro tento tenant.</div>
      )}
    </div>
  );
}
