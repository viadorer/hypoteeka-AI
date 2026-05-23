'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AlertCircle, RotateCcw, Calculator, ShieldCheck, TrendingUp, RefreshCw, PiggyBank, HelpCircle, Search, Phone, Menu } from 'lucide-react';
import Image from 'next/image';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import ReactMarkdown from 'react-markdown';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { CtaIntensityDial } from './CtaIntensityDial';
import type { CtaIntensity } from './CtaIntensityDial';
import { useTenant } from '@/lib/tenant/use-tenant';
import { trackEvent } from '@/lib/analytics';
import { getBrowserId } from '@/lib/browser-id';
import { useAuth } from '@/lib/auth/auth-context';
import { UserMenu } from '../layout/UserMenu';
import { ExitIntentOverlay } from './ExitIntentOverlay';
import { MobileCallFab } from './MobileCallFab';

const QUICK_ACTIONS_MORTGAGE = [
  { label: 'Spočítat splátku', icon: Calculator, materialIcon: 'calculate', prompt: 'Chci si spočítat splátku hypotéky.' },
  { label: 'Ověřit bonitu', icon: ShieldCheck, materialIcon: 'verified_user', prompt: 'Chci si ověřit, jestli dosáhnu na hypotéku.' },
  { label: 'Kolik si mohu půjčit?', icon: TrendingUp, materialIcon: 'trending_up', prompt: 'Kolik si mohu maximálně půjčit na hypotéku?' },
  { label: 'Refinancování', icon: RefreshCw, materialIcon: 'refresh', prompt: 'Chci refinancovat hypotéku, jaké jsou aktuální podmínky?' },
];

const QUICK_ACTIONS_VALUATION = [
  { label: 'Zjistit cenu', icon: Search, materialIcon: 'search', prompt: 'Chci zjistit tržní cenu své nemovitosti.' },
  { label: 'Odhad nájmu', icon: PiggyBank, materialIcon: 'savings', prompt: 'Chci zjistit, za kolik bych mohl pronajímat svou nemovitost.' },
  { label: 'Spočítat hypotéku', icon: Calculator, materialIcon: 'calculate', prompt: 'Chci si spočítat splátku hypotéky.' },
  { label: 'Poradit jinak', icon: HelpCircle, materialIcon: 'help', prompt: 'Potřebuji poradit s nemovitostí.' },
];

function getSessionId(initialId: string | null): string {
  if (typeof window === 'undefined') return 'ssr';
  if (initialId) {
    sessionStorage.setItem('hypoteeka_session', initialId);
    return initialId;
  }
  const id = uuidv4();
  sessionStorage.setItem('hypoteeka_session', id);
  return id;
}

interface ChatAreaProps {
  initialSessionId?: string | null;
  onOpenSidebar?: () => void;
}

export function ChatArea({ initialSessionId = null, onOpenSidebar }: ChatAreaProps) {
  const tenant = useTenant();
  const { user } = useAuth();
  const isValuation = tenant.features.primaryFlow === 'valuation';
  const QUICK_ACTIONS = isValuation ? QUICK_ACTIONS_VALUATION : QUICK_ACTIONS_MORTGAGE;
  const sessionId = useMemo(() => getSessionId(initialSessionId), [initialSessionId]);
  const [ctaIntensity, setCtaIntensity] = useState<CtaIntensity>('medium');
  const authorId = useMemo(() => (typeof window !== 'undefined' ? getBrowserId() : 'anonymous'), []);

  // Stable refs for dynamic body params — avoids transport recreation race conditions
  const dynamicBodyRef = useRef({ ctaIntensity, userId: user?.id });
  dynamicBodyRef.current = { ctaIntensity, userId: user?.id };

  // Create transport ONCE per session; body is a getter so it reads latest refs
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        sessionId,
        tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? 'hypoteeka',
        authorId,
        userId: dynamicBodyRef.current.userId ?? undefined,
        ctaIntensity: dynamicBodyRef.current.ctaIntensity,
      }),
    });
  }, [sessionId, authorId]);
  const { messages, setMessages, sendMessage, status, error, clearError } = useChat({ transport });
  const handleCtaChange = useCallback((v: CtaIntensity) => { setCtaIntensity(v); }, []);
  const [inputValue, setInputValue] = useState('');
  // Per-message timestamps (UIMessage z AI SDK je nenese, tracking samostatně)
  const [msgTimes, setMsgTimes] = useState<Record<string, string>>({});
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
  const greetingSentRef = useRef(false);

  const getTextContent = (message: UIMessage): string => {
    if (message.parts) {
      return message.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('');
    }
    return '';
  };

  const isGreetingOnly = messages.length <= 2 && messages.every(m =>
    (m.role === 'user' && getTextContent(m).trim() === '[GREETING]') || m.role === 'assistant'
  ) && greetingSentRef.current;
  // hasStarted = uživatel reálně něco napsal (ne jen [GREETING] sentinel)
  const hasStarted = messages.length > 0 && !isGreetingOnly;
  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    fetch('/api/rates').then(r => r.json()).then(data => {
      if (data.mortgage?.avgRate > 0) setTodayRates(data);
    }).catch(() => {});
  }, []);

  // Mobile app-like: lock body scroll when chat is mounted (no rubber band, no bounce)
  useEffect(() => {
    document.body.classList.add('chat-locked');
    return () => { document.body.classList.remove('chat-locked'); };
  }, []);

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

  // Best-practice startup flow (ChatGPT/Claude.ai pattern):
  // 1. Inject STATICKÉ Hugo greeting okamžitě (žádný LLM call, žádný setTimeout)
  // 2. Paralelně fetch /api/sessions/.../messages (history restore)
  // 3. Pokud history existuje → přepiš statické greeting historií
  // 4. LLM se volá až na první REÁLNOU user zprávu (ne na [GREETING] sentinel)
  //
  // Výsledek: Hugo bubble viditelný < 100ms místo 3-5s.
  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);

    // 1. INJECT STATIC GREETING IMMEDIATELY (no LLM, no wait)
    const staticGreeting = isValuation
      ? `Dobrý den, jsem ${tenant.agentName} — pomohu vám zjistit orientační cenu vaší nemovitosti za 2 minuty. S čím vám mohu pomoci?`
      : `Dobrý den, jsem ${tenant.agentName} — váš nezávislý průvodce hypotékami. Pomohu vám spočítat splátku, ověřit bonitu, podívat se na investiční výnos, nebo srovnat refinanc. Co teď řešíte?`;

    setMessages([
      {
        id: 'static-greeting',
        role: 'assistant',
        parts: [{ type: 'text', text: staticGreeting }],
      },
    ] as Parameters<typeof setMessages>[0]);
    greetingSentRef.current = true;

    // 2. Fetch history in parallel (no delay)
    const msgParams = new URLSearchParams({ authorId });
    if (user?.id) msgParams.set('userId', user.id);
    fetch(`/api/sessions/${sessionId}/messages?${msgParams}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no session'))))
      .then((data: { uiMessages?: unknown[]; profile?: { name?: string; nameVocative?: string } }) => {
        // 3. If history exists, overwrite static greeting with real history
        if (data.uiMessages && Array.isArray(data.uiMessages) && data.uiMessages.length > 0) {
          setMessages(data.uiMessages as Parameters<typeof setMessages>[0]);
        }
        if (data.profile?.name) {
          setVisitorName(data.profile.name.split(' ')[0]);
          setVisitorNameVocative(data.profile.nameVocative ?? data.profile.name.split(' ')[0]);
        }
      })
      .catch(() => {
        // No history available — static greeting stays visible, fine.
      });
  }, [sessionId, historyLoaded, setMessages, authorId, user?.id, isValuation, tenant.agentName]);

  useEffect(() => {
    if (visitorName) return;
    const nameParams = new URLSearchParams({ authorId });
    if (user?.id) nameParams.set('userId', user.id);
    fetch(`/api/sessions?${nameParams}`)
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

  // Track timestamp when each message first appears (write-once, never overwrite)
  useEffect(() => {
    if (messages.length === 0) return;
    setMsgTimes((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const m of messages) {
        if (!next[m.id]) {
          next[m.id] = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue;
    setInputValue('');
    if (!hasStarted) trackEvent('first_message', { source: 'input' });
    try { await sendMessage({ text }); } catch { /* useChat handles */ }
  };

  const useBadge = async (text: string) => {
    setInputValue('');
    trackEvent('quick_action_click', { prompt: text.slice(0, 50) });
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

  // --- HEADER BAR (součást flex column, ne fixed — Hugo strip pod tím přirozeně sedne) ---
  const headerBar = (
    <div className="shrink-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-4 h-14 max-w-[900px] mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onOpenSidebar} className="p-2 -ml-2 rounded-xl hover:bg-surface-container transition-colors">
            <Menu className="w-5 h-5 text-on-surface-variant" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-lowest shadow-soft border border-outline-variant/10 flex items-center justify-center flex-shrink-0">
              <Image src={tenant.branding.logoUrl ?? '/logo.png'} alt={tenant.branding.title} width={20} height={20} className="object-contain" />
            </div>
            <span className="text-sm font-bold text-on-surface hidden sm:block">{tenant.branding.title}</span>
          </div>
        </div>
        <UserMenu />
      </div>
    </div>
  );

  // --- INPUT BAR (glassmorphic per redesign) ---
  const inputBar = (
    <form onSubmit={onSubmit} className="glass-panel p-2 rounded-3xl border border-white/40 shadow-xl flex items-center gap-2 group focus-within:ring-2 ring-primary/20 transition-all">
      <button type="button" className="p-3 text-secondary hover:text-primary transition-colors" aria-label="Připojit soubor">
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>attach_file</span>
      </button>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setInputValue(''); }}
        placeholder={isValuation ? 'Zeptejte se na cenu nemovitosti...' : 'Zeptejte se Huga na cokoliv...'}
        className="flex-1 bg-transparent border-none outline-none text-base md:text-[15px] text-on-surface placeholder:text-on-surface-variant/60 py-3 px-2"
        autoComplete="off"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        className={`p-3 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${inputValue.trim() ? 'bg-primary text-white shadow-lg hover:scale-105 active:scale-95' : 'bg-surface-container-high text-on-surface-variant/40'}`}
        aria-label="Odeslat"
      >
        <span className="material-symbols-outlined filled" style={{ fontSize: 20 }}>send</span>
      </button>
    </form>
  );

  // --- Hooks that must run unconditionally (before any early return) ---
  const hasSeenWidget = useMemo(() => {
    return messages.some(m => m.role === 'assistant' && m.parts?.some(
      (p: { type: string }) => typeof p.type === 'string' && (p.type.startsWith('tool-show_') || (p.type === 'dynamic-tool'))
    ));
  }, [messages]);

  const hasConverted = useMemo(() => {
    return messages.some(m => m.role === 'assistant' && m.parts?.some(
      (p: { type: string; toolName?: string }) => {
        const name = p.toolName ?? (typeof p.type === 'string' ? p.type.replace(/^tool-/, '') : '');
        return name === 'show_lead_capture';
      }
    ));
  }, [messages]);

  const idleSentRef = useRef(false);
  useEffect(() => {
    if (idleSentRef.current || !hasSeenWidget || hasConverted || isLoading) return;
    const timer = setTimeout(() => {
      if (!idleSentRef.current && !isLoading) {
        idleSentRef.current = true;
        sendMessage({ text: '[IDLE_CHECK]' });
        trackEvent('idle_reengagement');
      }
    }, 90_000);
    return () => clearTimeout(timer);
  }, [messages.length, hasSeenWidget, hasConverted, isLoading, sendMessage]);

  // =============================================
  // UNIFIED CHAT VIEW — jediná forma zobrazení
  // Hugo se sám představí jako první bublina (po [GREETING] sentinelu).
  // Quick action chips se zobrazí nad inputem, dokud uživatel nezačne reálný chat.
  // Layout: column 100vh — header / Hugo strip / messages (flex-1, scroll) / input (auto)
  // =============================================
  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden min-w-0 chat-bg">
      {headerBar}
      <ExitIntentOverlay hasSeenWidget={hasSeenWidget} hasConverted={hasConverted} onSend={useBadge} />
      <MobileCallFab hasSeenWidget={hasSeenWidget} hasConverted={hasConverted} />

      {/* Hugo persistent strip — připomenutí kdo je s vámi */}
      {!isValuation && (
        <div className="shrink-0 z-20 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
          <div className="max-w-[700px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-3">
            <div className="relative shrink-0">
              <Image
                src="/images/redesign/hugo-portrait.png"
                alt="Hugo"
                width={36}
                height={36}
                className="w-9 h-9 rounded-full border border-primary/20 object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full">
                <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label-md font-semibold text-on-surface leading-tight">Hugo</p>
              <p className="text-label-sm text-on-surface-variant normal-case tracking-normal">AI hypoteční poradce · online</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-label-sm text-on-surface-variant/60 normal-case tracking-normal">
              <span className="material-symbols-outlined filled text-primary" style={{ fontSize: 14 }}>bolt</span>
              odpovídá do 30 s
            </span>
          </div>
        </div>
      )}

      {/* Messages — flex-1 takes available space, scrolls when overflow */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 min-h-0">
        <div className="max-w-[700px] mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-6 w-full min-w-0">
          {messages.map((message: UIMessage) => {
            if (message.role === 'user' && ['[GREETING]', '[IDLE_CHECK]'].includes(getTextContent(message).trim())) return null;
            return (
            <div key={message.id} className="mb-4 animate-in">
              {message.role === 'user' && (
                <div className="flex flex-col items-end mb-2">
                  <div className="bg-primary text-on-primary px-5 py-3 md:py-3 rounded-2xl rounded-tr-none max-w-[85%] text-body-md leading-relaxed shadow-md break-words overflow-hidden">
                    {getTextContent(message).replace(/\s*\[ADDRESS_DATA:.*?\]/g, '')}
                  </div>
                  {msgTimes[message.id] && (
                    <span className="text-label-sm text-on-surface-variant/50 normal-case tracking-normal mr-2 mt-1">
                      {msgTimes[message.id]}
                    </span>
                  )}
                </div>
              )}

              {message.role === 'assistant' && (
                <div className="space-y-3">
                  {message.parts?.map((part, index: number) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const hasGeocodeInMessage = message.parts?.some((p: any) => {
                      if (p.type?.startsWith?.('tool-') || p.type === 'dynamic-tool') {
                        return (p.toolName ?? p.type?.replace?.(/^tool-/, '')) === 'geocode_address';
                      }
                      return false;
                    });
                    if (part.type === 'text' && part.text && hasGeocodeInMessage) return null;
                    if (part.type === 'text' && part.text) {
                      return (
                        <div key={index} className="flex justify-start mb-2">
                          <div className="bg-surface-container-lowest text-on-surface px-5 py-3 md:py-3 rounded-2xl rounded-tl-none max-w-[85%] text-body-md leading-relaxed break-words overflow-hidden shadow-sm border border-outline-variant/10
                            prose prose-sm max-w-none
                            [&_p]:my-1 [&_p]:leading-relaxed
                            [&_strong]:text-on-surface [&_strong]:font-semibold
                            [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4
                            [&_li]:my-0.5
                            [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:mt-2 [&_h2]:mb-1
                            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-on-surface/80 [&_h3]:mt-2 [&_h3]:mb-1
                            [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:bg-surface-container [&_table]:border-collapse [&_td]:border [&_td]:border-outline-variant/20 [&_th]:border [&_th]:border-outline-variant/20
                            [&_blockquote]:border-l-2 [&_blockquote]:border-primary/20 [&_blockquote]:pl-3 [&_blockquote]:text-on-surface-variant [&_blockquote]:my-1
                            [&_code]:bg-surface-container [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
                          ">
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
                        <div key={index} className="w-full min-w-0">
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
                  {msgTimes[message.id] && (
                    <span className="text-label-sm text-on-surface-variant/50 normal-case tracking-normal ml-2 mt-1 block">
                      {msgTimes[message.id]}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
          })}

          {isLoading && (
            <div className="flex justify-start mb-2 animate-in">
              <div className="bg-surface-container-lowest text-on-surface-variant px-5 py-3 rounded-2xl rounded-tl-none text-sm shadow-sm border border-outline-variant/10">
                <span className="inline-flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

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

      {/* Input bar — součást flex containeru (ne fixed), takže drží blízko zpráv */}
      <div className="z-30 shrink-0 border-t border-outline-variant/10 bg-surface/95 backdrop-blur-md">
        <div className="max-w-[700px] mx-auto px-4 md:px-6 pt-3 pb-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            {/* Quick action chips — viditelné dokud uživatel reálně nezačal chat */}
            {!hasStarted && (
              <div className="flex flex-wrap gap-2 mb-3 justify-center animate-in fade-in duration-300">
                {QUICK_ACTIONS.map(({ label, materialIcon, prompt }) => (
                  <button
                    key={label}
                    onClick={() => useBadge(prompt)}
                    disabled={isLoading}
                    className="bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container px-4 py-2 rounded-full text-label-md text-on-secondary-container transition-all flex items-center gap-2 border border-outline-variant/20 disabled:opacity-50 active:scale-95 shadow-sm"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{materialIcon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {inputBar}

            <div className="flex items-center justify-between mt-2 gap-2">
              <CtaIntensityDial onChange={handleCtaChange} />
              <button
                onClick={() => useBadge('Chci se spojit se specialistou na bezplatnou konzultaci.')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-sm text-on-surface-variant/60 hover:bg-surface-container transition-all flex-shrink-0 normal-case tracking-normal"
              >
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">Expert</span>
              </button>
              <p className="text-label-sm text-on-surface-variant/60 truncate normal-case tracking-normal">
                {isValuation ? 'AI odhad — data z trhu' : 'Hugo může dělat chyby. Ověřte si u Davida.'}
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
