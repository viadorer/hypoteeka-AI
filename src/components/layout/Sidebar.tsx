'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X, Plus, MessageSquare, FolderOpen, Home } from 'lucide-react';

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
  onNewChat: () => void;
}

type Tab = 'chat' | 'analyses';

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

export function Sidebar({ activeSessionId, currentView, onSelectSession, onNewChat }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'analyses') {
      setLoading(true);
      fetch('/api/sessions')
        .then(r => r.json())
        .then((data: SessionSummary[]) => setSessions(data))
        .catch(() => setSessions([]))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const handleSelectSession = (id: string) => {
    onSelectSession(id);
    setMobileOpen(false);
  };

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
        <div className="px-4 mb-3">
          <button
            onClick={() => { onNewChat(); setTab('chat'); setMobileOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-[15px] font-semibold bg-[#E91E63] text-white hover:bg-[#C2185B] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nová kalkulace
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 mb-2">
          <div className="flex gap-1 bg-gray-100/60 rounded-lg p-0.5">
            <button
              onClick={() => setTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'chat' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Home className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setTab('analyses')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'analyses' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Moje analýzy
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {tab === 'chat' && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Aktivní chat</p>
              <div className={`px-3 py-3 rounded-xl text-[15px] font-semibold flex items-center gap-2.5 ${
                currentView === 'chat' ? 'bg-blue-50/80 text-[#0A1E5C]' : 'text-gray-600 hover:bg-gray-50/80'
              }`}>
                <MessageSquare className="w-5 h-5" />
                Kalkulace hypotéky
              </div>
            </div>
          )}

          {tab === 'analyses' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                Uložené analýzy ({sessions.length})
              </p>

              {loading && (
                <p className="text-sm text-gray-400 px-1 py-4 text-center">Načítám...</p>
              )}

              {!loading && sessions.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Zatím žádné analýzy.</p>
                  <p className="text-xs text-gray-300 mt-1">Začněte novou kalkulaci.</p>
                </div>
              )}

              {sessions.map((s) => {
                const isActive = activeSessionId === s.id && currentView === 'dashboard';
                const title = s.profile.propertyPrice
                  ? `${fmt(s.profile.propertyPrice)} Kč`
                  : (s.profile.name ?? `Analýza ${s.id.slice(0, 6)}`);
                const subtitle = [
                  s.profile.propertyType,
                  s.profile.location,
                ].filter(Boolean).join(', ');

                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#E91E63]/10 border border-[#E91E63]/20'
                        : 'hover:bg-white/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold text-[15px] truncate ${isActive ? 'text-[#E91E63]' : 'text-gray-900'}`}>
                        {title}
                      </span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                        {timeAgo(s.updatedAt)}
                      </span>
                    </div>
                    {subtitle && (
                      <p className="text-xs text-gray-500 mb-1.5 truncate">{subtitle}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className={`font-medium ${
                        s.state.phase === 'followup' ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {phaseLabel(s.state.phase)}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400">{s.state.turnCount} zpráv</span>
                      {s.state.leadScore > 0 && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className={`font-medium ${s.state.leadScore >= 60 ? 'text-green-600' : 'text-gray-400'}`}>
                            {s.state.leadScore} b.
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 border-t border-gray-100/50">
          <p className="text-xs text-gray-400">Hypoteeka AI v0.3</p>
        </div>
      </aside>
    </>
  );
}
