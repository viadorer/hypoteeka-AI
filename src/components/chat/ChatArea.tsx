'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, AlertCircle, RotateCcw, Calculator, ShieldCheck, TrendingUp, Users, BarChart3, RefreshCw, Home, PiggyBank, Percent, HelpCircle, ArrowDownUp, Search, ChevronDown, Phone } from 'lucide-react';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import ReactMarkdown from 'react-markdown';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { CtaIntensityDial } from './CtaIntensityDial';
import type { CtaIntensity } from './CtaIntensityDial';
import { useTenant } from '@/lib/tenant/use-tenant';
import { getBrowserId } from '@/lib/browser-id';

const QUICK_ACTIONS_MORTGAGE_PRIMARY = [
  { label: 'Spočítat splátku', icon: Calculator, prompt: 'Chci si spočítat splátku hypotéky.' },
  { label: 'Ověřit bonitu', icon: ShieldCheck, prompt: 'Chci si ověřit, jestli dosáhnu na hypotéku.' },
  { label: 'Kolik si mohu půjčit?', icon: TrendingUp, prompt: 'Kolik si mohu maximálně půjčit na hypotéku?' },
  { label: 'Refinancování hypotéky', icon: RefreshCw, prompt: 'Chci refinancovat hypotéku, jaké jsou aktuální podmínky?' },
];

const QUICK_ACTIONS_MORTGAGE_MORE = [
  { label: 'Nájem vs. hypotéka', icon: ArrowDownUp, prompt: 'Vyplatí se mi víc nájem nebo hypotéka?' },
  { label: 'Nejlepší sazby na trhu', icon: Percent, prompt: 'Jaké jsou aktuální nejlepší sazby hypoték na trhu?' },
  { label: 'Koupě první nemovitosti', icon: Home, prompt: 'Kupuji první nemovitost, jak postupovat s hypotékou?' },
  { label: 'Investiční nemovitost', icon: PiggyBank, prompt: 'Chci koupit investiční nemovitost, vyplatí se to?' },
  { label: 'Ocenění nemovitosti', icon: Search, prompt: 'Chci zjistit hodnotu své nemovitosti.' },
];

const QUICK_ACTIONS_VALUATION_PRIMARY = [
  { label: 'Zjistit cenu nemovitosti', icon: Search, prompt: 'Chci zjistit tržní cenu své nemovitosti.' },
  { label: 'Odhadnout výši nájmu', icon: PiggyBank, prompt: 'Chci zjistit, za kolik bych mohl pronajímat svou nemovitost.' },
];

const QUICK_ACTIONS_VALUATION_MORE = [
  { label: 'Spočítat hypotéku', icon: Calculator, prompt: 'Chci si spočítat splátku hypotéky.' },
  { label: 'Poradit s něčím jiným', icon: HelpCircle, prompt: 'Potřebuji poradit s nemovitostí.' },
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
  const tenant = useTenant();
  const isValuation = tenant.features.primaryFlow === 'valuation';
  const QUICK_ACTIONS_PRIMARY = isValuation ? QUICK_ACTIONS_VALUATION_PRIMARY : QUICK_ACTIONS_MORTGAGE_PRIMARY;
  const QUICK_ACTIONS_MORE = isValuation ? QUICK_ACTIONS_VALUATION_MORE : QUICK_ACTIONS_MORTGAGE_MORE;
  const sessionId = useMemo(() => getSessionId(initialSessionId), [initialSessionId]);
  const [ctaIntensity, setCtaIntensity] = useState<CtaIntensity>('medium');
  const [authorId, setAuthorId] = useState<string>('anonymous');
  
  // Get browser ID on client side only (avoid hydration mismatch)
  useEffect(() => {
    setAuthorId(getBrowserId());
  }, []);
  
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      body: { sessionId, tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? 'hypoteeka', authorId, ctaIntensity },
    });
  }, [sessionId, ctaIntensity, authorId]);
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
  const [showMoreActions, setShowMoreActions] = useState(false);
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

  // Greeting-only state: [GREETING] trigger + Hugo's response = still on welcome screen
  const isGreetingOnly = messages.length <= 2 && messages.every(m =>
    (m.role === 'user' && getTextContent(m).trim() === '[GREETING]') || m.role === 'assistant'
  ) && greetingSentRef.current;
  const hasStarted = messages.length > 0 && !isGreetingOnly;
  const isLoading = status === 'submitted' || status === 'streaming';
  // Extract greeting text from Hugo's response for welcome screen
  const greetingMessage = isGreetingOnly
    ? messages.find(m => m.role === 'assistant')
    : null;

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

  // Load conversation history for existing session, or trigger auto-greeting for new chats
  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);
    fetch(`/api/sessions/${sessionId}/messages`)
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
      // Send hidden trigger to backend after 1s delay so welcome screen renders first
      setTimeout(() => {
        sendMessage({ text: '[GREETING]' });
      }, 1000);
    }
  }, [sessionId, historyLoaded, setMessages, sendMessage]);

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
        placeholder={isValuation ? 'Zeptejte se na cenu nemovitosti...' : 'Zeptejte se na cokoliv ohledně hypotéky...'}
        className="flex-1 bg-transparent border-none outline-none text-base md:text-[15px] text-gray-900 placeholder:text-gray-400 py-3 md:py-2.5"
        autoComplete="off"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        className="w-11 h-11 md:w-10 md:h-10 rounded-xl disabled:bg-gray-200 flex items-center justify-center transition-all flex-shrink-0 ml-2"
            style={{ backgroundColor: inputValue.trim() ? tenant.branding.primaryColor : undefined }}
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

          {/* Hero */}
          <div className="text-center mb-8 max-w-lg">
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg mx-auto mb-4" style={{ borderColor: `${tenant.branding.primaryColor}33`, borderWidth: 3 }}>
              <img src={isValuation ? (tenant.branding.logoUrl ?? '/images/hugo-avatar.jpg') : '/images/hugo-avatar.jpg'} alt={tenant.agentName} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-[28px] md:text-4xl font-extrabold text-[#0A1E5C] tracking-tight mb-3">
              {visitorName
                ? isValuation
                  ? `Zdravím, ${visitorNameVocative ?? visitorName}! Jsem ${tenant.agentName}.`
                  : `Zdravím, ${visitorNameVocative ?? visitorName}! Jsem ${tenant.agentName}.`
                : isValuation
                  ? `Jsem ${tenant.agentName}, váš odhadce nemovitostí`
                  : `Jsem ${tenant.agentName}, váš hypoteční poradce`}
            </h1>
            <p className="text-gray-500 text-base md:text-lg leading-relaxed">
              {visitorName
                ? isValuation
                  ? 'Pokračujte tam, kde jste skončili, nebo začněte nový odhad. Předchozí odhady najdete v bočním panelu.'
                  : 'Pokračujte tam, kde jste skončili, nebo začněte novou konzultaci. Předchozí konzultace najdete v bočním panelu.'
                : isValuation
                  ? 'Zjistěte aktuální tržní hodnotu vaší nemovitosti — na základě reálných dat z katastru a posledních prodejů v okolí. Zdarma a bez registrace.'
                  : 'Spočítám splátku, ověřím bonitu a porovnám nabídky bank. Za minutu víte, na co dosáhnete.'}
            </p>
          </div>

          {/* Hugo's dynamic greeting bubble on welcome screen */}
          {(greetingMessage || (isLoading && greetingSentRef.current && !greetingMessage)) && (
            <div className="w-full max-w-[560px] mb-6 min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className={`text-gray-900 px-4 py-3 rounded-2xl rounded-bl-md text-base md:text-[15px] leading-relaxed ${glass}`}>
                {greetingMessage ? (
                  <ReactMarkdown>{getTextContent(greetingMessage)}</ReactMarkdown>
                ) : (
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="w-full max-w-[560px] mb-6 min-w-0">
            {inputBar}
          </div>

          {/* Quick action badges - primary */}
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {QUICK_ACTIONS_PRIMARY.map(({ label, icon: Icon, prompt }) => (
              <button
                key={label}
                onClick={() => useBadge(prompt)}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 px-4 py-3 md:py-2.5 rounded-xl text-[15px] md:text-sm text-gray-600 transition-all disabled:opacity-50 active:scale-[0.97] ${glass} ${glassHover}`}
                style={{ ['--tw-hover-text' as string]: tenant.branding.primaryColor }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          {/* Quick action badges - more (collapsed on mobile) */}
          {!showMoreActions && (
            <button
              onClick={() => setShowMoreActions(true)}
              className="md:hidden flex items-center gap-1 text-xs text-gray-400 mb-8 active:text-gray-600"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Další možnosti
            </button>
          )}
          <div className={`flex-wrap gap-2 justify-center mb-8 ${showMoreActions ? 'flex' : 'hidden md:flex'}`}>
            {QUICK_ACTIONS_MORE.map(({ label, icon: Icon, prompt }) => (
              <button
                key={label}
                onClick={() => useBadge(prompt)}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 transition-all disabled:opacity-50 active:scale-[0.97] hover:text-gray-600 hover:bg-white/40`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Today's rates - compact on mobile (only for mortgage tenants) */}
          {!isValuation && todayRates && todayRates.mortgage.avgRate > 0 && (
            <div className="w-full max-w-[700px] mb-8 min-w-0">
              <div className="flex items-center justify-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" style={{ color: tenant.branding.primaryColor }} />
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
                  Sazby hypoték dnes ({todayRates.date})
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 md:gap-3">
                <div className={`rounded-xl p-2.5 md:p-4 text-center ${glass}`}>
                  <p className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider mb-1">Repo ČNB</p>
                  <p className="text-lg md:text-xl font-bold text-[#0A1E5C]">{todayRates.cnb.repo} %</p>
                </div>
                <div className={`rounded-xl p-2.5 md:p-4 text-center ${glass}`}>
                  <p className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider mb-1">Fix 1-5y</p>
                  <p className="text-lg md:text-xl font-bold text-[#0A1E5C]">{todayRates.mortgage.rateFix5y} %</p>
                </div>
                <div className={`rounded-xl p-2.5 md:p-4 text-center ${glass}`}>
                  <p className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider mb-1">Fix 5-10y</p>
                  <p className="text-lg md:text-xl font-bold text-[#0A1E5C]">{todayRates.mortgage.rateFix10y} %</p>
                </div>
                <div className={`rounded-xl p-2.5 md:p-4 text-center ${glass}`}>
                  <p className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider mb-1">RPSN</p>
                  <p className="text-lg md:text-xl font-bold text-[#0A1E5C]">{todayRates.mortgage.rpsn} %</p>
                </div>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-2">
                Zdroj: ČNB ARAD
              </p>
            </div>
          )}

          {/* Social proof - single compact row (only for mortgage tenants) */}
          {!isValuation && <div className="w-full max-w-[600px] mb-8 min-w-0">
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              <div className={`rounded-xl p-2.5 md:p-3 text-center ${glass}`}>
                <p className="text-lg md:text-xl font-bold" style={{ color: tenant.branding.accentColor }}>{isValuation ? '2 400+' : '850+'}</p>
                <p className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">{isValuation ? 'odhadů' : 'rodin'}</p>
              </div>
              <div className={`rounded-xl p-2.5 md:p-3 text-center ${glass}`}>
                <p className="text-lg md:text-xl font-bold" style={{ color: tenant.branding.accentColor }}>{isValuation ? '< 2 min' : '164k'}</p>
                <p className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">{isValuation ? 'výsledek' : 'úspora'}</p>
              </div>
              <div className={`rounded-xl p-2.5 md:p-3 text-center ${glass}`}>
                <p className="text-lg md:text-xl font-bold" style={{ color: tenant.branding.accentColor }}>{isValuation ? 'Reálná data' : '4.9/5'}</p>
                <p className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">{isValuation ? 'z katastru' : 'hodnocení'}</p>
              </div>
              <div className={`rounded-xl p-2.5 md:p-3 text-center ${glass}`}>
                <p className="text-lg md:text-xl font-bold" style={{ color: tenant.branding.accentColor }}>{isValuation ? 'Zdarma' : '14'}</p>
                <p className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">{isValuation ? 'bez registrace' : 'bank'}</p>
              </div>
            </div>
          </div>}

          {/* Co řešíme - hidden on mobile (redundant with badges), visible on desktop, only mortgage */}
          {!isValuation && <div className="hidden md:block w-full max-w-[700px] mb-10 min-w-0">
            <p className="text-center text-[11px] text-gray-400 uppercase tracking-wider mb-5 font-medium">
              Jak vám pomůžeme
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <Calculator className="w-6 h-6 mx-auto mb-2" style={{ color: tenant.branding.primaryColor }} />
                <p className="text-sm font-semibold text-gray-800 mb-1">Splátka a bonita</p>
                <p className="text-xs text-gray-400">Výpočet dle ČNB 2026</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <Percent className="w-6 h-6 mx-auto mb-2" style={{ color: tenant.branding.primaryColor }} />
                <p className="text-sm font-semibold text-gray-800 mb-1">Nejlepší sazby</p>
                <p className="text-xs text-gray-400">Porovnání nabídek bank</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <RefreshCw className="w-6 h-6 mx-auto mb-2" style={{ color: tenant.branding.primaryColor }} />
                <p className="text-sm font-semibold text-gray-800 mb-1">Refinancování</p>
                <p className="text-xs text-gray-400">Optimalizace podmínek</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${glass}`}>
                <Users className="w-6 h-6 mx-auto mb-2" style={{ color: tenant.branding.primaryColor }} />
                <p className="text-sm font-semibold text-gray-800 mb-1">Osobní poradce</p>
                <p className="text-xs text-gray-400">Konzultace zdarma</p>
              </div>
            </div>
          </div>}

          {/* Banks - compact horizontal scroll on mobile (only for mortgage tenants) */}
          {!isValuation && (
          <div className="w-full max-w-[700px] mb-6 min-w-0">
            <p className="text-center text-[11px] text-gray-400 uppercase tracking-wider mb-3 font-medium">
              Porovnáváme nabídky bank
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 md:gap-x-6 gap-y-1.5">
              {BANKS.map((bank) => (
                <span key={bank} className="text-[11px] md:text-xs text-gray-400 font-medium whitespace-nowrap">
                  {bank}
                </span>
              ))}
            </div>
          </div>
          )}

          {/* Footer */}
          <div className={`rounded-xl px-6 py-3 text-center text-[11px] text-gray-400 max-w-lg ${glass}`}>
            <p>{isValuation
              ? `${tenant.agentName} je AI asistent odhad.online. Může se mýlit -- ověřujte důležité informace.`
              : `${tenant.agentName} je AI průvodce hypotékami. Může se mýlit -- ověřujte důležité informace.`}</p>
            <p className="mt-1">{isValuation
              ? 'Odhady jsou orientační, vychází z reálných transakcí. Pro závazný posudek kontaktujte certifikovaného odhadce.'
              : 'Výpočty jsou orientační, data z ČNB ARAD. Konkrétní nabídky řeší certifikovaný specialista.'}</p>
            <p className="mt-1">Citlivé údaje (RČ, číslo účtu) prosím nesdílejte v chatu.</p>
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
          {messages.map((message: UIMessage) => {
            // Hide [GREETING] trigger message from user
            if (message.role === 'user' && getTextContent(message).trim() === '[GREETING]') return null;
            return (
            <div key={message.id} className="mb-4 animate-in">
              {message.role === 'user' && (
                <div className="flex justify-end mb-2">
                  <div className="backdrop-blur-sm text-white px-4 py-3 md:py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-base md:text-[15px] leading-relaxed shadow-lg break-words overflow-hidden" style={{ backgroundColor: `${tenant.branding.primaryColor}e6` }}>
                    {getTextContent(message).replace(/\s*\[ADDRESS_DATA:.*?\]/g, '')}
                  </div>
                </div>
              )}

              {message.role === 'assistant' && (
                <div className="space-y-3">
                  {message.parts?.map((part, index: number) => {
                    // Hide text parts when geocode widget is in same message
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
                          <div className={`text-gray-900 px-4 py-3 md:py-2.5 rounded-2xl rounded-bl-md max-w-[85%] text-base md:text-[15px] leading-relaxed break-words overflow-hidden ${glass}
                            prose prose-sm prose-gray max-w-none
                            [&_p]:my-1 [&_p]:leading-relaxed
                            [&_strong]:text-gray-900 [&_strong]:font-semibold
                            [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4
                            [&_li]:my-0.5
                            [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[#0A1E5C] [&_h2]:mt-2 [&_h2]:mb-1
                            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-2 [&_h3]:mb-1
                            [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:bg-gray-50/50 [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_th]:border [&_th]:border-gray-200
                            [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:my-1
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
            <div className="flex items-center justify-between mt-2 gap-2">
              <CtaIntensityDial onChange={handleCtaChange} />
              <button
                onClick={() => useBadge('Chci se spojit se specialistou na bezplatnou konzultaci.')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-gray-400 hover:bg-gray-50 transition-all flex-shrink-0"
              >
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">Expert</span>
              </button>
              <p className="text-[10px] md:text-[11px] text-gray-400 truncate">
                {isValuation ? 'AI odhad -- data z trhu' : 'AI průvodce -- data z ČNB ARAD'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
