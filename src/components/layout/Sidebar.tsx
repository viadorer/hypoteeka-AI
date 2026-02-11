'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X, Plus, MessageSquare, BarChart3, FolderPlus, LogIn, UserPlus, LogOut, KeyRound, ChevronRight, User, Trash2, Newspaper } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

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

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  sessionCount: number;
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

type AuthView = 'none' | 'login' | 'signup' | 'change-password';

export function Sidebar({ activeSessionId, currentView, onSelectSession, onContinueChat, onNewChat, onShowNews }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('none');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState('');
  const { user, login, signup, logout, changePassword } = useAuth();

  // Load sessions for chat history
  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then((data: SessionSummary[]) => setSessions(data))
      .catch(() => setSessions([]));
  }, [activeSessionId]);

  // Load projects
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((data: ProjectSummary[]) => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => setProjects([]));
  }, []);

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined,
          sessionId: activeSessionId ?? undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => [{ id: data.id, name: data.name, description: newProjectDesc.trim() || undefined, sessionCount: activeSessionId ? 1 : 0, updatedAt: new Date().toISOString() }, ...prev]);
        setNewProjectName('');
        setNewProjectDesc('');
        setShowNewProject(false);
      }
    } catch { /* ignore */ }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch { /* ignore */ }
  };

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0A1E5C] tracking-tight">Hypoteeka AI</h1>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#E91E63]/10 text-[#E91E63] rounded-md">Beta</span>
            </div>
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
            Nová konzultace
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
            Konzultace
          </button>
          <button
            onClick={() => { if (activeSessionId) onSelectSession(activeSessionId); setMobileOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
              currentView === 'dashboard' ? 'bg-blue-50/80 text-[#0A1E5C]' : 'text-gray-600 hover:bg-gray-50/80'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Analýzy
          </button>
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
              projectsExpanded ? 'bg-blue-50/80 text-[#0A1E5C]' : 'text-gray-600 hover:bg-gray-50/80'
            }`}
          >
            <FolderPlus className="w-5 h-5" />
            Projekty
            {projects.length > 0 && (
              <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{projects.length}</span>
            )}
          </button>
          <button
            onClick={() => { onShowNews(); setMobileOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
              currentView === 'news' ? 'bg-blue-50/80 text-[#0A1E5C]' : 'text-gray-600 hover:bg-gray-50/80'
            }`}
          >
            <Newspaper className="w-5 h-5" />
            Novinky
          </button>
        </div>

        {/* Projects section */}
        {projectsExpanded && (
          <div className="px-4 py-2 border-t border-gray-100/50 space-y-2 max-h-[200px] overflow-y-auto">
            {projects.length === 0 && !showNewProject && (
              <p className="text-xs text-gray-300 px-1 py-1">Zatím žádné projekty.</p>
            )}
            {projects.map(p => (
              <div key={p.id} className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50/80 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  {p.description && <p className="text-[11px] text-gray-400 truncate">{p.description}</p>}
                  <p className="text-[10px] text-gray-300">{p.sessionCount} konzultací</p>
                </div>
                <button
                  onClick={() => deleteProject(p.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {showNewProject ? (
              <div className="space-y-2 px-1">
                <input
                  type="text"
                  placeholder="Název projektu *"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#E91E63]/40"
                />
                <input
                  type="text"
                  placeholder="Popis (volitelný)"
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#E91E63]/40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createProject}
                    disabled={!newProjectName.trim()}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#E91E63] hover:bg-[#C2185B] disabled:bg-gray-200 text-white text-sm font-medium transition-all"
                  >
                    Vytvořit
                  </button>
                  <button
                    onClick={() => { setShowNewProject(false); setNewProjectName(''); setNewProjectDesc(''); }}
                    className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewProject(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50/80 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nový projekt
              </button>
            )}
          </div>
        )}

        {/* Previous chats */}
        <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-gray-100/50">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Předchozí konzultace
          </p>

          {chatSessions.length === 0 && (
            <p className="text-xs text-gray-300 px-1 py-2">Zatím žádné konverzace.</p>
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
                      <span className="text-[11px] text-gray-300">{s.state.turnCount} zpráv</span>
                    </div>
                  </button>
                  {/* Quick action: view analysis */}
                  <div className="hidden group-hover:flex px-3 pb-2 -mt-1">
                    <button
                      onClick={() => handleAnalyse(s.id)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#E91E63] transition-colors"
                    >
                      <BarChart3 className="w-3 h-3" />
                      Zobrazit analýzu
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
            /* Not logged in - show buttons */
            <div className="space-y-1">
              <button
                onClick={() => { setAuthView('login'); setAuthError(''); setAuthEmail(''); setAuthPassword(''); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50/80 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Přihlásit se
              </button>
              <button
                onClick={() => { setAuthView('signup'); setAuthError(''); setAuthEmail(''); setAuthPassword(''); setAuthName(''); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50/80 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Registrace
              </button>
            </div>
          ) : (
            /* Auth form */
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
                {authView === 'login' ? 'Přihlášení' : authView === 'signup' ? 'Registrace' : 'Změna hesla'}
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
                Zrušit
              </button>
            </form>
          )}
          <p className="text-[10px] text-gray-300 text-center">Hypoteeka AI v0.4</p>
        </div>
      </aside>
    </>
  );
}
