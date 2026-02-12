'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, AlertCircle, RotateCcw, Calculator, ShieldCheck, TrendingUp, Users, BarChart3, RefreshCw, Home, PiggyBank, Percent, HelpCircle, ArrowDownUp, Search } from 'lucide-react';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import ReactMarkdown from 'react-markdown';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';

const QUICK_ACTIONS = [
  { label: 'Spočítat splátku', icon: Calculator, prompt: 'Chci si spočítat splátku hypotéky.' },
  { label: 'Ověřit bonitu', icon: ShieldCheck, prompt: 'Chci si ověřit, jestli dosáhnu na hypotéku.' },
  { label: 'Kolik si mohu půjčit?', icon: TrendingUp, prompt: 'Kolik si mohu maximálně půjčit na hypotéku?' },
  { label: 'Nájem vs. hypotéka', icon: ArrowDownUp, prompt: 'Vyplatí se mi víc nájem nebo hypotéka?' },
  { label: 'Nejlepší sazby na trhu', icon: Percent, prompt: 'Jaké jsou aktuální nejlepší sazby hypoték na trhu?' },
  { label: 'Refinancování hypotéky', icon: RefreshCw, prompt: 'Chci refinancovat hypotéku, jaké jsou aktuální podmínky?' },
  { label: 'Koupě první nemovitosti', icon: Home, prompt: 'Kupuji první nemovitost, jak postupovat s hypotékou?' },
  { label: 'Investiční nemovitost', icon: PiggyBank, prompt: 'Chci koupit investiční nemovitost, vyplatí se to?' },
  { label: 'Ocenění nemovitosti', icon: Search, prompt: 'Chci zjistit hodnotu své nemovitosti.' },
];


const BANKS = [
  'Hypoteční banka',
  'Česká spořitelna',
  'Komerční banka',
  'ČSOB',
  'Raiffeisenbank',
  'mBank',
  'UniCredit',
  'Moneta',
];

function getSessionId(initialId: string | null): string {
  if (typeof window === 'undefined') return 'ssr';
  // If we have an explicit session to load, use it
  if (initialId) {
    sessionStorage.setItem('hypoteeka_session', initialId);
    return initialId;
  }
  // New chat - always generate a fresh session ID
  const id = uuidv4();
  sessionStorage.setItem('hypoteeka_session', id);
  return id;
}

interface ChatAreaProps {
  initialSessionId?: string | null;
}

export function ChatArea({ initialSessionId = null }: ChatAreaProps) {
  const sessionId = useMemo(() => getSessionId(initialSessionId), [initialSessionId]);
  const { messages, setMessages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { sessionId, tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? 'hypoteeka' },
    }),
  });
  const [inputValue, setInputValue] = useState('');
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [visitorNameVocative, setVisitorNameVocative] = useState<string | null>(null);
  const [todayRates, setTodayRates] = useState<{
    date: string;
    cnb: { repo: number };
    mortgage: { avgRate: number; rateFix1y: number; rateFix5y: number; rateFix10y: number; rpsn: number };
  } | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const prevStatusRef = useRef(status);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = messages.length > 0;
  const isLoading = status === 'submitted' || status === 'streaming';

  // Fetch today's rates for welcome screen
  useEffect(() => {
    fetch('/api/rates').then(r => r.json()).then(data => {
      if (data.mortgage?.avgRate > 0) setTodayRates(data);
    }).catch(() => {});
  }, []);

  // Save uiMessages after AI response completes
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted';
    const isNowReady = status === 'ready';
    prevStatusRef.current = status;
    if (wasStreaming && isNowReady && messages.length > 0) {
      fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uiMessages: messages }),
      }).catch(() => {});
    }
  }, [status, messages, sessionId]);

  // Load conversation history for existing session
  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);
    fetch(`/api/sessions/${sessionId}/messages`)
      .then(r => { if (r.ok) return r.json(); throw new Error('no session'); })
      .then((data: { uiMessages?: unknown[]; profile?: { name?: string } }) => {
        if (data.uiMessages && Array.isArray(data.uiMessages) && data.uiMessages.length > 0) {
          setMessages(data.uiMessages as Parameters<typeof setMessages>[0]);
        }
        if (data.profile?.name) {
          setVisitorName(data.profile.name.split(' ')[0]);
          setVisitorNameVocative(data.profile.name.split(' ')[0]);
        }
      })
      .catch(() => {});
  }, [sessionId, historyLoaded, setMessages]);

  // Load visitor name from any session (for new chats)
  useEffect(() => {
    if (visitorName) return;
    fetch('/api/sessions')
      .then(r => r.json())
      .then((sessions: Array<{ profile: { name?: string; nameVocative?: string } }>) => {
        for (const s of sessions) {
          if (s.profile.name) {
            const first = s.profile.name.split(' ')[0];
            setVisitorName(first);
            setVisitorNameVocative(s.profile.nameVocative ?? first);
            break;
          }
        }
      })
      .catch(() => {});
  }, [visitorName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue;
    setInputValue('');
    try { await sendMessage({ text }); } catch { /* useChat handles */ }
  };

  const useBadge = async (text: string) => {
    setInputValue('');
    try { await sendMessage({ text }); } catch { /* useChat handles */ }
  };

  const handleRetry = () => {
    clearError();
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      const text = getTextContent(lastUserMsg);
      if (text) sendMessage({ text });
    }
  };

  const getTextContent = (message: UIMessage): string => {
    if (message.parts) {
      return message.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('');
    }
    return '';
  };

  // --- GLASS STYLE CLASSES ---
  const glass = 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/[0.03]';
  const glassHover = 'hover:bg-white/80 hover:shadow-xl hover:shadow-black/[0.05] hover:border-white/60';

  // --- INPUT BAR (shared between welcome and chat) ---
  const inputBar = (
    <form onSubmit={onSubmit} className={`flex items-center rounded-2xl px-4 md:px-5 py-2 transition-all focus-within:bg-white/80 focus-within:shadow-xl focus-within:border-white/60 ${glass}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setInputValue(''); }}
        placeholder="Zeptejte se na cokoliv ohledně hypotéky..."
        className="flex-1 bg-transparent border-none outline-none text-base md:text-[15px] text-gray-900 placeholder:text-gray-400 py-3 md:py-2.5"
        autoComplete="off"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        className="w-11 h-11 md:w-10 md:h-10 rounded-xl bg-[#E91E63] hover:bg-[#C2185B] disabled:bg-gray-200 flex items-center justify-center transition-all flex-shrink-0 ml-2"
      >
        <Send className="w-[18px] h-[18px] md:w-4 md:h-4 text-white" />
      </button>
    </form>
  );

  // =============================================
  // WELCOME SCREEN (before chat starts)
  // =============================================
  if (!hasStarted) {
    return (
      <div className="flex-1 md:ml-[320px] flex flex-col min-h-screen pt-16 md:pt-0 overflow-x-hidden overflow-y-auto min-w-0 w-full">
        <div className="flex-1 flex flex-col items-center px-4 md:px-4 py-8 md:py-12 w-full min-w-0">

          {/* Test mode banner */}
          <div className="mb-6 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
            Testovaci rezim
          </div>

          {/* Hero */}
          <div className="text-center mb-8 max-w-lg">
            {!visitorName && (
              <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-[#E91E63]/20 shadow-lg mx-auto mb-4">
                <img src="/images/hugo-avatar.jpg" alt="Hugo" className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-[28px] md:text-4xl font-extrabold text-[#0A1E5C] tracking-tight mb-3">
              {visitorName
                ? `Zdravím, ${visitorNameVocative ?? visitorName}!`
                : 'Jsem Hugo, váš hypoteční poradce'}
            </h1>
            <p className="text-gray-500 text-base md:text-lg leading-relaxed">
              {visitorName
                ? 'Pokračujte tam, kde jste skončili, nebo začněte novou konzultaci.'
                : 'Spočítám splátku, ověřím bonitu a porovnám nabídky bank. Za minutu víte, na co dosáhnete.'}
            </p>
          </div>

          {/* Input */}
          <div className="w-full max-w-[560px] mb-6 min-w-0">
            {inputBar}
          </div>

          {/* Quick action badges */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
              <button
                key={label}
                onClick={() => useBadge(prompt)}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 px-4 py-3 md:py-2.5 rounded-xl text-[15px] md:text-sm text-gray-600 transition-all disabled:opacity-50 active:scale-[0.97] ${glass} ${glassHover} hover:text-[#E91E63]`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Today's rates */}
          {todayRates && todayRates.mortgage.avgRate > 0 && (
            <div className="w-full max-w-[700px] mb-10 min-w-0">
              <div className="flex items-center justify-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-[#E91E63]" />
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
                  Sazby hypoték dnes ({todayRates.date})
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`rounded-xl p-4 text-center ${glass}`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Repo ČNB</p>
                  <p className="text-xl font-bold text-[#0A1E5C]">{todayRates.cnb.repo} %</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${glass}`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Fixace 1-5 let</p>
                  <p className="text-xl font-bold text-[#0A1E5C]">{todayRates.mortgage.rateFix5y} %</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">průměr trhu</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${glass}`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Fixace 5-10 let</p>
                  <p className="text-xl font-bold text-[#0A1E5C]">{todayRates.mortgage.rateFix10y} %</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">průměr trhu</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${glass}`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">RPSN</p>
                  <p className="text-xl font-bold text-[#0A1E5C]">{todayRates.mortgage.rpsn} %</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">průměr trhu</p>
                </div>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-3">
                Zdroj: ČNB ARAD -- Díky exkluzivním smlouvám nabízíme výhodnější podmínky
              </p>
            </div>
          )}

          {/* Co všechno tady řešíme */}
          <div className="w-full max-w-[700px] mb-10 min-w-0">
            <p className="text-center text-[11px] text-gray-400 uppercase tracking-wider mb-5 font-medium">
              Co všechno tady řešíme
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <Calculator className="w-6 h-6 text-[#E91E63] mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Splátka a bonita</p>
                <p className="text-xs text-gray-400">Výpočet dle ČNB 2026</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <Percent className="w-6 h-6 text-[#E91E63] mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Nejlepší sazby</p>
                <p className="text-xs text-gray-400">Exkluzivní podmínky bank</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <RefreshCw className="w-6 h-6 text-[#E91E63] mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Refinancování</p>
                <p className="text-xs text-gray-400">Snížení splátky i sazby</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <Home className="w-6 h-6 text-[#E91E63] mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Koupě nemovitosti</p>
                <p className="text-xs text-gray-400">Od výběru po podpis</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <PiggyBank className="w-6 h-6 text-[#E91E63] mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Investice</p>
                <p className="text-xs text-gray-400">ROI, cash flow, výnos</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <ShieldCheck className="w-6 h-6 text-[#E91E63] mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Limity ČNB</p>
                <p className="text-xs text-gray-400">LTV, DSTI, DTI kontrola</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <ArrowDownUp className="w-6 h-6 text-[#E91E63] mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Nájem vs. koupě</p>
                <p className="text-xs text-gray-400">Co se víc vyplatí?</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <Users className="w-6 h-6 text-[#E91E63] mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Osobní poradce</p>
                <p className="text-xs text-gray-400">Konzultace zdarma</p>
              </div>
            </div>
          </div>

          {/* Banks */}
          <div className="w-full max-w-[700px] mb-8 min-w-0">
            <p className="text-center text-[11px] text-gray-400 uppercase tracking-wider mb-4 font-medium">
              Porovnáváme nabídky bank
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {BANKS.map((bank) => (
                <span key={bank} className="text-xs text-gray-400 font-medium whitespace-nowrap">
                  {bank}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className={`rounded-xl px-6 py-3 text-center text-[11px] text-gray-400 max-w-lg ${glass}`}>
            <p>Hypoteeka AI používá metodiku ČNB 2026 a live data z ČNB ARAD. Výsledky jsou orientační.</p>
            <p className="mt-1">Vaše data zpracováváme pouze pro účely kalkulace a nejsou sdílena třetím stranám.</p>
          </div>
        </div>
      </div>
    );
  }

  // =============================================
  // CHAT VIEW (after conversation starts)
  // =============================================
  return (
    <div className="flex-1 md:ml-[320px] flex flex-col min-h-screen pt-16 md:pt-0 overflow-x-hidden min-w-0">
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="max-w-[640px] mx-auto px-4 md:px-6 pt-4 md:pt-8 pb-44 md:pb-40 w-full min-w-0">
          {/* Messages */}
          {messages.map((message: UIMessage) => (
            <div key={message.id} className="mb-4 animate-in">
              {message.role === 'user' && (
                <div className="flex justify-end mb-2">
                  <div className="bg-[#E91E63]/90 backdrop-blur-sm text-white px-4 py-3 md:py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-base md:text-[15px] leading-relaxed shadow-lg shadow-pink-500/10 break-words overflow-hidden">
                    {getTextContent(message)}
                  </div>
                </div>
              )}

              {message.role === 'assistant' && (
                <div className="space-y-3">
                  {message.parts?.map((part, index: number) => {
                    if (part.type === 'text' && part.text) {
                      return (
                        <div key={index} className="flex justify-start mb-2">
                          <div className={`text-gray-900 px-4 py-3 md:py-2.5 rounded-2xl rounded-bl-md max-w-[85%] text-base md:text-[15px] leading-relaxed break-words overflow-hidden ${glass}
                            prose prose-sm prose-gray max-w-none
                            [&_p]:my-1 [&_p]:leading-relaxed
                            [&_strong]:text-gray-900 [&_strong]:font-semibold
                            [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4
                            [&_li]:my-0.5
                            [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#0A1E5C] [&_h2]:mt-2 [&_h2]:mb-1
                            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-2 [&_h3]:mb-1
                            [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:bg-gray-50/50 [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_th]:border [&_th]:border-gray-200
                            [&_blockquote]:border-l-2 [&_blockquote]:border-[#E91E63] [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:my-1
                            [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
                          `}>
                            <ReactMarkdown>{part.text}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    }
                    if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
                      const p = part as { type: string; toolName?: string; state: string; input?: Record<string, unknown>; output?: Record<string, unknown> };
                      const toolName = p.toolName ?? part.type.replace(/^tool-/, '');
                      if (toolName === 'update_profile' || toolName === 'get_news' || toolName === 'step-start') return null;
                      return (
                        <div key={index} className="w-full min-w-0 overflow-hidden">
                          <WidgetRenderer
                            toolInvocation={{ toolName, state: p.state, args: (p.input ?? {}) as Record<string, unknown>, output: p.output }}
                            sessionId={sessionId}
                            onSend={useBadge}
                          />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-start mb-2 animate-in">
              <div className={`text-gray-400 px-4 py-3 rounded-2xl rounded-bl-md text-sm ${glass}`}>
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-start mb-2 animate-in">
              <div className="bg-red-50/80 backdrop-blur-xl text-red-700 px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%] text-sm shadow-lg border border-red-100/50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Chyba při zpracování</p>
                    <p className="text-red-600 text-xs">
                      {error.message.includes('API key')
                        ? 'Chybí API klíč. Nastavte GOOGLE_GENERATIVE_AI_API_KEY v .env.local'
                        : 'Zkuste to prosím znovu.'}
                    </p>
                    <button onClick={handleRetry} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-800 transition-colors">
                      <RotateCcw className="w-3 h-3" />
                      Zkusit znovu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom input bar - glass */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[320px] z-50">
        <div className="bg-gradient-to-t from-[#F5F7FA] via-[#F5F7FA]/95 to-transparent backdrop-blur-md">
          <div className="max-w-[640px] mx-auto px-4 md:px-6 pt-4 pb-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {inputBar}
            <p className="text-center text-[11px] text-gray-400 mt-2">
              Hypoteeka AI -- metodika ČNB 2026, live REPO, data z ČNB. Výsledky jsou orientační.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
