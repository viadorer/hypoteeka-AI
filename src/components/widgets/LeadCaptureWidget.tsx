'use client';

import { useState } from 'react';
import { Send, Clock, CheckCircle2, Search, Phone, BarChart3 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface Props {
  context?: string;
  prefilledName?: string;
  prefilledEmail?: string;
  prefilledPhone?: string;
  sessionId?: string;
}

const CONSENT_VERSION = 'handoff-2026-05-v2';
const CONSENT_TEXT =
  'Souhlasím, aby společnost QUADRUM s.r.o. (provozovatel) zpracovala mé poskytnuté ' +
  'osobní údaje (jméno, e-mail, telefon, údaje o nemovitosti a finanční situaci) ' +
  'a předala je svému poradci v roli vázaného zástupce samostatného zprostředkovatele ' +
  'SAB servis s.r.o. (IČO 24704008), za účelem nezávazné konzultace a přípravy nabídky ' +
  'spotřebitelského úvěru dle zákona č. 257/2016 Sb. Souhlas mohu kdykoli odvolat ' +
  'na info@quadrum.cz.';

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
          consent: {
            text: CONSENT_TEXT,
            version: CONSENT_VERSION,
            scope: 'handoff_partner',
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Chyba pri odesilani');
      }

      setSubmitted(true);
      trackEvent('lead_capture_submit', { has_email: !!email.trim(), has_phone: !!phone.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri odesilani');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[#ffffff] rounded-2xl p-4 md:p-6 shadow-[0_20px_50px_rgba(0,26,65,0.08)] border border-[#e4bdc2]/10 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
        <div className="w-8 h-[3px] rounded-full bg-emerald-500 mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[#001a41]">Děkujeme za váš zájem</p>
            <p className="text-sm text-[#001a41]/60">Vaše žádost byla úspěšně odeslána.</p>
          </div>
        </div>

        <div className="bg-[#f1f3ff] rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#001a41]/40 mb-3">
            Co bude dál
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#b80049]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Search className="w-3 h-3 text-[#b80049]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#001a41]/80">Poradce zkontroluje vaši situaci</p>
                <p className="text-xs text-[#001a41]/40">Na základě vašich dat připraví přehled možností.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#b80049]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone className="w-3 h-3 text-[#b80049]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#001a41]/80">Ozve se vám do 24 hodin</p>
                <p className="text-xs text-[#001a41]/40">Telefonicky nebo emailem, jak vám vyhovuje.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#b80049]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BarChart3 className="w-3 h-3 text-[#b80049]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#001a41]/80">Porovnáte nabídky bank</p>
                <p className="text-xs text-[#001a41]/40">Společně vyberete nejlepší řešení pro vaši situaci.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#ffffff] rounded-2xl p-4 md:p-6 shadow-[0_20px_50px_rgba(0,26,65,0.08)] border border-[#e4bdc2]/10 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-[#b80049] mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#001a41]/40 mb-1">
        Bezplatná konzultace
      </p>
      <p className="text-sm font-medium text-[#001a41] mb-1">
        Spojte se s hypotečním specialistou
      </p>
      <p className="text-sm text-[#001a41]/60 mb-3">
        Porovnáme nabídky 8+ bank a vyjednáme podmínky, které běžně nedostanete. Služba je zcela zdarma.
      </p>

      <div className="flex items-center gap-1.5 mb-4">
        <Clock className="w-3.5 h-3.5 text-[#b80049]" />
        <span className="text-xs text-[#001a41]/60">Odpověď do 24 hodin</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Jméno a příjmení *"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#e9edff] bg-white/80 text-sm text-[#001a41] placeholder:text-[#001a41]/40 outline-none focus:border-[#b80049]/40 focus:ring-1 focus:ring-[#b80049]/20 transition-all"
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#e9edff] bg-white/80 text-sm text-[#001a41] placeholder:text-[#001a41]/40 outline-none focus:border-[#b80049]/40 focus:ring-1 focus:ring-[#b80049]/20 transition-all"
        />
        <input
          type="tel"
          placeholder="Telefon"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#e9edff] bg-white/80 text-sm text-[#001a41] placeholder:text-[#001a41]/40 outline-none focus:border-[#b80049]/40 focus:ring-1 focus:ring-[#b80049]/20 transition-all"
        />

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={gdprConsent}
            onChange={e => setGdprConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-[#001a41]/30 text-[#b80049] focus:ring-[#b80049]/20 accent-[#b80049]"
          />
          <span className="text-[11px] text-[#001a41]/60 leading-relaxed">
            {CONSENT_TEXT}
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#b80049] hover:bg-[#9a003d] disabled:bg-[#e9edff] disabled:text-[#001a41]/40 text-white text-sm font-medium transition-all"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Odesílám...' : 'Chci bezplatnou konzultaci'}
        </button>
      </form>
    </div>
  );
}
