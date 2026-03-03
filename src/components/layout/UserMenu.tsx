'use client';

import { useState, useRef, useEffect } from 'react';
import { User, LogIn, LogOut, KeyRound, Pencil, Save, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

type AuthView = 'none' | 'login' | 'signup' | 'change-password' | 'edit-profile';

export function UserMenu() {
  const { user, profile, login, signup, loginWithOAuth, logout, changePassword, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('none');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState('');
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ displayName: '', phone: '', city: '' });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAuthView('none');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resetAuth = () => {
    setAuthError('');
    setAuthSuccess('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setOauthLoading(null);
  };

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.name
      ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      : user?.email
        ? user.email[0].toUpperCase()
        : null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) resetAuth(); }}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:ring-2 hover:ring-gray-200"
        style={user ? { backgroundColor: '#E91E63', color: 'white' } : undefined}
      >
        {user ? (
          <span className="text-xs font-bold">{initials}</span>
        ) : (
          <User className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {user ? (
            <div>
              {/* User info */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {profile?.displayName ?? user.name ?? user.email}
                </p>
                {user.email && profile?.displayName && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                )}
                {(profile?.phone || profile?.city) && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {[profile.phone, profile.city].filter(Boolean).join(' / ')}
                  </p>
                )}
              </div>

              {authView === 'edit-profile' ? (
                <div className="p-4 space-y-2">
                  <input
                    type="text"
                    placeholder="Jméno"
                    value={profileForm.displayName}
                    onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400"
                  />
                  <input
                    type="tel"
                    placeholder="Telefon"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Město"
                    value={profileForm.city}
                    onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const body: Record<string, string> = {};
                        if (profileForm.displayName) body.displayName = profileForm.displayName;
                        if (profileForm.phone) body.phone = profileForm.phone;
                        if (profileForm.city) body.city = profileForm.city;
                        await fetch('/api/profile', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(body),
                        });
                        await refreshProfile();
                        setAuthView('none');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" /> Uložit
                    </button>
                    <button
                      onClick={() => setAuthView('none')}
                      className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : authView === 'change-password' ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthLoading(true);
                    setAuthError('');
                    setAuthSuccess('');
                    try {
                      const res = await changePassword(authPassword);
                      if (res.error) { setAuthError(res.error); }
                      else { setAuthSuccess('Heslo změněno.'); setTimeout(() => { setAuthView('none'); setOpen(false); }, 1500); }
                    } finally { setAuthLoading(false); }
                  }}
                  className="p-4 space-y-2"
                >
                  <input
                    type="password"
                    placeholder="Nové heslo"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400"
                  />
                  {authError && <p className="text-xs text-red-500">{authError}</p>}
                  {authSuccess && <p className="text-xs text-green-600">{authSuccess}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={authLoading} className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:bg-gray-200 transition-all">
                      {authLoading ? '...' : 'Změnit'}
                    </button>
                    <button type="button" onClick={() => setAuthView('none')} className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50">Zpět</button>
                  </div>
                </form>
              ) : (
                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileForm({
                        displayName: profile?.displayName ?? user.name ?? '',
                        phone: profile?.phone ?? '',
                        city: profile?.city ?? '',
                      });
                      setAuthView('edit-profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                    Upravit profil
                  </button>
                  <button
                    onClick={() => { setAuthView('change-password'); resetAuth(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <KeyRound className="w-4 h-4" />
                    Změnit heslo
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { logout(); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Odhlásit se
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Not logged in */}
              {authView === 'none' ? (
                <div className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Přihlášení</p>
                  <button
                    onClick={async () => { setOauthLoading('google'); setAuthError(''); const r = await loginWithOAuth('google'); if (r.error) { setAuthError(r.error); setOauthLoading(null); } }}
                    disabled={!!oauthLoading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    {oauthLoading === 'google' ? 'Přesměrování...' : 'Pokračovat přes Google'}
                  </button>
                  {authError && <p className="text-xs text-red-500">{authError}</p>}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400">nebo</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <button
                    onClick={() => { setAuthView('login'); resetAuth(); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Přihlásit se e-mailem
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthLoading(true);
                    setAuthError('');
                    setAuthSuccess('');
                    try {
                      if (authView === 'login') {
                        const res = await login(authEmail, authPassword);
                        if (res.error) { setAuthError(res.error); } else { setAuthView('none'); setOpen(false); }
                      } else if (authView === 'signup') {
                        const res = await signup(authEmail, authPassword, authName || undefined);
                        if (res.error) { setAuthError(res.error); }
                        else if (res.needsConfirmation) { setAuthSuccess('Ověřte svůj e-mail.'); }
                        else { setAuthView('none'); setOpen(false); }
                      }
                    } finally { setAuthLoading(false); }
                  }}
                  className="p-4 space-y-2"
                >
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    {authView === 'login' ? 'Přihlášení' : 'Registrace'}
                  </p>
                  {authView === 'signup' && (
                    <input
                      type="text"
                      placeholder="Jméno"
                      value={authName}
                      onChange={e => setAuthName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400"
                    />
                  )}
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400"
                  />
                  <input
                    type="password"
                    placeholder="Heslo"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400"
                  />
                  {authError && <p className="text-xs text-red-500">{authError}</p>}
                  {authSuccess && <p className="text-xs text-green-600">{authSuccess}</p>}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:bg-gray-200 transition-all"
                  >
                    {authLoading ? '...' : authView === 'login' ? 'Přihlásit' : 'Registrovat'}
                  </button>
                  {authView === 'login' && (
                    <button type="button" onClick={() => { setAuthView('signup'); resetAuth(); }} className="w-full text-[11px] text-gray-400 py-0.5">
                      Nemáte účet? Registrace
                    </button>
                  )}
                  {authView === 'signup' && (
                    <button type="button" onClick={() => { setAuthView('login'); resetAuth(); }} className="w-full text-[11px] text-gray-400 py-0.5">
                      Máte účet? Přihlášení
                    </button>
                  )}
                  <button type="button" onClick={() => setAuthView('none')} className="w-full text-[11px] text-gray-400 py-0.5">
                    Zpět
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
