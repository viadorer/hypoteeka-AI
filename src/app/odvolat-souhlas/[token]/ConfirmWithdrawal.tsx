'use client';

import { useState } from 'react';
import { ShieldOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  token: string;
}

export function ConfirmWithdrawal({ token }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [withdrawn, setWithdrawn] = useState<number | null>(null);

  const confirm = async () => {
    if (status === 'submitting') return;
    setStatus('submitting');
    setMessage('');

    try {
      const res = await fetch('/api/consent/withdraw-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Chyba při potvrzování');
        return;
      }
      setStatus('success');
      setWithdrawn(data.withdrawn ?? 0);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Chyba při potvrzování');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-[#0A1E5C] mb-1">Souhlas byl odvolán</p>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            {(withdrawn ?? 0) > 0
              ? `Zaznamenali jsme odvolání ${withdrawn} souhlasu. Písemné potvrzení odešleme na e-mail.`
              : 'V naší evidenci jsme nenašli aktivní souhlas pro tuto adresu. Pokud se domníváte, že tomu tak není, kontaktujte nás na info@quadrum.cz.'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-[#0A1E5C] mb-1">Odkaz se nepodařilo ověřit</p>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{message}</p>
          <a
            href="/podminky/odvolat"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A1E5C] hover:bg-[#0a1e5c]/90 text-white text-sm font-medium transition-all"
          >
            Vyžádat nový odkaz
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 leading-relaxed">
        Jste si jistý/á, že chcete odvolat souhlas se zpracováním a předáním osobních údajů?
        Tato akce zastaví další zpracování pro daný účel.
      </p>
      <button
        onClick={confirm}
        disabled={status === 'submitting'}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#b80049] hover:bg-[#9a003d] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium transition-all"
      >
        <ShieldOff className="w-4 h-4" />
        {status === 'submitting' ? 'Potvrzuji…' : 'Potvrdit odvolání souhlasu'}
      </button>
    </div>
  );
}
