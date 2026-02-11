'use client';

import { PropertyWidget } from './PropertyWidget';
import { PaymentWidget } from './PaymentWidget';
import { EligibilityWidget } from './EligibilityWidget';
import { RentVsBuyWidget } from './RentVsBuyWidget';
import { InvestmentWidget } from './InvestmentWidget';
import { AffordabilityWidget } from './AffordabilityWidget';
import { RefinanceWidget } from './RefinanceWidget';
import { AmortizationWidget } from './AmortizationWidget';
import { LeadCaptureWidget } from './LeadCaptureWidget';

interface ToolInvocation {
  toolName: string;
  state: string;
  args: Record<string, unknown>;
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
  show_lead_capture: 'Kontaktní formulář',
};

function WidgetSkeleton({ toolName }: { toolName: string }) {
  const label = TOOL_LABELS[toolName] ?? 'Načítám...';
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
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

export function WidgetRenderer({ toolInvocation, sessionId }: { toolInvocation: ToolInvocation; sessionId?: string }) {
  const { toolName, args, state } = toolInvocation;

  if (state === 'input-streaming') {
    return <WidgetSkeleton toolName={toolName} />;
  }

  if (state !== 'output-available' && state !== 'input-available') {
    return <WidgetSkeleton toolName={toolName} />;
  }

  switch (toolName) {
    case 'show_property':
      return (
        <PropertyWidget
          propertyPrice={args.propertyPrice as number}
          propertyType={args.propertyType as string | undefined}
          location={args.location as string | undefined}
        />
      );
    case 'show_payment':
      return (
        <PaymentWidget
          propertyPrice={args.propertyPrice as number}
          equity={args.equity as number}
          rate={args.rate as number | undefined}
          years={args.years as number | undefined}
        />
      );
    case 'show_eligibility':
      return (
        <EligibilityWidget
          propertyPrice={args.propertyPrice as number}
          equity={args.equity as number}
          monthlyIncome={args.monthlyIncome as number}
          isYoung={args.isYoung as boolean | undefined}
        />
      );
    case 'show_rent_vs_buy':
      return (
        <RentVsBuyWidget
          propertyPrice={args.propertyPrice as number}
          equity={args.equity as number}
          monthlyRent={args.monthlyRent as number}
        />
      );
    case 'show_investment':
      return (
        <InvestmentWidget
          purchasePrice={args.purchasePrice as number}
          equity={args.equity as number}
          monthlyRentalIncome={args.monthlyRentalIncome as number}
          monthlyExpenses={args.monthlyExpenses as number | undefined}
        />
      );
    case 'show_affordability':
      return (
        <AffordabilityWidget
          monthlyIncome={args.monthlyIncome as number}
          equity={args.equity as number}
          isYoung={args.isYoung as boolean | undefined}
        />
      );
    case 'show_refinance':
      return (
        <RefinanceWidget
          remainingBalance={args.remainingBalance as number}
          currentRate={args.currentRate as number}
          newRate={args.newRate as number | undefined}
          remainingYears={args.remainingYears as number}
        />
      );
    case 'show_amortization':
      return (
        <AmortizationWidget
          loanAmount={args.loanAmount as number}
          rate={args.rate as number | undefined}
          years={args.years as number | undefined}
        />
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
    default:
      return null;
  }
}
