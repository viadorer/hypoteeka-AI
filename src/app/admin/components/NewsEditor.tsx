'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../layout';
import { Loader2, Save, Plus, Eye, EyeOff, X, ExternalLink, Trash2, Check } from 'lucide-react';

interface News {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  published: boolean;
  published_at: string;
  created_at?: string;
  updated_at?: string;
}

function emptyNews(tenantId: string): Partial<News> {
  return {
    tenant_id: tenantId,
    title: '',
    slug: '',
    summary: '',
    content: '## Nadpis\n\nObsah článku v Markdown formátu.',
    published: false,
    published_at: new Date().toISOString(),
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // odstranit diakritiku
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function NewsEditor() {
  const { activeTenant } = useAdmin();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<News> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/news?tenantId=${activeTenant}`);
      const data = await r.json();
      setNews(data.news ?? []);
    } catch {
      setError('Nepodařilo se načíst články.');
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
      const r = await fetch('/api/admin/news', {
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

  const handleTogglePublish = async (article: News) => {
    try {
      const r = await fetch('/api/admin/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id, published: !article.published }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Akce selhala');
    }
  };

  const handleHardDelete = async (article: News) => {
    if (!confirm(`Trvale smazat článek „${article.title}"? (Nelze obnovit)`)) return;
    try {
      const r = await fetch(`/api/admin/news?id=${article.id}&hard=true`, { method: 'DELETE' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Smazání selhalo');
    }
  };

  const handleField = <K extends keyof News>(key: K, value: News[K]) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  };

  const handleTitleChange = (value: string) => {
    if (!editing) return;
    const next = { ...editing, title: value };
    // Auto-slug pokud je slug prázdný nebo byl vygenerovaný z předchozího title
    if (!editing.id && (!editing.slug || editing.slug === slugify(editing.title ?? ''))) {
      next.slug = slugify(value);
    }
    setEditing(next);
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
          <h1 className="text-2xl font-bold text-gray-900">Články</h1>
          <p className="text-sm text-gray-500">Obsah pro sekci /clanky. Markdown formátování.</p>
        </div>
        <button
          onClick={() => setEditing(emptyNews(activeTenant))}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Nový článek
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
              {editing.id ? `Upravit: ${editing.title}` : 'Nový článek'}
            </h2>
            <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <Field label="Nadpis" value={editing.title ?? ''} onChange={handleTitleChange} />
          <Field
            label="Slug (URL)"
            value={editing.slug ?? ''}
            onChange={(v) => handleField('slug', v)}
            hint="Bez diakritiky, kebab-case. Auto-generován z nadpisu, můžeš přepsat."
          />
          <Textarea
            label="Perex (shrnutí)"
            value={editing.summary ?? ''}
            onChange={(v) => handleField('summary', v)}
            rows={2}
            hint="1-2 věty pod nadpisem v seznamu článků."
          />
          <Textarea
            label="Obsah (Markdown)"
            value={editing.content ?? ''}
            onChange={(v) => handleField('content', v)}
            rows={16}
            hint="Podporované: ## nadpisy, **tučné**, *kurzíva*, - seznamy, [odkazy](url)."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum publikace</label>
            <input
              type="datetime-local"
              value={(editing.published_at ?? new Date().toISOString()).slice(0, 16)}
              onChange={(e) => {
                const iso = new Date(e.target.value).toISOString();
                handleField('published_at', iso);
              }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400"
            />
          </div>

          <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.published ?? false}
                onChange={(e) => handleField('published', e.target.checked)}
              />
              <span>Publikováno</span>
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
              <th className="text-left px-4 py-3">Článek</th>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-left px-4 py-3">Datum</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Akce</th>
            </tr>
          </thead>
          <tbody>
            {news.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Žádné články.
                </td>
              </tr>
            )}
            {news.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-3 max-w-md">
                  <div className="font-medium text-gray-900 truncate">{a.title}</div>
                  {a.summary && (
                    <div className="text-xs text-gray-500 truncate">{a.summary}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{a.slug}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(a.published_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  {a.published ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      <Eye className="w-3 h-3" /> publikováno
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      <EyeOff className="w-3 h-3" /> koncept
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  {a.published && (
                    <a
                      href={`/clanky/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                      title="Otevřít článek"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => handleTogglePublish(a)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    {a.published ? 'Skrýt' : 'Publikovat'}
                  </button>
                  <button
                    onClick={() => setEditing(a)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Upravit
                  </button>
                  <button
                    onClick={() => handleHardDelete(a)}
                    className="text-xs px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700"
                    title="Trvale smazat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
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
