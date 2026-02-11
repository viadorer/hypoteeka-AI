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
import { getDynamicDefaultRate } from './data/rates';
import { getCnbLimits } from './data/cnb-limits';

export const toolDefinitions = {
  show_property: {
    description: 'Zobraz kartu nemovitosti s cenou a detaily. Pouzij kdyz klient zminuje cenu nebo typ nemovitosti.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Cena nemovitosti v CZK'),
      propertyType: z.string().optional().describe('Typ: byt, dum, pozemek'),
      location: z.string().optional().describe('Lokalita pokud je znama'),
    }),
    execute: async ({ propertyPrice, propertyType, location }: { propertyPrice: number; propertyType?: string; location?: string }) => {
      return { propertyPrice, propertyType, location, displayed: true };
    },
  },

  show_payment: {
    description: 'Zobraz vypocet mesicni splatky hypoteky. Pouzij kdyz mas cenu nemovitosti a vlastni zdroje.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Cena nemovitosti v CZK'),
      equity: z.number().describe('Vlastni zdroje v CZK'),
      rate: z.number().optional().describe('Rocni urokova sazba jako desetinne cislo (napr. 0.045 = 4,5 %). Pokud klient neuvedl, NEZADAVEJ - system pouzije aktualni trzni sazbu.'),
      years: z.number().optional().describe('Doba splatnosti v letech. Pokud klient neuvedl, NEZADAVEJ - system pouzije 30 let.'),
    }),
    execute: async ({ propertyPrice, equity, rate, years }: { propertyPrice: number; equity: number; rate?: number; years?: number }) => {
      const dynamic = await getDynamicDefaultRate();
      const r = rate ?? dynamic.rate;
      const y = years ?? DEFAULTS.years;
      const loan = propertyPrice - equity;
      const monthly = calculateAnnuity(loan, r, y * 12);
      const totalInterest = calculateTotalInterest(monthly, loan, y * 12);
      return {
        loanAmount: loan,
        monthlyPayment: Math.round(monthly),
        totalInterest: Math.round(totalInterest),
        rate: r,
        rpsn: dynamic.rpsn,
        years: y,
        summary: `Mesicni splatka: ${formatCZK(Math.round(monthly))}, uver: ${formatCZK(loan)}, sazba: ${formatPercent(r)}`,
        displayed: true,
      };
    },
  },

  show_eligibility: {
    description: 'Zobraz kontrolu bonity podle pravidel CNB (LTV, DSTI, DTI). Pouzij kdyz mas cenu, vlastni zdroje A prijem.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Cena nemovitosti v CZK'),
      equity: z.number().describe('Vlastni zdroje v CZK'),
      monthlyIncome: z.number().describe('Cisty mesicni prijem v CZK'),
      isYoung: z.boolean().optional().describe('Je klient mladsi 36 let?'),
    }),
    execute: async ({ propertyPrice, equity, monthlyIncome, isYoung }: { propertyPrice: number; equity: number; monthlyIncome: number; isYoung?: boolean }) => {
      const limits = await getCnbLimits();
      const result = checkEligibility(propertyPrice, equity, monthlyIncome, isYoung, limits);
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
    description: 'Porovnej najem vs koupi. Pouzij kdyz se klient pta na srovnani najmu a hypoteky.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Cena nemovitosti v CZK'),
      equity: z.number().describe('Vlastni zdroje v CZK'),
      monthlyRent: z.number().describe('Aktualni nebo odhadovany mesicni najem v CZK'),
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
    description: 'Zobraz analyzu investicni nemovitosti s ROI, ROE, cash flow. Pouzij pro dotazy na investicni nemovitosti.',
    inputSchema: z.object({
      purchasePrice: z.number().describe('Kupni cena v CZK'),
      equity: z.number().describe('Vlastni zdroje v CZK'),
      monthlyRentalIncome: z.number().describe('Ocekavany mesicni prijem z najmu v CZK'),
      monthlyExpenses: z.number().optional().describe('Mesicni naklady (udrzba, pojisteni atd.) v CZK'),
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
    description: 'Zobraz kolik si klient muze dovolit. Pouzij kdyz se pta "kolik si muzu dovolit" nebo "jaky cenovy rozsah".',
    inputSchema: z.object({
      monthlyIncome: z.number().describe('Cisty mesicni prijem v CZK'),
      equity: z.number().describe('Dostupne vlastni zdroje v CZK'),
      isYoung: z.boolean().optional().describe('Je klient mladsi 36 let?'),
    }),
    execute: async ({ monthlyIncome, equity, isYoung }: { monthlyIncome: number; equity: number; isYoung?: boolean }) => {
      const [limits, dynamic] = await Promise.all([getCnbLimits(), getDynamicDefaultRate()]);
      const result = calculateAffordability(monthlyIncome, equity, isYoung, limits, dynamic.rate);
      return {
        ...result,
        summary: `Maximalni cena nemovitosti: ${formatCZK(result.maxPropertyPrice)}, max uver: ${formatCZK(result.maxLoan)}, splatka: ${formatCZK(result.monthlyPayment)}/mes`,
        displayed: true,
      };
    },
  },

  show_refinance: {
    description: 'Zobraz srovnani refinancovani. Pouzij kdyz se klient pta na refinancovani stavajici hypoteky.',
    inputSchema: z.object({
      remainingBalance: z.number().describe('Zbyvajici zustatek hypoteky v CZK'),
      currentRate: z.number().describe('Aktualni rocni urokova sazba (napr. 0.06 = 6 %)'),
      newRate: z.number().optional().describe('Nova sazba pro srovnani. Pokud klient neuvedl, NEZADAVEJ - system pouzije aktualni trzni sazbu.'),
      remainingYears: z.number().describe('Zbyvajici roky splatnosti'),
    }),
    execute: async ({ remainingBalance, currentRate, newRate, remainingYears }: { remainingBalance: number; currentRate: number; newRate?: number; remainingYears: number }) => {
      const dynamic = await getDynamicDefaultRate();
      const result = calculateRefinance(remainingBalance, currentRate, newRate ?? dynamic.rate, remainingYears);
      return {
        ...result,
        summary: `Uspora: ${formatCZK(result.monthlySaving)}/mes, celkem: ${formatCZK(result.totalSaving)}`,
        displayed: true,
      };
    },
  },

  show_amortization: {
    description: 'Zobraz amortizacni plan / graf. Pouzij kdyz klient chce videt rozlozeni splatek v case.',
    inputSchema: z.object({
      loanAmount: z.number().describe('Vyse uveru v CZK'),
      rate: z.number().optional().describe('Rocni sazba. Pokud klient neuvedl, NEZADAVEJ - system pouzije aktualni trzni sazbu.'),
      years: z.number().optional().describe('Doba splatnosti v letech. Pokud klient neuvedl, NEZADAVEJ - system pouzije 30 let.'),
    }),
    execute: async ({ loanAmount, rate, years }: { loanAmount: number; rate?: number; years?: number }) => {
      const dynamic = await getDynamicDefaultRate();
      const r = rate ?? dynamic.rate;
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
    description: 'Zobraz kontaktni formular. Pouzij kdyz: (1) klient splnuje podminky a chce pokracovat, (2) klient explicitne zada o pomoc specialisty, (3) konverzace dosahla bodu kde by zivý poradce pridal hodnotu. NEZOBRAZUJ prilis brzy.',
    inputSchema: z.object({
      context: z.string().describe('Kratke shrnuti co klient potrebuje, pro poradce'),
      prefilledName: z.string().optional(),
      prefilledEmail: z.string().optional(),
      prefilledPhone: z.string().optional(),
    }),
    execute: async ({ context }: { context: string; prefilledName?: string; prefilledEmail?: string; prefilledPhone?: string }) => {
      return { context, formDisplayed: true, summary: 'Formular pro kontakt zobrazen.' };
    },
  },

  update_profile: {
    description: 'VZDY zavolej tento nastroj kdyz klient uvede jakakoliv nova data (cena, zdroje, prijem, vek, jmeno, typ nemovitosti, lokalita, najem atd.). Ulozi data pro dalsi pouziti. Zavolej PRED nebo SPOLECNE s widgety.',
    inputSchema: z.object({
      propertyPrice: z.number().optional().describe('Cena nemovitosti v CZK'),
      propertyType: z.string().optional().describe('byt, dum, pozemek, rekonstrukce'),
      location: z.string().optional().describe('Mesto nebo oblast'),
      purpose: z.string().optional().describe('vlastni_bydleni, investice, refinancovani'),
      equity: z.number().optional().describe('Vlastni zdroje v CZK'),
      monthlyIncome: z.number().optional().describe('Cisty mesicni prijem v CZK'),
      partnerIncome: z.number().optional().describe('Cisty mesicni prijem partnera v CZK'),
      age: z.number().optional().describe('Vek klienta'),
      currentRent: z.number().optional().describe('Aktualni mesicni najem v CZK'),
      expectedRentalIncome: z.number().optional().describe('Ocekavany prijem z najmu investicni nemovitosti'),
      existingLoans: z.number().optional().describe('Stavajici mesicni zavazky z uveru'),
      existingMortgageBalance: z.number().optional().describe('Zbyvajici zustatek hypoteky pro refinancovani'),
      existingMortgageRate: z.number().optional().describe('Aktualni sazba hypoteky pro refinancovani'),
      existingMortgageYears: z.number().optional().describe('Zbyvajici roky stavajici hypoteky'),
      name: z.string().optional().describe('Jmeno klienta'),
      email: z.string().optional().describe('Email klienta'),
      phone: z.string().optional().describe('Telefon klienta'),
    }),
    execute: async (data: Record<string, unknown>) => {
      // Data se zpracovávají v API route přes onStepFinish
      const fields = Object.keys(data).filter(k => data[k] !== undefined);
      return { updated: fields, summary: `Profil aktualizovan: ${fields.join(', ')}` };
    },
  },
};
