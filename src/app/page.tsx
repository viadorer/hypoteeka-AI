'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatArea } from "@/components/chat/ChatArea";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { NewsView } from "@/components/news/NewsView";
import { LandingPage } from "@/components/landing/LandingPage";
import { useAuth } from '@/lib/auth/auth-context';
import { useTenant } from '@/lib/tenant/use-tenant';

type View = 'landing' | 'chat' | 'dashboard' | 'news';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const tenant = useTenant();
  const isValuation = tenant.features.primaryFlow === 'valuation';

  // Default view = landing pro každý / load. Re-engagement deep linky
  // (?session=xxx) přepnou na chat. Klik na CTA na landing pak otevře chat
  // přes handleStartChat.
  const [view, setView] = useState<View>('landing');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const autoRestoreDone = useRef(false);

  // Re-engagement deep link handling — pokud uživatel přijde z emailu
  // s ?session=xxx, otevřeme rovnou chat s tou session. Bez parametru
  // se vždy zobrazí landing (aby uživatel viděl hodnotu nabídky).
  useEffect(() => {
    if (authLoading || autoRestoreDone.current) return;
    autoRestoreDone.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get('session');
    if (urlSession) {
      setActiveSessionId(urlSession);
      setView('chat');
      setSessionKey(k => k + 1);
    } else if (params.get('prefill')) {
      // Prefill z kalkulačky — rovnou do chatu, ChatArea zprávu odešle sám.
      setView('chat');
      setSessionKey(k => k + 1);
    }
    // Bez deep linku zůstaneme na landingu (initial state 'landing').
    // Sidebar si načte historii sám podle potřeby, až ho uživatel otevře.
  }, [authLoading, user]);

  const handleStartChat = useCallback(() => {
    setActiveSessionId(null);
    setView('chat');
    setSessionKey(k => k + 1);
  }, []);

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

  if (view === 'landing') {
    return (
      <LandingPage
        onStartChat={handleStartChat}
        primaryColor={tenant.branding.primaryColor}
        logoUrl={tenant.branding.logoUrl ?? '/logo.png'}
        title={tenant.branding.title}
        isValuation={isValuation}
      />
    );
  }

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
