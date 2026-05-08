'use client';

import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

export function WithdrawRequestForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/consent/withdraw-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), scope: 'handoff_partner' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Chyba při odesílání');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při odesílání');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-[#0A1E5C] mb-1">Žádost přijata</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Pokud na uvedený e-mail evidujeme záznam, do několika minut obdržíte
            potvrzovací zprávu. Odkaz je platný 24 hodin. Pokud zprávu nedostanete,
            zkontrolujte složku spam nebo nás kontaktujte na info@quadrum.cz.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-[#0A1E5C] mb-1.5 block">E-mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="vase.adresa@example.cz"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-[#0A1E5C] placeholder:text-gray-400 outline-none focus:border-[#b80049]/40 focus:ring-1 focus:ring-[#b80049]/20 transition-all"
        />
      </label>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={!email.trim() || submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#b80049] hover:bg-[#9a003d] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium transition-all"
      >
        <Send className="w-4 h-4" />
        {submitting ? 'Odesílám…' : 'Odeslat potvrzovací odkaz'}
      </button>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        Odesláním tlačítka potvrzujete, že žádáte o odvolání souhlasu pro daný e-mail.
        Pokud jste tento web nikdy nepoužili, můžete tuto stránku bezpečně opustit.
      </p>
    </form>
  );
}
