'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../layout';
import { Loader2, Save, Plus, Trash2, Check, X } from 'lucide-react';

interface Broker {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  slug: string;
  email: string;
  phone: string;
  whatsapp_phone: string | null;
  photo_url: string | null;
  role_label: string;
  short_description: string | null;
  specializations: string[];
  vertical_tags: string[];
  company: string;
  vazany_zastupce_of: string | null;
  cnb_license_id: string | null;
  legal_disclosure: string | null;
  is_active: boolean;
  accepts_leads: boolean;
  source: 'internal' | 'ptf' | 'external';
  external_id: string | null;
  bio: string | null;
  created_at?: string;
  updated_at?: string;
}

function emptyBroker(tenantId: string): Partial<Broker> {
  return {
    tenant_id: tenantId,
    first_name: '',
    last_name: '',
    display_name: '',
    slug: '',
    email: '',
    phone: '',
    whatsapp_phone: '',
    photo_url: '',
    role_label: 'Hypoteční specialista',
    short_description: '',
    specializations: [],
    vertical_tags: [],
    company: 'Quadrum',
    vazany_zastupce_of: 'SAB servis s.r.o.',
    cnb_license_id: '',
    legal_disclosure: '',
    is_active: true,
    accepts_leads: true,
    source: 'internal',
    bio: '',
  };
}

const VERTICAL_OPTIONS = ['bydleni', 'investice', 'refi'];

export function BrokersEditor() {
  const { activeTenant } = useAdmin();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Broker> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/brokers?tenantId=${activeTenant}`);
      const data = await r.json();
      setBrokers(data.brokers ?? []);
    } catch {
      setError('Nepodařilo se načíst brokery.');
    } finally {
      setLoading(false);
    }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTenant) load();
  }, [activeTenant, load]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const isUpdate = !!editing.id;
      const r = await fetch('/api/admin/brokers', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Save failed');
      setSaved(true);
      setEditing(null);
      await load();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (broker: Broker) => {
    if (!confirm(`Deaktivovat brokera ${broker.display_name}? (lze obnovit)`)) return;
    try {
      const r = await fetch(`/api/admin/brokers?id=${broker.id}`, { method: 'DELETE' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Deaktivace selhala');
    }
  };

  const handleField = <K extends keyof Broker>(key: K, value: Broker[K]) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  };

  const handleArrayField = (key: 'specializations' | 'vertical_tags', value: string) => {
    if (!editing) return;
    const arr = value.split(',').map((s) => s.trim()).filter(Boolean);
    setEditing({ ...editing, [key]: arr });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokeři</h1>
          <p className="text-sm text-gray-500">Pool hypotečních specialistů pro tento tenant.</p>
        </div>
        <button
          onClick={() => setEditing(emptyBroker(activeTenant))}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Nový broker
        </button>
      </div>

      {saved && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
          <Check className="w-4 h-4" /> Uloženo
        </div>
      )}
      {error && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* Edit panel */}
      {editing && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {editing.id ? `Upravit: ${editing.display_name}` : 'Nový broker'}
            </h2>
            <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Jméno" value={editing.first_name ?? ''} onChange={(v) => handleField('first_name', v)} />
            <Field label="Příjmení" value={editing.last_name ?? ''} onChange={(v) => handleField('last_name', v)} />
            <Field label="Display name (oslov.)" value={editing.display_name ?? ''} onChange={(v) => handleField('display_name', v)} hint='Jak ho Hugo oslovuje, např. "David"' />
            <Field label="Slug (URL)" value={editing.slug ?? ''} onChange={(v) => handleField('slug', v)} hint="Bez diakritiky, např. david-choc" />
            <Field label="Email" value={editing.email ?? ''} onChange={(v) => handleField('email', v)} />
            <Field label="Telefon" value={editing.phone ?? ''} onChange={(v) => handleField('phone', v)} hint="Formát +420774052232" />
            <Field label="WhatsApp" value={editing.whatsapp_phone ?? ''} onChange={(v) => handleField('whatsapp_phone', v)} />
            <Field label="Foto URL" value={editing.photo_url ?? ''} onChange={(v) => handleField('photo_url', v)} hint="Nepovinné, fallback jsou iniciály" />
            <Field label="Firma" value={editing.company ?? ''} onChange={(v) => handleField('company', v)} />
            <Field label="Vázaný zástupce" value={editing.vazany_zastupce_of ?? ''} onChange={(v) => handleField('vazany_zastupce_of', v)} hint='Např. "SAB servis s.r.o."' />
            <Field label="Role label" value={editing.role_label ?? ''} onChange={(v) => handleField('role_label', v)} hint='Např. "Hypoteční specialista · Quadrum"' />
            <Field label="ČNB JERRS ID" value={editing.cnb_license_id ?? ''} onChange={(v) => handleField('cnb_license_id', v)} />
          </div>

          <Textarea
            label="Krátký popis (na vizitku)"
            value={editing.short_description ?? ''}
            onChange={(v) => handleField('short_description', v)}
            rows={3}
            hint="2-3 věty, viditelné na vizitce v chatu."
          />

          <Field
            label="Specializace (tagy na vizitce)"
            value={(editing.specializations ?? []).join(', ')}
            onChange={(v) => handleArrayField('specializations', v)}
            hint='Oddělené čárkou, např. "Hypotéky, Investice, OSVČ"'
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vertical tags (matching)</label>
            <div className="flex gap-3 flex-wrap">
              {VERTICAL_OPTIONS.map((v) => {
                const checked = (editing.vertical_tags ?? []).includes(v);
                return (
                  <label key={v} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const cur = editing.vertical_tags ?? [];
                        const next = e.target.checked ? [...cur, v] : cur.filter((x) => x !== v);
                        handleField('vertical_tags', next);
                      }}
                    />
                    <span>{v}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Které vertikály broker reálně řeší. Routing matching používá právě tato pole.</p>
          </div>

          <Textarea
            label="Bio (delší životopis)"
            value={editing.bio ?? ''}
            onChange={(v) => handleField('bio', v)}
            rows={3}
          />

          <Textarea
            label="Legal disclosure"
            value={editing.legal_disclosure ?? ''}
            onChange={(v) => handleField('legal_disclosure', v)}
            rows={2}
            hint="Text pro disclosure dle § 257/2016 (volitelné — defaultní text se použije, pokud prázdné)."
          />

          <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) => handleField('is_active', e.target.checked)}
              />
              <span>Aktivní</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.accepts_leads ?? true}
                onChange={(e) => handleField('accepts_leads', e.target.checked)}
              />
              <span>Přijímá leady</span>
            </label>
            <div className="flex-1" />
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Uložit
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[11px]">
            <tr>
              <th className="text-left px-4 py-3">Broker</th>
              <th className="text-left px-4 py-3">Vertikály</th>
              <th className="text-left px-4 py-3">Zdroj</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Akce</th>
            </tr>
          </thead>
          <tbody>
            {brokers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Žádní brokeři. Klikni „Nový broker&ldquo; výše.
                </td>
              </tr>
            )}
            {brokers.map((b) => (
              <tr key={b.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{b.display_name}</div>
                  <div className="text-xs text-gray-500">{b.email} · {b.phone}</div>
                  <div className="text-xs text-gray-400">{b.role_label}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {b.vertical_tags.map((v) => (
                      <span key={v} className="px-2 py-0.5 text-[10px] rounded-full bg-violet-50 text-violet-700">{v}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{b.source}</td>
                <td className="px-4 py-3">
                  {b.is_active && b.accepts_leads ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">aktivní</span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">neaktivní</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => setEditing(b)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Upravit
                  </button>
                  {b.is_active && (
                    <button
                      onClick={() => handleDeactivate(b)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700"
                    >
                      <Trash2 className="w-3 h-3 inline-block" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 3, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 font-mono"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
