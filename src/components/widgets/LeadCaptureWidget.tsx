'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

interface Props {
  context?: string;
  prefilledName?: string;
  prefilledEmail?: string;
  prefilledPhone?: string;
  sessionId?: string;
}

export function LeadCaptureWidget({ context, prefilledName, prefilledEmail, prefilledPhone, sessionId }: Props) {
  const [name, setName] = useState(prefilledName ?? '');
  const [email, setEmail] = useState(prefilledEmail ?? '');
  const [phone, setPhone] = useState(prefilledPhone ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);

  const canSubmit = name.trim() && (email.trim() || phone.trim()) && gdprConsent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          context,
          sessionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Chyba pri odesilani');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri odesilani');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
        <div className="w-8 h-[3px] rounded-full bg-emerald-500 mb-4" />
        <div className="text-center py-4">
          <p className="text-lg font-semibold text-gray-900 mb-2">Děkujeme za váš zájem</p>
          <p className="text-sm text-gray-500">Náš poradce vás bude kontaktovat v nejbližším možném termínu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-[#E91E63] mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        Nezávazná konzultace
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Nechte nám na sebe kontakt a náš poradce se vám ozve. Služba je zcela zdarma.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Jméno a příjmení *"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E91E63]/40 focus:ring-1 focus:ring-[#E91E63]/20 transition-all"
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E91E63]/40 focus:ring-1 focus:ring-[#E91E63]/20 transition-all"
        />
        <input
          type="tel"
          placeholder="Telefon"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E91E63]/40 focus:ring-1 focus:ring-[#E91E63]/20 transition-all"
        />

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={gdprConsent}
            onChange={e => setGdprConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]/20 accent-[#E91E63]"
          />
          <span className="text-[11px] text-gray-500 leading-relaxed">
            Souhlasím se zpracováním osobních údajů za účelem nezávazné konzultace.
            Údaje budou použity pouze pro kontaktování naším poradcem.
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium transition-all"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Odesílám...' : 'Odeslat nezávazně'}
        </button>
      </form>
    </div>
  );
}
