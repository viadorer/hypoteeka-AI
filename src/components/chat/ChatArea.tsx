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
  const hasStarted = messages.length > 0 && !isGreetingOnly;
  const isLoading = status === 'submitted' || status === 'streaming';
  const greetingMessage = isGreetingOnly
    ? messages.find(m => m.role === 'assistant')
    : null;

  useEffect(() => {
    fetch('/api/rates').then(r => r.json()).then(data => {
      if (data.mortgage?.avgRate > 0) setTodayRates(data);
    }).catch(() => {});
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

  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);
    const msgParams = new URLSearchParams({ authorId });
    if (user?.id) msgParams.set('userId', user.id);
    fetch(`/api/sessions/${sessionId}/messages?${msgParams}`)
      .then(r => { if (r.ok) return r.json(); throw new Error('no session'); })
      .then((data: { uiMessages?: unknown[]; profile?: { name?: string; nameVocative?: string } }) => {
        if (data.uiMessages && Array.isArray(data.uiMessages) && data.uiMessages.length > 0) {
          setMessages(data.uiMessages as Parameters<typeof setMessages>[0]);
        } else {
          triggerGreeting();
        }
        if (data.profile?.name) {
          setVisitorName(data.profile.name.split(' ')[0]);
          setVisitorNameVocative(data.profile.nameVocative ?? data.profile.name.split(' ')[0]);
        }
      })
      .catch(() => {
        triggerGreeting();
      });

    function triggerGreeting() {
      if (greetingSentRef.current) return;
      greetingSentRef.current = true;
      setTimeout(() => {
        sendMessage({ text: '[GREETING]' });
      }, 1000);
    }
  }, [sessionId, historyLoaded, setMessages, sendMessage, authorId, user?.id]);

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

  // --- HEADER BAR (shared between welcome and chat) ---
  const headerBar = (
    <div className="fixed top-0 left-0 right-0 z-30 glass-panel border-b border-[#e4bdc2]/10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-4 h-14 max-w-[900px] mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onOpenSidebar} className="p-2 -ml-2 rounded-xl hover:bg-[#e9edff] transition-colors">
            <Menu className="w-5 h-5 text-[#001a41]/60" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffffff] shadow-[0_4px_20px_rgba(0,26,65,0.06)] border border-[#e4bdc2]/10 flex items-center justify-center flex-shrink-0">
              <Image src={tenant.branding.logoUrl ?? '/logo.png'} alt={tenant.branding.title} width={20} height={20} className="object-contain" />
            </div>
            <span className="text-sm font-bold text-[#001a41] hidden sm:block">{tenant.branding.title}</span>
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
  // WELCOME SCREEN (before chat starts)
  // =============================================
  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden overflow-y-auto min-w-0 w-full chat-bg">
        {headerBar}

        <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-8 w-full min-w-0">
          {/* Hugo card with portrait + online indicator */}
          {!isValuation && (
            <div className="flex items-center gap-4 mb-8 max-w-[600px] w-full justify-center">
              <div className="relative shrink-0">
                <Image
                  src="/images/redesign/hugo-portrait.png"
                  alt="Hugo"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full border-2 border-primary/30 object-cover shadow-soft"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="text-left">
                <h2 className="text-headline-md text-on-surface leading-tight">Hugo</h2>
                <p className="text-label-md text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined filled" style={{ fontSize: 14, color: 'var(--color-primary)' }}>bolt</span>
                  Váš osobní AI expert na hypotéky
                </p>
              </div>
            </div>
          )}

          {/* Greeting */}
          <div className="text-center mb-6 max-w-lg">
            <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">
              {visitorName
                ? `S čím vám pomůžu, ${visitorNameVocative ?? visitorName}?`
                : 'S čím vám pomůžu?'}
            </h1>
          </div>

          {/* Hugo's dynamic greeting - compact */}
          {(greetingMessage || (isLoading && greetingSentRef.current && !greetingMessage)) && (
            <div className="w-full max-w-[600px] mb-6 min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="text-on-surface-variant text-center text-body-md leading-relaxed">
                {greetingMessage ? (
                  <ReactMarkdown>{getTextContent(greetingMessage)}</ReactMarkdown>
                ) : (
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Input - glassmorphic HERO */}
          <div className="w-full max-w-[600px] mb-8 min-w-0">
            {inputBar}
          </div>

          {/* Quick action chips - pill style per redesign */}
          <div className="flex flex-wrap gap-2 justify-center max-w-[600px] w-full mb-10">
            {QUICK_ACTIONS.map(({ label, materialIcon, prompt }) => (
              <button
                key={label}
                onClick={() => useBadge(prompt)}
                disabled={isLoading}
                className="bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container px-4 py-2 rounded-full text-label-md text-on-secondary-container transition-all flex items-center gap-2 border border-outline-variant/20 disabled:opacity-50 active:scale-95"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{materialIcon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Trust signals strip — Material Symbols icons */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 max-w-[600px] w-full mb-8 text-label-md text-on-surface-variant/70">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined filled text-primary" style={{ fontSize: 16 }}>groups</span>
              1 000+ klientů
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined filled text-primary" style={{ fontSize: 16 }}>account_balance</span>
              8+ bank
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined filled text-primary" style={{ fontSize: 16 }}>verified</span>
              Certifikovaní poradci
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined filled text-primary" style={{ fontSize: 16 }}>card_giftcard</span>
              Zdarma
            </span>
          </div>

          {/* CNB rates */}
          {!isValuation && todayRates && todayRates.mortgage.avgRate > 0 && (
            <div className="text-center text-label-sm text-on-surface-variant/60 mb-6">
              <span>REPO {todayRates.cnb.repo}%</span>
              <span className="mx-2 text-on-surface-variant/30">·</span>
              <span>FIX 1-5Y {todayRates.mortgage.rateFix5y}%</span>
              <span className="mx-2 text-on-surface-variant/30">·</span>
              <span>FIX 5-10Y {todayRates.mortgage.rateFix10y}%</span>
              <span className="mx-2 text-on-surface-variant/30">·</span>
              <span>RPSN {todayRates.mortgage.rpsn}%</span>
              <p className="text-label-sm text-on-surface-variant/40 mt-1 normal-case tracking-normal">ČNB ARAD · {todayRates.date}</p>
            </div>
          )}

          {/* Footer disclaimer */}
          <p className="text-label-sm text-on-surface-variant/60 text-center max-w-md leading-relaxed normal-case tracking-normal">
            {isValuation
              ? `${tenant.agentName} je AI asistent. Odhady jsou orientační. Může se mýlit.`
              : 'Hugo může dělat chyby. Ověřte si důležité informace u Davida.'}
          </p>
        </div>
      </div>
    );
  }

  // =============================================
  // CHAT VIEW (after conversation starts)
  // =============================================
  return (
    <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden min-w-0 chat-bg">
      {headerBar}
      <ExitIntentOverlay hasSeenWidget={hasSeenWidget} hasConverted={hasConverted} onSend={useBadge} />
      <MobileCallFab hasSeenWidget={hasSeenWidget} hasConverted={hasConverted} />

      {/* Hugo persistent strip — připomenutí kdo je s vámi */}
      {!isValuation && (
        <div className="sticky top-14 z-20 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
          <div className="max-w-[700px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-3">
            <div className="relative shrink-0">
              <Image
                src="/images/redesign/hugo-portrait.png"
                alt="Hugo"
                width={36}
                height={36}
                className="w-9 h-9 rounded-full border border-primary/20 object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pt-14">
        <div className="max-w-[700px] mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-44 md:pb-40 w-full min-w-0">
          {messages.map((message: UIMessage) => {
            if (message.role === 'user' && ['[GREETING]', '[IDLE_CHECK]'].includes(getTextContent(message).trim())) return null;
            return (
            <div key={message.id} className="mb-4 animate-in">
              {message.role === 'user' && (
                <div className="flex justify-end mb-2">
                  <div className="bg-primary text-on-primary px-5 py-3 md:py-3 rounded-2xl rounded-tr-none max-w-[85%] text-body-md leading-relaxed shadow-md break-words overflow-hidden">
                    {getTextContent(message).replace(/\s*\[ADDRESS_DATA:.*?\]/g, '')}
                  </div>
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

      {/* Bottom input bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <div className="bg-gradient-to-t from-[#f9f9ff] via-[#f9f9ff]/95 to-transparent backdrop-blur-md">
          <div className="max-w-[700px] mx-auto px-4 md:px-6 pt-4 pb-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {inputBar}
            <div className="flex items-center justify-between mt-2 gap-2">
              <CtaIntensityDial onChange={handleCtaChange} />
              <button
                onClick={() => useBadge('Chci se spojit se specialistou na bezplatnou konzultaci.')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-[#001a41]/40 hover:bg-[#f1f3ff] transition-all flex-shrink-0"
              >
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">Expert</span>
              </button>
              <p className="text-[10px] md:text-[11px] text-[#001a41]/40 truncate">
                {isValuation ? 'AI odhad -- data z trhu' : 'AI průvodce -- data z ČNB ARAD'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
