'use client';

import { useState, useCallback } from 'react';
import { ChatArea } from "@/components/chat/ChatArea";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";

type View = 'chat' | 'dashboard';

export default function Home() {
  const [view, setView] = useState<View>('chat');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

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

  return (
    <>
      <Sidebar
        activeSessionId={activeSessionId}
        currentView={view}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />
      {view === 'chat' && (
        <ChatArea
          key={sessionKey}
          initialSessionId={activeSessionId}
        />
      )}
      {view === 'dashboard' && activeSessionId && (
        <Dashboard
          sessionId={activeSessionId}
          onContinueChat={handleContinueChat}
          onNewChat={handleNewChat}
        />
      )}
    </>
  );
}
