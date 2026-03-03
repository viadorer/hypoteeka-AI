'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatArea } from "@/components/chat/ChatArea";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { NewsView } from "@/components/news/NewsView";
import { useAuth } from '@/lib/auth/auth-context';
import { getBrowserId } from '@/lib/browser-id';

type View = 'chat' | 'dashboard' | 'news';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>('chat');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const autoRestoreDone = useRef(false);

  // Auto-restore last session when user is identified
  useEffect(() => {
    if (authLoading || autoRestoreDone.current) return;
    autoRestoreDone.current = true;

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'hypoteeka';
    const params = new URLSearchParams({ tenantId });

    if (user) {
      params.set('userId', user.id);
      params.set('authorId', getBrowserId());
    } else {
      params.set('authorId', getBrowserId());
    }

    fetch(`/api/sessions?${params}`)
      .then(r => r.json())
      .then((sessions: Array<{ id: string; state: { turnCount: number }; updatedAt: string }>) => {
        const recent = sessions.find(s => {
          if (s.state.turnCount <= 0) return false;
          const age = Date.now() - new Date(s.updatedAt).getTime();
          return age < 24 * 60 * 60 * 1000;
        });
        if (recent) {
          setActiveSessionId(recent.id);
          setSessionKey(k => k + 1);
        }
      })
      .catch(() => {});
  }, [authLoading, user]);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setView('dashboard');
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setView('chat');
    setSessionKey(k => k + 1);
  }, []);

  const handleContinueChat = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setView('chat');
    setSessionKey(k => k + 1);
  }, []);

  const handleShowNews = useCallback(() => {
    setView('news');
  }, []);

  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSessionId={activeSessionId}
        currentView={view}
        onSelectSession={handleSelectSession}
        onContinueChat={handleContinueChat}
        onNewChat={handleNewChat}
        onShowNews={handleShowNews}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
      />
      {view === 'chat' && (
        <ChatArea
          key={sessionKey}
          initialSessionId={activeSessionId}
          onOpenSidebar={handleOpenSidebar}
        />
      )}
      {view === 'dashboard' && activeSessionId && (
        <Dashboard
          sessionId={activeSessionId}
          onContinueChat={handleContinueChat}
          onNewChat={handleNewChat}
        />
      )}
      {view === 'news' && (
        <NewsView />
      )}
    </div>
  );
}
