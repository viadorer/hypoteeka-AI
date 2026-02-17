'use client';

import { useState } from 'react';
import { useAdmin } from './layout';
import { Settings, MessageSquare, BookOpen, Palette, Layout } from 'lucide-react';
import { TenantSettings } from './components/TenantSettings';
import { PromptEditor } from './components/PromptEditor';
import { StyleEditor } from './components/StyleEditor';
import { KnowledgeEditor } from './components/KnowledgeEditor';
import { WelcomeEditor } from './components/WelcomeEditor';

type Tab = 'tenant' | 'prompts' | 'styles' | 'knowledge' | 'welcome';

const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: 'tenant', label: 'Tenant', icon: Settings },
  { id: 'welcome', label: 'Welcome', icon: Layout },
  { id: 'prompts', label: 'Prompty', icon: MessageSquare },
  { id: 'styles', label: 'Tón komunikace', icon: Palette },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
];

export default function AdminPage() {
  const { activeTenant } = useAdmin();
  const [tab, setTab] = useState<Tab>('tenant');

  return (
    <div className="flex">
      {/* Sidebar nav */}
      <nav className="w-56 min-h-[calc(100vh-57px)] bg-white border-r border-gray-100 p-3 space-y-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-violet-50 text-violet-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-6 max-w-5xl">
        {tab === 'tenant' && <TenantSettings key={activeTenant} />}
        {tab === 'welcome' && <WelcomeEditor key={activeTenant} />}
        {tab === 'prompts' && <PromptEditor key={activeTenant} />}
        {tab === 'styles' && <StyleEditor key={activeTenant} />}
        {tab === 'knowledge' && <KnowledgeEditor key={activeTenant} />}
      </main>
    </div>
  );
}
