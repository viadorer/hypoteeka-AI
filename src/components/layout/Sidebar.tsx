'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X, Plus, MessageSquare, BarChart3, LogIn, UserPlus, ChevronRight } from 'lucide-react';

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
  currentView: 'chat' | 'dashboard';
  onSelectSession: (sessionId: string) => void;
  onContinueChat: (sessionId: string) => void;
  onNewChat: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString('cs-CZ');
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'prave ted';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

function chatTitle(s: SessionSummary): string {
  if (s.profile.propertyPrice) return `${fmt(s.profile.propertyPrice)} Kc`;
  if (s.profile.name) return s.profile.name;
  const parts = [s.profile.propertyType, s.profile.location].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return `Chat ${s.id.slice(0, 6)}`;
}

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    greeting: 'Zacatek',
    discovery: 'Sber dat',
    analysis: 'Analyza',
    qualification: 'Kvalifikace',
    conversion: 'Konverze',
    followup: 'Dokonceno',
  };
  return map[phase] ?? phase;
}

export function Sidebar({ activeSessionId, currentView, onSelectSession, onContinueChat, onNewChat }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showAuth, setShowAuth] = useState(false);

  // Load sessions for chat history
  useEffect(() => {
    fetch('/api/sessions')
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

  // Filter: only sessions with at least 1 turn
  const chatSessions = sessions.filter(s => s.state.turnCount > 0);

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60 px-4 py-2.5 flex items-center gap-3" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-1 rounded-xl active:bg-gray-100 transition-colors">
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <div className="w-11 h-11 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
          <Image src="/logo.png" alt="Hypoteeka" width={28} height={28} className="object-contain" />
        </div>
        <h1 className="text-lg font-extrabold text-[#0A1E5C] tracking-tight">Hypoteeka AI</h1>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-[260px] bg-white/70 backdrop-blur-2xl border-r border-white/40 flex flex-col z-50
        transition-transform duration-300 ease-out
        md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
              <Image src="/logo.png" alt="Hypoteeka" width={30} height={30} className="object-contain" />
            </div>
            <h1 className="text-xl font-extrabold text-[#0A1E5C] tracking-tight">Hypoteeka AI</h1>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-4 mb-4">
          <button
            onClick={() => { onNewChat(); setMobileOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-[15px] font-semibold bg-[#E91E63] text-white hover:bg-[#C2185B] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova kalkulace
          </button>
        </div>

        {/* Nav items */}
        <div className="px-4 space-y-1 mb-3">
          <button
            onClick={() => { onNewChat(); setMobileOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
              currentView === 'chat' ? 'bg-blue-50/80 text-[#0A1E5C]' : 'text-gray-600 hover:bg-gray-50/80'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Chat
          </button>
          <button
            onClick={() => { if (activeSessionId) onSelectSession(activeSessionId); setMobileOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
              currentView === 'dashboard' ? 'bg-blue-50/80 text-[#0A1E5C]' : 'text-gray-600 hover:bg-gray-50/80'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Moje analyzy
          </button>
        </div>

        {/* Previous chats */}
        <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-gray-100/50">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Predchozi chaty
          </p>

          {chatSessions.length === 0 && (
            <p className="text-xs text-gray-300 px-1 py-2">Zatim zadne konverzace.</p>
          )}

          <div className="space-y-1">
            {chatSessions.map((s) => {
              const isActive = activeSessionId === s.id;
              const title = chatTitle(s);
              return (
                <div
                  key={s.id}
                  className={`group rounded-xl transition-all ${
                    isActive ? 'bg-[#E91E63]/5' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <button
                    onClick={() => handleContinue(s.id)}
                    className="w-full text-left px-3 py-2.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium truncate ${isActive ? 'text-[#E91E63]' : 'text-gray-800'}`}>
                        {title}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                        {timeAgo(s.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] ${
                        s.state.phase === 'followup' ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {phaseLabel(s.state.phase)}
                      </span>
                      <span className="text-[11px] text-gray-300">{s.state.turnCount} zprav</span>
                    </div>
                  </button>
                  {/* Quick action: view analysis */}
                  <div className="hidden group-hover:flex px-3 pb-2 -mt-1">
                    <button
                      onClick={() => handleAnalyse(s.id)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#E91E63] transition-colors"
                    >
                      <BarChart3 className="w-3 h-3" />
                      Zobrazit analyzu
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auth section */}
        <div className="p-4 pt-2 border-t border-gray-100/50 space-y-2">
          {!showAuth ? (
            <button
              onClick={() => setShowAuth(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50/80 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Prihlasit se
            </button>
          ) : (
            <div className="space-y-1.5">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all">
                <LogIn className="w-4 h-4" />
                Prihlasit se
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all">
                <UserPlus className="w-4 h-4" />
                Registrace
              </button>
              <button
                onClick={() => setShowAuth(false)}
                className="w-full text-center text-[11px] text-gray-400 py-1"
              >
                Zrusit
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-300 text-center">Hypoteeka AI v0.4</p>
        </div>
      </aside>
    </>
  );
}
