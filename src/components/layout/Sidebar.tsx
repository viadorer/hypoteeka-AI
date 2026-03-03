'use client';

import { useState, useEffect } from 'react';
import { X, Plus, BarChart3, Trash2 } from 'lucide-react';
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
  isOpen: boolean;
  onClose: () => void;
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

export function Sidebar({ activeSessionId, currentView, onSelectSession, onContinueChat, onNewChat, onShowNews, isOpen, onClose }: SidebarProps) {
  const tenant = useTenant();
  const isValuation = tenant.features.primaryFlow === 'valuation';
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [hiddenSessions, setHiddenSessions] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('hiddenSessions');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Load sessions for chat history (filtered by tenant + author/user)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'hypoteeka';
    const authorId = getBrowserId();
    const params = new URLSearchParams({ tenantId, authorId });
    if (user) params.set('userId', user.id);
    
    fetch(`/api/sessions?${params}`)
      .then(r => r.json())
      .then((data: SessionSummary[]) => setSessions(data))
      .catch(() => setSessions([]));
  }, [activeSessionId, user]);

  const handleContinue = (id: string) => {
    onContinueChat(id);
    onClose();
  };

  const handleAnalyse = (id: string) => {
    onSelectSession(id);
    onClose();
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
      {/* Overlay backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed left-0 top-0 h-screen w-[min(300px,85vw)] bg-white/80 backdrop-blur-2xl border-r border-gray-200/60 flex flex-col z-50
        transition-transform duration-300 ease-out shadow-2xl shadow-black/10
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
            style={{ backgroundColor: tenant.branding.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            {isValuation ? 'Nový odhad' : 'Nová konzultace'}
          </button>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Previous chats */}
        <div className="flex-1 overflow-y-auto px-3 py-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-2">
            {isValuation ? 'Předchozí odhady' : 'Předchozí konzultace'}
          </p>

          {chatSessions.length === 0 && (
            <p className="text-sm text-gray-300 px-2 py-3">Zatím žádné konverzace.</p>
          )}

          <div className="space-y-0.5">
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
                    isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => handleContinue(s.id)}
                    className="w-full text-left px-3 py-2.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium truncate ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {hasName ? s.profile.name : title}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {timeAgo(s.updatedAt)}
                      </span>
                    </div>
                    {(hasName && s.profile.propertyPrice) && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {fmt(s.profile.propertyPrice)} Kč
                      </p>
                    )}
                    {subtitle && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{subtitle}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        s.state.phase === 'followup' ? 'bg-green-50 text-green-600' :
                        s.state.phase === 'conversion' ? 'bg-blue-50 text-blue-600' :
                        s.state.phase === 'qualification' ? 'bg-purple-50 text-purple-600' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {phaseLabel(s.state.phase)}
                      </span>
                      {badge.label && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                      {hasContact && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-green-50 text-green-600">
                          {s.profile.email ? 'Email' : 'Tel'}
                        </span>
                      )}
                      {s.state.widgetsShown.length > 0 && (
                        <span className="text-[10px] text-gray-300">
                          {s.state.widgetsShown.length} výpočtů
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="hidden group-hover:flex items-center gap-2 px-3 pb-2 -mt-0.5">
                    <button
                      onClick={() => handleAnalyse(s.id)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Analýza
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

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 text-center">{tenant.branding.title} v0.6</p>
        </div>
      </aside>
    </>
  );
}
