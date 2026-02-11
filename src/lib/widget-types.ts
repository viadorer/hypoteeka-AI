// Widget type definitions - AI returns these to control which widgets to show

export type WidgetType =
  | 'property'
  | 'payment'
  | 'eligibility'
  | 'rent_vs_buy'
  | 'investment'
  | 'affordability'
  | 'refinance'
  | 'amortization'
  | 'lead_capture';

export interface PropertyWidgetData {
  type: 'property';
  propertyPrice: number;
  propertyType?: string;
  location?: string;
}

export interface PaymentWidgetData {
  type: 'payment';
  propertyPrice: number;
  equity: number;
  rate?: number;
  years?: number;
}

export interface EligibilityWidgetData {
  type: 'eligibility';
  propertyPrice: number;
  equity: number;
  monthlyIncome: number;
  isYoung?: boolean;
}

export interface RentVsBuyWidgetData {
  type: 'rent_vs_buy';
  propertyPrice: number;
  equity: number;
  monthlyRent: number;
}

export interface InvestmentWidgetData {
  type: 'investment';
  purchasePrice: number;
  equity: number;
  monthlyRentalIncome: number;
  monthlyExpenses?: number;
}

export interface AffordabilityWidgetData {
  type: 'affordability';
  monthlyIncome: number;
  equity: number;
  isYoung?: boolean;
}

export interface RefinanceWidgetData {
  type: 'refinance';
  remainingBalance: number;
  currentRate: number;
  newRate: number;
  remainingYears: number;
}

export interface AmortizationWidgetData {
  type: 'amortization';
  loanAmount: number;
  rate?: number;
  years?: number;
}

export interface LeadCaptureWidgetData {
  type: 'lead_capture';
  prefilledName?: string;
  prefilledEmail?: string;
  prefilledPhone?: string;
  context?: string;
}

export type WidgetData =
  | PropertyWidgetData
  | PaymentWidgetData
  | EligibilityWidgetData
  | RentVsBuyWidgetData
  | InvestmentWidgetData
  | AffordabilityWidgetData
  | RefinanceWidgetData
  | AmortizationWidgetData
  | LeadCaptureWidgetData;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  widgets?: WidgetData[];
  timestamp: Date;
}
