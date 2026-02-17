'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../layout';
import { Plus, Save, Trash2, Loader2, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface KBItem {
  id: string;
  tenant_id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { value: 'faq', label: 'FAQ' },
  { value: 'cnb_rules', label: 'Pravidla ČNB' },
  { value: 'bank_process', label: 'Bankovní procesy' },
  { value: 'legal', label: 'Právní' },
  { value: 'product', label: 'Produkty' },
  { value: 'objection_handling', label: 'Námitky' },
  { value: 'competitor', label: 'Konkurence' },
  { value: 'valuation', label: 'Ocenění' },
  { value: 'custom', label: 'Vlastní' },
];

export function KnowledgeEditor() {
  const { activeTenant } = useAdmin();
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<KBItem & { keywordsStr: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.value)));

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/knowledge?tenantId=${activeTenant}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, [activeTenant]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleEdit = (item: KBItem) => {
    setEditingId(item.id);
    setEditForm({ ...item, keywordsStr: (item.keywords ?? []).join(', ') });
    setCreating(false);
  };

  const handleNew = () => {
    setCreating(true);
    setEditingId(null);
    setEditForm({
      tenant_id: activeTenant,
      category: 'faq',
      title: '',
      content: '',
      keywordsStr: '',
      sort_order: 0,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const keywords = (editForm.keywordsStr ?? '').split(',').map(k => k.trim()).filter(Boolean);
    const payload = { ...editForm, keywords };
    delete (payload as Record<string, unknown>).keywordsStr;

    if (creating) {
      await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/admin/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditingId(null);
    setCreating(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat tuto položku?')) return;
    await fetch(`/api/admin/knowledge?id=${id}`, { method: 'DELETE' });
    fetchItems();
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
    items: items.filter(i => i.category === cat.value),
  })).filter(g => g.items.length > 0);

  const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-violet-400 transition-all";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Knowledge Base</h2>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-all">
          <Plus className="w-4 h-4" /> Nová položka
        </button>
      </div>

      {/* Edit/Create form */}
      {(editingId || creating) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border-2 border-violet-200">
          <h3 className="text-sm font-bold text-violet-700">{creating ? 'Nová položka' : 'Editace položky'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Kategorie</label>
              <select className={input} value={editForm.category ?? 'faq'} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Titulek</label>
              <input className={input} value={editForm.title ?? ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Obsah</label>
            <textarea
              className={`${input} min-h-[150px] font-mono text-xs leading-relaxed`}
              value={editForm.content ?? ''}
              onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Klíčová slova (oddělená čárkou)</label>
            <input className={input} value={editForm.keywordsStr ?? ''} onChange={e => setEditForm(f => ({ ...f, keywordsStr: e.target.value }))} placeholder="ltv, loan to value, poměr" />
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

      {/* Grouped list */}
      {grouped.map(group => (
        <div key={group.value} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => toggleCat(group.value)} className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-gray-50 transition-all">
            {expandedCats.has(group.value) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <span className="text-sm font-bold text-gray-700">{group.label}</span>
            <span className="text-xs text-gray-400 ml-1">({group.items.length})</span>
          </button>
          {expandedCats.has(group.value) && (
            <div className="border-t border-gray-100">
              {group.items.map(item => (
                <div key={item.id} className="px-5 py-3 border-b border-gray-50 hover:bg-violet-50/30 cursor-pointer transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0" onClick={() => handleEdit(item)}>
                      <span className="font-medium text-sm text-gray-900">{item.title}</span>
                      {item.keywords?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.keywords.slice(0, 5).map(k => (
                            <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">Žádné položky knowledge base pro tento tenant.</div>
      )}
    </div>
  );
}
