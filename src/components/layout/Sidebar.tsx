'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X, Plus, MessageSquare, BarChart3, LogIn, LogOut, KeyRound, User, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenant } from '@/lib/tenant/use-tenant';
import { getBrowserId } from '@/lib/browser-id';

interface SessionSummary {
  id: string;
  profile: {
    propertyPrice?: number;
    propertyType?: string;
    location?: string;
    purpose?: string;
    equity?: number;
    monthlyIncome?: number;
    name?: string;
    email?: string;
    phone?: string;
  };
  state: {
    phase: string;
    leadScore: number;
    leadQualified: boolean;
    leadCaptured: boolean;
    turnCount: number;
    widgetsShown: string[];
    dataCollected: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  activeSessionId: string | null;
  currentView: 'chat' | 'dashboard' | 'news';
  onSelectSession: (sessionId: string) => void;
  onContinueChat: (sessionId: string) => void;
  onNewChat: () => void;
  onShowNews: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString('cs-CZ');
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'právě teď';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

function chatTitle(s: SessionSummary): string {
  if (s.profile.propertyPrice) return `${fmt(s.profile.propertyPrice)} Kč`;
  if (s.profile.name) return s.profile.name;
  const parts = [s.profile.propertyType, s.profile.location].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return `Chat ${s.id.slice(0, 6)}`;
}

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    greeting: 'Začátek',
    discovery: 'Sběr dat',
    analysis: 'Analýza',
    qualification: 'Kvalifikace',
    conversion: 'Konverze',
    followup: 'Dokončeno',
  };
  return map[phase] ?? phase;
}

function leadBadge(score: number, qualified: boolean, captured: boolean): { label: string; color: string } {
  if (captured) return { label: 'Lead', color: 'bg-green-100 text-green-700' };
  if (qualified) return { label: 'Kvalifikovaný', color: 'bg-emerald-100 text-emerald-700' };
  if (score >= 61) return { label: 'Hot', color: 'bg-orange-100 text-orange-700' };
  if (score >= 31) return { label: 'Warm', color: 'bg-amber-100 text-amber-700' };
  return { label: '', color: '' };
}

function sessionSubtitle(s: SessionSummary): string {
  const parts: string[] = [];
  if (s.profile.purpose) {
    const purposeMap: Record<string, string> = { 'vlastni_bydleni': 'Vlastní bydlení', 'investice': 'Investice', 'refinancovani': 'Refinancování' };
    parts.push(purposeMap[s.profile.purpose] ?? s.profile.purpose);
  }
  if (s.profile.location) parts.push(s.profile.location);
  if (s.profile.propertyType) {
    const typeMap: Record<string, string> = { 'byt': 'Byt', 'dum': 'Dům', 'pozemek': 'Pozemek' };
    parts.push(typeMap[s.profile.propertyType] ?? s.profile.propertyType);
  }
  return parts.join(' / ');
}

type AuthView = 'none' | 'login' | 'signup' | 'change-password';

export function Sidebar({ activeSessionId, currentView, onSelectSession, onContinueChat, onNewChat, onShowNews }: SidebarProps) {
  const tenant = useTenant();
  const isValuation = tenant.features.primaryFlow === 'valuation';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [hiddenSessions, setHiddenSessions] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('hiddenSessions');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [authView, setAuthView] = useState<AuthView>('none');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState('');
  const { user, login, signup, loginWithOAuth, logout, changePassword } = useAuth();
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Load sessions for chat history (filtered by tenant + author)
  useEffect(() => {
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'hypoteeka';
    const authorId = getBrowserId();
    fetch(`/api/sessions?tenantId=${tenantId}&authorId=${authorId}`)
      .then(r => r.json())
      .then((data: SessionSummary[]) => setSessions(data))
      .catch(() => setSessions([]));
  }, [activeSessionId]);


  const handleContinue = (id: string) => {
    onContinueChat(id);
    setMobileOpen(false);
  };

  const handleAnalyse = (id: string) => {
    onSelectSession(id);
    setMobileOpen(false);
  };

  const hideSession = (id: string) => {
    const next = new Set(hiddenSessions);
    next.add(id);
    setHiddenSessions(next);
    try { localStorage.setItem('hiddenSessions', JSON.stringify([...next])); } catch { /* ignore */ }
  };

  // Filter: only sessions with at least 1 turn and not hidden
  const chatSessions = sessions.filter(s => s.state.turnCount > 0 && !hiddenSessions.has(s.id));

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60 px-4 py-2.5 flex items-center gap-3" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-1 rounded-xl active:bg-gray-100 transition-colors">
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <div className="w-11 h-11 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
          <Image src={tenant.branding.logoUrl ?? '/logo.png'} alt={tenant.branding.title} width={28} height={28} className="object-contain" />
        </div>
        <h1 className="text-lg font-extrabold text-[#0A1E5C] tracking-tight">{tenant.branding.title}</h1>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-[min(320px,85vw)] md:w-[320px] bg-white/70 backdrop-blur-2xl border-r border-white/40 flex flex-col z-50
        transition-transform duration-300 ease-out
        md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
              <Image src={tenant.branding.logoUrl ?? '/logo.png'} alt={tenant.branding.title} width={30} height={30} className="object-contain" />
            </div>
            <h1 className="text-xl font-extrabold text-[#0A1E5C] tracking-tight">{tenant.branding.title}</h1>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-4 mb-4">
          <button
            onClick={() => { onNewChat(); setMobileOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-white transition-colors shadow-sm"
            style={{ backgroundColor: tenant.branding.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            {isValuation ? 'Nový odhad' : 'Nová konzultace'}
          </button>
        </div>

        {/* Nav items */}
        <div className="px-4 space-y-1 mb-3">
          <button
            onClick={() => { onNewChat(); setMobileOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-base font-medium transition-all ${
              currentView === 'chat' ? 'bg-blue-50/80 text-[#0A1E5C]' : 'text-gray-600 hover:bg-gray-50/80'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {isValuation ? 'Odhady' : 'Konzultace'}
          </button>
        </div>

        {/* Previous chats */}
        <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-gray-100/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            {isValuation ? 'Předchozí odhady' : 'Předchozí konzultace'}
          </p>

          {chatSessions.length === 0 && (
            <p className="text-sm text-gray-300 px-1 py-2">Zatím žádné konverzace.</p>
          )}

          <div className="space-y-1.5">
            {chatSessions.map((s) => {
              const isActive = activeSessionId === s.id;
              const title = chatTitle(s);
              const subtitle = sessionSubtitle(s);
              const badge = leadBadge(s.state.leadScore, s.state.leadQualified, s.state.leadCaptured);
              const hasContact = !!(s.profile.email || s.profile.phone);
              const hasName = !!s.profile.name;
              return (
                <div
                  key={s.id}
                  className={`group rounded-xl transition-all ${
                    isActive ? 'bg-[#E91E63]/5 ring-1 ring-[#E91E63]/20' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <button
                    onClick={() => handleContinue(s.id)}
                    className="w-full text-left px-3 py-2.5 cursor-pointer"
                  >
                    {/* Row 1: Title + time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[15px] font-medium truncate ${isActive ? 'text-[#E91E63]' : 'text-gray-800'}`}>
                        {hasName ? s.profile.name : title}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {timeAgo(s.updatedAt)}
                      </span>
                    </div>
                    {/* Row 2: Price + subtitle */}
                    {(hasName && s.profile.propertyPrice) && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {fmt(s.profile.propertyPrice)} Kc
                      </p>
                    )}
                    {subtitle && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{subtitle}</p>
                    )}
                    {/* Row 3: Badges */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {/* Phase */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        s.state.phase === 'followup' ? 'bg-green-50 text-green-600' :
                        s.state.phase === 'conversion' ? 'bg-blue-50 text-blue-600' :
                        s.state.phase === 'qualification' ? 'bg-purple-50 text-purple-600' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {phaseLabel(s.state.phase)}
                      </span>
                      {/* Lead badge */}
                      {badge.label && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                      {/* Contact indicator */}
                      {hasContact && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-green-50 text-green-600">
                          {s.profile.email ? 'Email' : 'Tel'}
                        </span>
                      )}
                      {/* Widget count */}
                      {s.state.widgetsShown.length > 0 && (
                        <span className="text-[10px] text-gray-300">
                          {s.state.widgetsShown.length} vypoctu
                        </span>
                      )}
                    </div>
                  </button>
                  {/* Quick actions on hover */}
                  <div className="hidden group-hover:flex items-center gap-2 px-3 pb-2 -mt-0.5">
                    <button
                      onClick={() => handleAnalyse(s.id)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#E91E63] transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Analyza
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); hideSession(s.id); }}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auth section */}
        <div className="p-4 pt-2 border-t border-gray-100/50 space-y-2">
          {user ? (
            /* Logged in */
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700">
                <User className="w-4 h-4 text-[#E91E63]" />
                <span className="truncate font-medium">{user.name ?? user.email}</span>
              </div>
              <button
                onClick={() => { setAuthView('change-password'); setAuthError(''); setAuthSuccess(''); setAuthPassword(''); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-all"
              >
                <KeyRound className="w-4 h-4" />
                Změnit heslo
              </button>
              <button
                onClick={() => { logout(); setAuthView('none'); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Odhlásit se
              </button>
            </div>
          ) : authView === 'none' ? (
            /* Not logged in - OAuth first, email as fallback */
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-1">Přihlášení</p>
              {/* OAuth buttons */}
              <button
                onClick={async () => { setOauthLoading('google'); setAuthError(''); const r = await loginWithOAuth('google'); if (r.error) { setAuthError(r.error); setOauthLoading(null); } }}
                disabled={!!oauthLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {oauthLoading === 'google' ? 'Přesměrování...' : 'Pokračovat přes Google'}
              </button>
              <button
                onClick={async () => { setOauthLoading('facebook'); setAuthError(''); const r = await loginWithOAuth('facebook'); if (r.error) { setAuthError(r.error); setOauthLoading(null); } }}
                disabled={!!oauthLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-[#1877F2] hover:bg-[#166FE5] transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                {oauthLoading === 'facebook' ? 'Přesměrování...' : 'Pokračovat přes Facebook'}
              </button>
              <button
                onClick={async () => { setOauthLoading('apple'); setAuthError(''); const r = await loginWithOAuth('apple'); if (r.error) { setAuthError(r.error); setOauthLoading(null); } }}
                disabled={!!oauthLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-black hover:bg-gray-900 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                {oauthLoading === 'apple' ? 'Přesměrování...' : 'Pokračovat přes Apple'}
              </button>
              {authError && <p className="text-xs text-red-500 px-1">{authError}</p>}
              {/* Email fallback */}
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] text-gray-400">nebo</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={() => { setAuthView('login'); setAuthError(''); setAuthEmail(''); setAuthPassword(''); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50/80 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Přihlásit se e-mailem
              </button>
            </div>
          ) : (
            /* Auth form (email/password) */
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthLoading(true);
                setAuthError('');
                setAuthSuccess('');
                try {
                  if (authView === 'login') {
                    const res = await login(authEmail, authPassword);
                    if (res.error) { setAuthError(res.error); } else { setAuthView('none'); }
                  } else if (authView === 'signup') {
                    const res = await signup(authEmail, authPassword, authName || undefined);
                    if (res.error) { setAuthError(res.error); }
                    else if (res.needsConfirmation) { setAuthSuccess('Ověřte svůj e-mail.'); }
                    else { setAuthView('none'); }
                  } else if (authView === 'change-password') {
                    const res = await changePassword(authPassword);
                    if (res.error) { setAuthError(res.error); }
                    else { setAuthSuccess('Heslo změněno.'); setTimeout(() => setAuthView('none'), 1500); }
                  }
                } finally { setAuthLoading(false); }
              }}
              className="space-y-2"
            >
              <p className="text-xs font-medium text-gray-600 px-1">
                {authView === 'login' ? 'Přihlášení e-mailem' : authView === 'signup' ? 'Registrace' : 'Změna hesla'}
              </p>
              {authView === 'signup' && (
                <input
                  type="text"
                  placeholder="Jméno"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#E91E63]/40"
                />
              )}
              {authView !== 'change-password' && (
                <input
                  type="email"
                  placeholder="E-mail"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#E91E63]/40"
                />
              )}
              <input
                type="password"
                placeholder={authView === 'change-password' ? 'Nové heslo' : 'Heslo'}
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#E91E63]/40"
              />
              {authError && <p className="text-xs text-red-500 px-1">{authError}</p>}
              {authSuccess && <p className="text-xs text-green-600 px-1">{authSuccess}</p>}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full px-3 py-2 rounded-lg bg-[#E91E63] hover:bg-[#C2185B] disabled:bg-gray-200 text-white text-sm font-medium transition-all"
              >
                {authLoading ? '...' : authView === 'login' ? 'Přihlásit' : authView === 'signup' ? 'Registrovat' : 'Změnit'}
              </button>
              {authView === 'login' && (
                <button type="button" onClick={() => { setAuthView('signup'); setAuthError(''); }} className="w-full text-[11px] text-gray-400 py-0.5">
                  Nemáte účet? Registrace
                </button>
              )}
              {authView === 'signup' && (
                <button type="button" onClick={() => { setAuthView('login'); setAuthError(''); }} className="w-full text-[11px] text-gray-400 py-0.5">
                  Máte účet? Přihlášení
                </button>
              )}
              <button type="button" onClick={() => setAuthView('none')} className="w-full text-[11px] text-gray-400 py-0.5">
                Zpět
              </button>
            </form>
          )}
          <p className="text-[10px] text-gray-300 text-center">Hypoteeka AI v0.5</p>
        </div>
      </aside>
    </>
  );
}
