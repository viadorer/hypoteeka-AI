'use client';

import { PropertyWidget } from './PropertyWidget';
import { PaymentWidget } from './PaymentWidget';
import { EligibilityWidget } from './EligibilityWidget';
import { RentVsBuyWidget } from './RentVsBuyWidget';
import { InvestmentWidget } from './InvestmentWidget';
import { AffordabilityWidget } from './AffordabilityWidget';
import { RefinanceWidget } from './RefinanceWidget';
import { AmortizationWidget } from './AmortizationWidget';
import { StressTestWidget } from './StressTestWidget';
import { LeadCaptureWidget } from './LeadCaptureWidget';
import { SpecialistWidget } from './SpecialistWidget';
import { ValuationWidget } from './ValuationWidget';
import { NextStepsBar } from './NextStepsBar';

interface ToolInvocation {
  toolName: string;
  state: string;
  args: Record<string, unknown>;
  output?: Record<string, unknown>;
}

const TOOL_LABELS: Record<string, string> = {
  show_property: 'Nemovitost',
  show_payment: 'Splátka hypotéky',
  show_eligibility: 'Bonita ČNB',
  show_rent_vs_buy: 'Nájem vs. Hypotéka',
  show_investment: 'Investiční analýza',
  show_affordability: 'Kolik si můžete dovolit',
  show_refinance: 'Refinancování',
  show_amortization: 'Průběh splácení',
  show_stress_test: 'Stress test',
  show_valuation: 'Ocenění nemovitosti',
  show_lead_capture: 'Kontaktní formulář',
  show_specialists: 'Dostupní specialisté',
  send_email_summary: 'Odesílám email',
  send_whatsapp_link: 'WhatsApp odkaz',
};

function WidgetSkeleton({ toolName }: { toolName: string }) {
  const label = TOOL_LABELS[toolName] ?? 'Načítám...';
  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-pulse overflow-hidden w-full min-w-0">
      <div className="w-8 h-[3px] rounded-full bg-gray-200 mb-4" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-3">
        {label}
      </p>
      <div className="space-y-2">
        <div className="h-8 bg-gray-100 rounded-lg w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    </div>
  );
}

export function WidgetRenderer({ toolInvocation, sessionId, onSend }: { toolInvocation: ToolInvocation; sessionId?: string; onSend?: (text: string) => void }) {
  const { toolName, args, state } = toolInvocation;

  // Show skeleton only while input is still streaming
  if (state === 'input-streaming') {
    return <WidgetSkeleton toolName={toolName} />;
  }

  // Show widget as soon as we have args (input-available, output-available, call, etc.)
  // Some tools have no input (e.g. show_specialists) - skip check for those
  const NO_INPUT_TOOLS = ['show_specialists'];
  if (!NO_INPUT_TOOLS.includes(toolName) && (!args || Object.keys(args).length === 0)) {
    return <WidgetSkeleton toolName={toolName} />;
  }

  switch (toolName) {
    case 'show_property':
      return (
        <>
          <PropertyWidget
            propertyPrice={args.propertyPrice as number}
            propertyType={args.propertyType as string | undefined}
            location={args.location as string | undefined}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_payment': {
      const out = toolInvocation.output;
      return (
        <>
          <PaymentWidget
            propertyPrice={args.propertyPrice as number}
            equity={args.equity as number}
            rate={(out?.rate as number | undefined) ?? (args.rate as number | undefined)}
            rpsn={(out?.rpsn as number | undefined) ?? (args.rpsn as number | undefined)}
            years={(out?.years as number | undefined) ?? (args.years as number | undefined)}
            scenarios={out?.scenarios as { high: { rate: number; monthly: number; totalInterest: number; label: string }; avg: { rate: number; monthly: number; totalInterest: number; label: string }; our: { rate: number; monthly: number; totalInterest: number; label: string } } | undefined}
            saving={out?.saving as number | undefined}
            monthlySaving={out?.monthlySaving as number | undefined}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    }
    case 'show_eligibility':
      return (
        <>
          <EligibilityWidget
            propertyPrice={args.propertyPrice as number}
            equity={args.equity as number}
            monthlyIncome={args.monthlyIncome as number}
            isYoung={args.isYoung as boolean | undefined}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_rent_vs_buy':
      return (
        <>
          <RentVsBuyWidget
            propertyPrice={args.propertyPrice as number}
            equity={args.equity as number}
            monthlyRent={args.monthlyRent as number}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_investment':
      return (
        <>
          <InvestmentWidget
            purchasePrice={args.purchasePrice as number}
            equity={args.equity as number}
            monthlyRentalIncome={args.monthlyRentalIncome as number}
            monthlyExpenses={args.monthlyExpenses as number | undefined}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_affordability':
      return (
        <>
          <AffordabilityWidget
            monthlyIncome={args.monthlyIncome as number}
            equity={args.equity as number}
            isYoung={args.isYoung as boolean | undefined}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_refinance':
      return (
        <>
          <RefinanceWidget
            remainingBalance={args.remainingBalance as number}
            currentRate={args.currentRate as number}
            newRate={args.newRate as number | undefined}
            remainingYears={args.remainingYears as number}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_amortization':
      return (
        <>
          <AmortizationWidget
            loanAmount={args.loanAmount as number}
            rate={args.rate as number | undefined}
            years={args.years as number | undefined}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_stress_test':
      return (
        <>
          <StressTestWidget
            loanAmount={args.loanAmount as number}
            rate={args.rate as number | undefined}
            years={args.years as number | undefined}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_valuation':
      return (
        <>
          <ValuationWidget
            context={args.context as string | undefined}
          />
          {onSend && <NextStepsBar toolName={toolName} onSend={onSend} />}
        </>
      );
    case 'show_lead_capture':
      return (
        <LeadCaptureWidget
          context={args.context as string | undefined}
          prefilledName={args.prefilledName as string | undefined}
          prefilledEmail={args.prefilledEmail as string | undefined}
          prefilledPhone={args.prefilledPhone as string | undefined}
          sessionId={sessionId}
        />
      );
    case 'show_specialists':
      return <SpecialistWidget />;
    case 'send_email_summary': {
      const out = toolInvocation.output;
      if (!out) return <WidgetSkeleton toolName={toolName} />;
      const sent = out.sent as boolean | undefined;
      return (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
          <div className={`w-8 h-[3px] rounded-full ${sent ? 'bg-emerald-500' : 'bg-red-400'} mb-4`} />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            {sent ? 'Email odeslán' : 'Chyba odesílání'}
          </p>
          <p className="text-sm text-gray-600">
            {sent
              ? `Shrnutí kalkulace bylo odesláno na ${args.email as string}.`
              : `Nepodařilo se odeslat email. ${(out.error as string) ?? ''}`}
          </p>
        </div>
      );
    }
    case 'send_whatsapp_link': {
      const out = toolInvocation.output;
      if (!out) return <WidgetSkeleton toolName={toolName} />;
      const url = out.whatsappUrl as string | undefined;
      return (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden w-full min-w-0">
          <div className="w-8 h-[3px] rounded-full bg-green-500 mb-4" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            WhatsApp
          </p>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-all"
            >
              Otevřít WhatsApp
            </a>
          ) : (
            <p className="text-sm text-gray-500">Odkaz se připravuje...</p>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
