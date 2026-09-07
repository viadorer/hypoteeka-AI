'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

/** Kam se po přihlášení vrátit. Jen relativní cesta v rámci webu —
 *  absolutní URL z parametru by šla zneužít k přesměrování jinam. */
function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeRedirect(params.get('redirect'));
  const { login, loginWithOAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(email, password);
      if (res.error) setError(res.error);
      else router.push(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[400px] mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-on-surface mb-1">Přihlášení</h1>
      <p className="text-sm text-on-surface-variant mb-6">
        Přihlaste se a uvidíte své výpočty a rozpracované hypotéky.
      </p>

      <button
        onClick={async () => {
          setOauthLoading(true);
          setError('');
          const r = await loginWithOAuth('google');
          if (r.error) {
            setError(r.error);
            setOauthLoading(false);
          }
        }}
        disabled={oauthLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-surface border border-outline-variant/40 hover:bg-surface-container transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {oauthLoading ? 'Přesměrování…' : 'Pokračovat přes Google'}
      </button>

      <div className="flex items-center gap-2 my-5">
        <div className="flex-1 h-px bg-outline-variant/30" />
        <span className="text-xs text-on-surface-variant">nebo e-mailem</span>
        <div className="flex-1 h-px bg-outline-variant/30" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          autoComplete="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-outline-variant/40 text-sm outline-none focus:border-primary bg-surface"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Heslo"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 rounded-xl border border-outline-variant/40 text-sm outline-none focus:border-primary bg-surface"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Přihlašuji…' : 'Přihlásit se'}
        </button>
      </form>
    </div>
  );
}
