'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, AlertCircle, RotateCcw, Calculator, ShieldCheck, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import ReactMarkdown from 'react-markdown';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';

const QUICK_ACTIONS = [
  { label: 'Spočítat splátku', icon: Calculator },
  { label: 'Ověřit bonitu', icon: ShieldCheck },
  { label: 'Kolik si můžu dovolit?', icon: TrendingUp },
  { label: 'Nájem vs. hypotéka', icon: Users },
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
      body: { sessionId },
    }),
  });
  const [inputValue, setInputValue] = useState('');
  const [visitorName, setVisitorName] = useState<string | null>(null);
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
        }
      })
      .catch(() => {});
  }, [sessionId, historyLoaded, setMessages]);

  // Load visitor name from any session (for new chats)
  useEffect(() => {
    if (visitorName) return;
    fetch('/api/sessions')
      .then(r => r.json())
      .then((sessions: Array<{ profile: { name?: string } }>) => {
        for (const s of sessions) {
          if (s.profile.name) {
            setVisitorName(s.profile.name.split(' ')[0]);
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
        placeholder="Napište cenu nemovitosti nebo dotaz..."
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
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen pt-16 md:pt-0 overflow-x-hidden overflow-y-auto min-w-0 w-full">
        <div className="flex-1 flex flex-col items-center px-4 md:px-4 py-8 md:py-12 w-full min-w-0">

          {/* Hero - short and clear */}
          <div className="text-center mb-6 max-w-md">
            <h1 className="text-[26px] md:text-3xl font-extrabold text-[#0A1E5C] tracking-tight mb-2">
              {visitorName
                ? `Zdravím, ${visitorName}!`
                : 'Spočítejte si hypotéku'}
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              {visitorName
                ? 'Pokračujte nebo začněte novou kalkulaci.'
                : 'Zadejte parametry a za minutu víte, na co dosáhnete.'}
            </p>
          </div>

          {/* Input - dominant CTA */}
          <div className="w-full max-w-[560px] mb-5 min-w-0">
            {inputBar}
            <p className="text-center text-[11px] text-gray-400 mt-2">
              např. &quot;Byt za 5 mil, mám 1 mil vlastních, příjem 60 tisíc&quot;
            </p>
          </div>

          {/* Quick action badges */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => useBadge(label)}
                disabled={isLoading}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 md:py-2 rounded-xl text-[13px] md:text-sm text-gray-500 transition-all disabled:opacity-50 active:scale-[0.97] ${glass} ${glassHover} hover:text-[#E91E63]`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Today's rates - compact inline */}
          {todayRates && todayRates.mortgage.avgRate > 0 && (
            <div className={`w-full max-w-[560px] mb-8 rounded-xl p-4 min-w-0 ${glass}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#E91E63]" />
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Sazby dnes</p>
                </div>
                <p className="text-[10px] text-gray-400">{todayRates.date}</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Repo ČNB</p>
                  <p className="text-base font-bold text-[#0A1E5C]">{todayRates.cnb.repo} %</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Fix 1-5 let</p>
                  <p className="text-base font-bold text-[#0A1E5C]">{todayRates.mortgage.rateFix5y} %</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Fix 5-10 let</p>
                  <p className="text-base font-bold text-[#0A1E5C]">{todayRates.mortgage.rateFix10y} %</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">RPSN</p>
                  <p className="text-base font-bold text-[#0A1E5C]">{todayRates.mortgage.rpsn} %</p>
                </div>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-2.5">
                Průměr trhu dle ČNB -- Díky exkluzivním smlouvám nabízíme výhodnější podmínky
              </p>
            </div>
          )}

          {/* What we do - compact feature strip */}
          <div className="w-full max-w-[560px] mb-8 min-w-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col items-center text-center gap-1.5 py-3">
                <Calculator className="w-5 h-5 text-[#E91E63]" />
                <p className="text-[12px] font-medium text-gray-700">Splátka a bonita</p>
                <p className="text-[10px] text-gray-400 leading-tight">Výpočet dle ČNB 2026</p>
              </div>
              <div className="flex flex-col items-center text-center gap-1.5 py-3">
                <BarChart3 className="w-5 h-5 text-[#E91E63]" />
                <p className="text-[12px] font-medium text-gray-700">Sazby 8+ bank</p>
                <p className="text-[10px] text-gray-400 leading-tight">Live data z ČNB</p>
              </div>
              <div className="flex flex-col items-center text-center gap-1.5 py-3">
                <ShieldCheck className="w-5 h-5 text-[#E91E63]" />
                <p className="text-[12px] font-medium text-gray-700">Limity ČNB</p>
                <p className="text-[10px] text-gray-400 leading-tight">LTV, DSTI, DTI</p>
              </div>
              <div className="flex flex-col items-center text-center gap-1.5 py-3">
                <Users className="w-5 h-5 text-[#E91E63]" />
                <p className="text-[12px] font-medium text-gray-700">Osobní poradce</p>
                <p className="text-[10px] text-gray-400 leading-tight">Konzultace zdarma</p>
              </div>
            </div>
          </div>

          {/* Banks */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mb-6 max-w-[560px]">
            {BANKS.map((bank) => (
              <span key={bank} className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                {bank}
              </span>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-gray-400 max-w-md">
            Metodika ČNB 2026, live data z ČNB ARAD. Výsledky jsou orientační. Data nejsou sdílena třetím stranám.
          </p>
        </div>
      </div>
    );
  }

  // =============================================
  // CHAT VIEW (after conversation starts)
  // =============================================
  return (
    <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen pt-16 md:pt-0 overflow-x-hidden min-w-0">
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
      <div className="fixed bottom-0 left-0 right-0 md:left-[260px] z-50">
        <div className="bg-gradient-to-t from-[#F5F7FA] via-[#F5F7FA]/95 to-transparent backdrop-blur-md">
          <div className="max-w-[640px] mx-auto px-4 md:px-6 pt-4 pb-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {inputBar}
            <p className="text-center text-[11px] text-gray-400 mt-2">
              Hypoteeka AI -- metodika ČNB 2026, live PRIBOR. Výsledky jsou orientační.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
