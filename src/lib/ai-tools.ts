import { z } from 'zod';
import {
  calculateAnnuity,
  calculateTotalInterest,
  checkEligibility,
  compareRentVsBuy,
  calculateInvestment,
  calculateAffordability,
  calculateRefinance,
  DEFAULTS,
} from './calculations';
import { formatCZK, formatPercent } from './format';

export const toolDefinitions = {
  show_property: {
    description: 'Show property card with price and details. Use when user mentions a property price or type.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Property price in CZK'),
      propertyType: z.string().optional().describe('Type: byt, dum, pozemek'),
      location: z.string().optional().describe('Location if mentioned'),
    }),
    execute: async ({ propertyPrice, propertyType, location }: { propertyPrice: number; propertyType?: string; location?: string }) => {
      return { propertyPrice, propertyType, location, displayed: true };
    },
  },

  show_payment: {
    description: 'Show mortgage payment calculation. Use when you have property price and equity.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Property price in CZK'),
      equity: z.number().describe('Own funds / equity in CZK'),
      rate: z.number().optional().describe('Annual interest rate, default 0.045'),
      years: z.number().optional().describe('Loan term in years, default 30'),
    }),
    execute: async ({ propertyPrice, equity, rate, years }: { propertyPrice: number; equity: number; rate?: number; years?: number }) => {
      const r = rate ?? DEFAULTS.rate;
      const y = years ?? DEFAULTS.years;
      const loan = propertyPrice - equity;
      const monthly = calculateAnnuity(loan, r, y * 12);
      const totalInterest = calculateTotalInterest(monthly, loan, y * 12);
      return {
        loanAmount: loan,
        monthlyPayment: Math.round(monthly),
        totalInterest: Math.round(totalInterest),
        rate: r,
        years: y,
        summary: `Mesicni splatka: ${formatCZK(Math.round(monthly))}, uver: ${formatCZK(loan)}, sazba: ${formatPercent(r)}`,
        displayed: true,
      };
    },
  },

  show_eligibility: {
    description: 'Show CNB eligibility check (LTV, DSTI, DTI). Use when you have property price, equity AND income.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Property price in CZK'),
      equity: z.number().describe('Own funds in CZK'),
      monthlyIncome: z.number().describe('Net monthly income in CZK'),
      isYoung: z.boolean().optional().describe('Is the client under 36 years old'),
    }),
    execute: async ({ propertyPrice, equity, monthlyIncome, isYoung }: { propertyPrice: number; equity: number; monthlyIncome: number; isYoung?: boolean }) => {
      const result = checkEligibility(propertyPrice, equity, monthlyIncome, isYoung);
      return {
        ...result,
        summary: result.allOk
          ? `Klient splnuje vsechny limity CNB. LTV: ${formatPercent(result.ltvValue)}, DSTI: ${formatPercent(result.dstiValue)}, DTI: ${result.dtiValue.toFixed(1)}x`
          : `Klient nesplnuje limity CNB: ${result.reasons.join('; ')}`,
        displayed: true,
      };
    },
  },

  show_rent_vs_buy: {
    description: 'Compare renting vs buying. Use when user asks about rent vs mortgage comparison.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Property price in CZK'),
      equity: z.number().describe('Own funds in CZK'),
      monthlyRent: z.number().describe('Current or estimated monthly rent in CZK'),
    }),
    execute: async ({ propertyPrice, equity, monthlyRent }: { propertyPrice: number; equity: number; monthlyRent: number }) => {
      const result = compareRentVsBuy(propertyPrice, equity, monthlyRent);
      return {
        ...result,
        summary: `Najem: ${formatCZK(result.monthlyRent)}/mes, splatka: ${formatCZK(result.monthlyMortgage)}/mes, rozdil: ${formatCZK(result.difference)}/mes`,
        displayed: true,
      };
    },
  },

  show_investment: {
    description: 'Show investment property analysis with ROI, ROE, cash flow. Use for investment property questions.',
    inputSchema: z.object({
      purchasePrice: z.number().describe('Purchase price in CZK'),
      equity: z.number().describe('Own funds in CZK'),
      monthlyRentalIncome: z.number().describe('Expected monthly rental income in CZK'),
      monthlyExpenses: z.number().optional().describe('Monthly expenses (maintenance, insurance, etc.) in CZK'),
    }),
    execute: async ({ purchasePrice, equity, monthlyRentalIncome, monthlyExpenses }: { purchasePrice: number; equity: number; monthlyRentalIncome: number; monthlyExpenses?: number }) => {
      const result = calculateInvestment(purchasePrice, equity, monthlyRentalIncome, monthlyExpenses);
      return {
        ...result,
        summary: `Cash flow: ${formatCZK(result.monthlyCashFlow)}/mes, ROE: ${formatPercent(result.roe)}, Cap Rate: ${formatPercent(result.capRate)}`,
        displayed: true,
      };
    },
  },

  show_affordability: {
    description: 'Show how much property the client can afford. Use when user asks "how much can I afford" or "what price range".',
    inputSchema: z.object({
      monthlyIncome: z.number().describe('Net monthly income in CZK'),
      equity: z.number().describe('Available own funds in CZK'),
      isYoung: z.boolean().optional().describe('Is the client under 36'),
    }),
    execute: async ({ monthlyIncome, equity, isYoung }: { monthlyIncome: number; equity: number; isYoung?: boolean }) => {
      const result = calculateAffordability(monthlyIncome, equity, isYoung);
      return {
        ...result,
        summary: `Maximalni cena nemovitosti: ${formatCZK(result.maxPropertyPrice)}, max uver: ${formatCZK(result.maxLoan)}, splatka: ${formatCZK(result.monthlyPayment)}/mes`,
        displayed: true,
      };
    },
  },

  show_refinance: {
    description: 'Show refinancing comparison. Use when user asks about refinancing existing mortgage.',
    inputSchema: z.object({
      remainingBalance: z.number().describe('Remaining mortgage balance in CZK'),
      currentRate: z.number().describe('Current annual interest rate (e.g. 0.06 for 6%)'),
      newRate: z.number().optional().describe('New rate to compare, default 0.045'),
      remainingYears: z.number().describe('Remaining years on the mortgage'),
    }),
    execute: async ({ remainingBalance, currentRate, newRate, remainingYears }: { remainingBalance: number; currentRate: number; newRate?: number; remainingYears: number }) => {
      const result = calculateRefinance(remainingBalance, currentRate, newRate ?? DEFAULTS.rate, remainingYears);
      return {
        ...result,
        summary: `Uspora: ${formatCZK(result.monthlySaving)}/mes, celkem: ${formatCZK(result.totalSaving)}`,
        displayed: true,
      };
    },
  },

  show_amortization: {
    description: 'Show amortization schedule / chart. Use when user wants to see payment breakdown over time.',
    inputSchema: z.object({
      loanAmount: z.number().describe('Loan amount in CZK'),
      rate: z.number().optional().describe('Annual rate, default 0.045'),
      years: z.number().optional().describe('Term in years, default 30'),
    }),
    execute: async ({ loanAmount, rate, years }: { loanAmount: number; rate?: number; years?: number }) => {
      const r = rate ?? DEFAULTS.rate;
      const y = years ?? DEFAULTS.years;
      const monthly = calculateAnnuity(loanAmount, r, y * 12);
      return {
        loanAmount,
        rate: r,
        years: y,
        monthlyPayment: Math.round(monthly),
        totalPaid: Math.round(monthly * y * 12),
        summary: `Amortizacni plan: uver ${formatCZK(loanAmount)}, splatka ${formatCZK(Math.round(monthly))}/mes, ${y} let`,
        displayed: true,
      };
    },
  },

  show_lead_capture: {
    description: 'Show contact form to capture lead. Use when: (1) client meets eligibility criteria and wants to proceed, (2) client explicitly asks for help from a specialist, (3) conversation reaches a point where human advisor would add value. Do NOT show this too early.',
    inputSchema: z.object({
      context: z.string().describe('Brief summary of what the client needs, for the advisor'),
      prefilledName: z.string().optional(),
      prefilledEmail: z.string().optional(),
      prefilledPhone: z.string().optional(),
    }),
    execute: async ({ context }: { context: string; prefilledName?: string; prefilledEmail?: string; prefilledPhone?: string }) => {
      return { context, formDisplayed: true, summary: 'Formular pro kontakt zobrazen.' };
    },
  },

  update_profile: {
    description: 'ALWAYS call this tool when the client provides any new data (price, equity, income, age, name, property type, location, rent, etc.). This stores the data for future reference. Call this BEFORE or TOGETHER WITH display widgets.',
    inputSchema: z.object({
      propertyPrice: z.number().optional().describe('Property price in CZK'),
      propertyType: z.string().optional().describe('byt, dum, pozemek, rekonstrukce'),
      location: z.string().optional().describe('City or area'),
      purpose: z.string().optional().describe('vlastni_bydleni, investice, refinancovani'),
      equity: z.number().optional().describe('Own funds in CZK'),
      monthlyIncome: z.number().optional().describe('Net monthly income in CZK'),
      partnerIncome: z.number().optional().describe('Partner net monthly income in CZK'),
      age: z.number().optional().describe('Client age'),
      currentRent: z.number().optional().describe('Current monthly rent in CZK'),
      expectedRentalIncome: z.number().optional().describe('Expected rental income for investment property'),
      existingLoans: z.number().optional().describe('Existing loan obligations monthly'),
      existingMortgageBalance: z.number().optional().describe('Remaining mortgage balance for refinancing'),
      existingMortgageRate: z.number().optional().describe('Current mortgage rate for refinancing'),
      existingMortgageYears: z.number().optional().describe('Remaining years on existing mortgage'),
      name: z.string().optional().describe('Client name'),
      email: z.string().optional().describe('Client email'),
      phone: z.string().optional().describe('Client phone'),
    }),
    execute: async (data: Record<string, unknown>) => {
      // Data se zpracovávají v API route přes onStepFinish
      const fields = Object.keys(data).filter(k => data[k] !== undefined);
      return { updated: fields, summary: `Profil aktualizovan: ${fields.join(', ')}` };
    },
  },
};
