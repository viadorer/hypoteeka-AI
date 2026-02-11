'use client';

import { useState } from 'react';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hesla se neshodují.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Chyba při změně hesla.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Chyba serveru.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Heslo bylo změněno</h1>
          <p className="text-sm text-gray-500 mb-6">
            Vaše heslo bylo úspěšně aktualizováno. Nyní se můžete přihlásit.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] text-white text-sm font-medium transition-all"
          >
            Přejít na hlavní stránku
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="w-14 h-14 rounded-full bg-[#E91E63]/10 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-7 h-7 text-[#E91E63]" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">Nové heslo</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Zadejte nové heslo pro váš účet.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nové heslo</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Alespoň 6 znaků"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E91E63]/40 focus:ring-1 focus:ring-[#E91E63]/20 transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Potvrzení hesla</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Zopakujte heslo"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E91E63]/40 focus:ring-1 focus:ring-[#E91E63]/20 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password || !confirmPassword}
            className="w-full px-4 py-3 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium transition-all"
          >
            {submitting ? 'Ukládám...' : 'Nastavit nové heslo'}
          </button>
        </form>
      </div>
    </div>
  );
}
