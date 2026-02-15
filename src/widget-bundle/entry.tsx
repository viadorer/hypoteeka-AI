/**
 * Hugo Widget React Micro-Bundle Entry Point
 * 
 * Exports renderWidget() for use by hugo-widget.js
 * Lazy-loaded only when a tool call requires a React widget.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';

// Import widgets
import { PropertyWidget } from '../components/widgets/PropertyWidget';
import { PaymentWidget } from '../components/widgets/PaymentWidget';
import { EligibilityWidget } from '../components/widgets/EligibilityWidget';
import { RentVsBuyWidget } from '../components/widgets/RentVsBuyWidget';
import { InvestmentWidget } from '../components/widgets/InvestmentWidget';
import { AffordabilityWidget } from '../components/widgets/AffordabilityWidget';
import { RefinanceWidget } from '../components/widgets/RefinanceWidget';
import { StressTestWidget } from '../components/widgets/StressTestWidget';
import { ValuationResultWidget } from '../components/widgets/ValuationResultWidget';

interface ToolData {
  toolName: string;
  args: Record<string, unknown>;
  output?: Record<string, unknown>;
}

function WidgetBridge({ toolName, args, output }: ToolData) {
  const out = output || {};

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
          rate={(out.rate as number | undefined) ?? (args.rate as number | undefined)}
          rpsn={(out.rpsn as number | undefined)}
          years={(out.years as number | undefined) ?? (args.years as number | undefined)}
          scenarios={out.scenarios as any}
          saving={out.saving as number | undefined}
          monthlySaving={out.monthlySaving as number | undefined}
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
    case 'show_stress_test':
      return (
        <StressTestWidget
          loanAmount={args.loanAmount as number}
          rate={args.rate as number | undefined}
          years={args.years as number | undefined}
        />
      );
    case 'request_valuation':
      if (!out.success) return null;
      return (
        <ValuationResultWidget
          avgPrice={out.avgPrice as number}
          minPrice={out.minPrice as number}
          maxPrice={out.maxPrice as number}
          avgPriceM2={out.avgPriceM2 as number}
          avgDuration={out.avgDuration as number | undefined}
          calcArea={out.calcArea as number | undefined}
          avgScore={out.avgScore as number | undefined}
          avgDistance={out.avgDistance as number | undefined}
          avgAge={out.avgAge as number | undefined}
          searchRadius={out.searchRadius as number | undefined}
          cadastralArea={out.cadastralArea as string | undefined}
          parcelNumber={out.parcelNumber as string | undefined}
          address={out.address as string | undefined}
          propertyType={out.propertyType as string | undefined}
          emailSent={out.emailSent as boolean | undefined}
          contactEmail={out.contactEmail as string | undefined}
        />
      );
    default:
      return null;
  }
}

// Global render function called by hugo-widget.js
function renderWidget(container: HTMLElement, toolName: string, args: Record<string, unknown>, output?: Record<string, unknown>) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <WidgetBridge toolName={toolName} args={args} output={output || {}} />
    </React.StrictMode>
  );
  return root;
}

// Expose globally
(window as any).HugoWidgetReact = { renderWidget };
