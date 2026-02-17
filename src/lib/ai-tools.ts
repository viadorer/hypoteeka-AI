import { z } from 'zod';
import {
  calculateAnnuity,
  calculateTotalInterest,
  checkEligibility,
  compareRentVsBuy,
  calculateInvestment,
  calculateAffordability,
  calculateRefinance,
  calculateStressTest,
  DEFAULTS,
} from './calculations';
import { formatCZK, formatPercent } from './format';
import { getDynamicDefaultRate, getMarketRates, getBankRates } from './data/rates';
import { getCnbLimits } from './data/cnb-limits';
import { sendBrevoEmail, buildCalculationEmailHtml } from './brevo';

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
    description: 'Zobraz vypocet mesicni splatky hypoteky s porovnanim sazeb (nejvyssi/prumerna/nejnizsi na trhu). Pouzij kdyz mas cenu nemovitosti a vlastni zdroje.',
    inputSchema: z.object({
      propertyPrice: z.number().describe('Cena nemovitosti v CZK'),
      equity: z.number().describe('Vlastni zdroje v CZK'),
      years: z.number().optional().describe('Doba splatnosti v letech. Pokud klient neuvedl, NEZADAVEJ - system pouzije 30 let.'),
    }),
    execute: async ({ propertyPrice, equity, years }: { propertyPrice: number; equity: number; years?: number }) => {
      const rates = await getMarketRates();
      const y = years ?? DEFAULTS.years;
      const loan = propertyPrice - equity;

      // Collect all available fixation rates to find min/max
      const fixRates = [
        rates.mortgageRateFix1y,
        rates.mortgageRateFix5y,
        rates.mortgageRateFix10y,
        rates.mortgageRateFix10yPlus,
      ].filter(r => r > 0);

      // Highest rate on market
      const highRate = fixRates.length > 0
        ? Math.max(...fixRates) / 100
        : (rates.mortgageAvgRate > 0 ? (rates.mortgageAvgRate + 0.5) / 100 : DEFAULTS.rate + 0.01);
      // Average market rate
      const avgRate = rates.mortgageRateFix5y > 0
        ? rates.mortgageRateFix5y / 100
        : (rates.mortgageAvgRate > 0 ? rates.mortgageAvgRate / 100 : DEFAULTS.rate);
      // Lowest rate on market
      const lowRate = fixRates.length > 0
        ? Math.min(...fixRates) / 100
        : avgRate - 0.005;

      const highMonthly = calculateAnnuity(loan, highRate, y * 12);
      const avgMonthly = calculateAnnuity(loan, avgRate, y * 12);
      const lowMonthly = calculateAnnuity(loan, lowRate, y * 12);

      const highInterest = calculateTotalInterest(highMonthly, loan, y * 12);
      const avgInterest = calculateTotalInterest(avgMonthly, loan, y * 12);
      const lowInterest = calculateTotalInterest(lowMonthly, loan, y * 12);

      return {
        loanAmount: loan,
        years: y,
        scenarios: {
          high: { rate: highRate, monthly: Math.round(highMonthly), totalInterest: Math.round(highInterest), label: 'Nejvyssi na trhu' },
          avg: { rate: avgRate, monthly: Math.round(avgMonthly), totalInterest: Math.round(avgInterest), label: 'Prumer trhu' },
          our: { rate: lowRate, monthly: Math.round(lowMonthly), totalInterest: Math.round(lowInterest), label: 'Nejnizsi na trhu' },
        },
        saving: Math.round(highInterest - lowInterest),
        monthlySaving: Math.round(highMonthly - lowMonthly),
        rate: avgRate,
        rpsn: rates.mortgageRpsn > 0 ? rates.mortgageRpsn / 100 : avgRate * 1.04,
        summary: `Splatka: ${formatCZK(Math.round(avgMonthly))}/mes (prumer ${formatPercent(avgRate)}). Rozsah trhu: ${formatPercent(lowRate)} az ${formatPercent(highRate)}. Rozdil az ${formatCZK(Math.round(highInterest - lowInterest))} za celou dobu. V praxi se zkuseny poradce dokaze dostat i pod nejnizsi sazbu.`,
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

  show_stress_test: {
    description: 'Zobraz stress test - co se stane se splatkou kdyz sazba vzroste o 1/2/3 procentni body po refixaci. Pouzij kdyz klient chce vedet rizika, pta se na refixaci, nebo chce videt scenare.',
    inputSchema: z.object({
      loanAmount: z.number().describe('Vyse uveru v CZK'),
      rate: z.number().optional().describe('Aktualni rocni sazba. Pokud klient neuvedl, NEZADAVEJ.'),
      years: z.number().optional().describe('Doba splatnosti v letech. Pokud klient neuvedl, NEZADAVEJ.'),
    }),
    execute: async ({ loanAmount, rate, years }: { loanAmount: number; rate?: number; years?: number }) => {
      const dynamic = await getDynamicDefaultRate();
      const r = rate ?? dynamic.rate;
      const y = years ?? DEFAULTS.years;
      const result = calculateStressTest(loanAmount, r, y);
      const worst = result.scenarios[result.scenarios.length - 1];
      return {
        ...result,
        summary: `Stress test: pri sazbe +${(worst.rateChange * 100).toFixed(0)}pp (${formatPercent(worst.newRate)}) splatka vzroste o ${formatCZK(worst.difference)}/mes na ${formatCZK(worst.monthlyPayment)}`,
        displayed: true,
      };
    },
  },

  geocode_address: {
    description: 'Zobraz naseptavac adresy pro overeni nemovitosti. POVINNY krok PRED odeslanim oceneni. Klient vybere adresu z naseptavace a system ji ulozi. VZDY predvyplni query adresou kterou klient zminil (napr. "drevena 3 Plzen"). Zavolej SPOLECNE s update_profile pokud klient zminil i dalsi udaje (typ, plocha, stav...).',
    inputSchema: z.object({
      query: z.string().optional().describe('Adresa z klientovy zpravy pro predvyplneni naseptavace -- VZDY vyplnit pokud klient zminil adresu'),
    }),
    execute: async ({ query }: { query?: string }) => {
      return {
        success: true,
        widgetDisplayed: true,
        query: query ?? '',
        summary: 'Naseptavac adresy zobrazen. Pockej az klient vybere a potvrdi adresu. Klient posle zpravu s ADDRESS_DATA -- z ni ziskej lat, lng, street, streetNumber, city, district, region, postalCode pro request_valuation.',
        displayed: true,
      };
    },
  },

  request_valuation: {
    description: 'Odesli zadost o oceneni nemovitosti. Data se ctou z PROFILU klienta -- NEMUSIS je predavat. Pred volanim MUSIS mit v profilu (pres update_profile): (1) validovanou adresu (klient vybral z naseptavace), (2) jmeno + email, (3) typ nemovitosti, (4) povinne parametry. Pokud neco chybi, tool ti rekne co. Zavolej az klient potvrdil shrnuti. VZDY PRED timto toolem zavolej update_profile se vsemi daty. Parametr kind: "sale" = odhad prodejni ceny (default), "lease" = odhad najemniho vynos. Pro investicni nemovitost nebo porovnani najem vs hypoteka pouzij "lease".',
    inputSchema: z.object({
      confirm: z.boolean().optional().describe('Klient potvrdil shrnuti'),
      kind: z.enum(['sale', 'lease']).optional().describe('Typ oceneni: "sale" = prodejni cena (default), "lease" = najemni vynos. Pro investice nebo najem vs hypo pouzij "lease".'),
    }),
    execute: async () => {
      // Skutečné odeslání probíhá v onStepFinish v chat/route.ts,
      // kde máme přístup k aktuálnímu profilu s nejnovějšími daty.
      // Tento execute jen signalizuje intent.
      return {
        success: true,
        pending: true,
        summary: 'Odesilam zadost o oceneni...',
        displayed: true,
      };
    },
  },

  show_valuation: {
    description: 'Zobraz formular pro oceneni nemovitosti (FALLBACK). Preferuj geocode_address + request_valuation pro presnejsi vysledky pres API. Tento widget pouzij jen kdyz API cesta neni mozna nebo klient chce jednodussi formular.',
    inputSchema: z.object({
      context: z.string().optional().describe('Kratky kontext proc klient chce oceneni (napr. "pro ucel hypoteky", "pred prodejem")'),
    }),
    execute: async ({ context }: { context?: string }) => {
      return { context, formDisplayed: true, summary: 'Formular pro oceneni nemovitosti zobrazen.', displayed: true };
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
    description: 'VZDY zavolej tento nastroj kdyz klient uvede jakakoliv nova data. Ulozi data pro dalsi pouziti. Zavolej PRED nebo SPOLECNE s widgety. Pri oceneni: kdyz klient rekne "byt 2+1 v Plzni Drevena 3, 65m2, cihla" -> zavolej update_profile(propertyType="byt", propertySize="2+1", location="Plzen", floorArea=65, propertyConstruction="brick") + geocode_address(query="Drevena 3 Plzen") SOUCASNE.',
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
      propertySize: z.string().optional().describe('Dispozice: 1+kk, 2+kk, 3+1 atd.'),
      floorArea: z.number().optional().describe('Uzitna plocha v m2'),
      lotArea: z.number().optional().describe('Plocha pozemku v m2'),
      propertyRating: z.string().optional().describe('Stav nemovitosti: bad, nothing_much, good, very_good, new, excellent'),
      propertyConstruction: z.string().optional().describe('Konstrukce: brick, panel, wood, stone, montage, mixed'),
      propertyFloor: z.number().optional().describe('Patro (0 = prizemi)'),
      propertyTotalFloors: z.number().optional().describe('Celkovy pocet podlazi'),
      propertyElevator: z.boolean().optional().describe('Vytah v budove'),
      propertyOwnership: z.string().optional().describe('Vlastnictvi: private, cooperative, council'),
      preferredRate: z.number().optional().describe('Sazba kterou klient zminil (napr. 0.0375 pro 3.75%)'),
    }),
    execute: async (data: Record<string, unknown>) => {
      // Data se zpracovávají v API route přes onStepFinish
      const fields = Object.keys(data).filter(k => data[k] !== undefined);
      return { updated: fields, summary: `Profil aktualizovan: ${fields.join(', ')}` };
    },
  },

  send_email_summary: {
    description: 'Posli shrnuti kalkulace na email klienta. Pouzij kdyz klient zada email a chce dostat vysledky na email, nebo kdyz nabidnes zaslani a klient souhlasi. VZDY nejdriv zavolej update_profile s emailem.',
    inputSchema: z.object({
      email: z.string().describe('Email klienta'),
      name: z.string().optional().describe('Jmeno klienta'),
      propertyPrice: z.number().optional().describe('Cena nemovitosti'),
      equity: z.number().optional().describe('Vlastni zdroje'),
      loanAmount: z.number().optional().describe('Vyse uveru'),
      monthlyPayment: z.number().optional().describe('Mesicni splatka'),
      rate: z.number().optional().describe('Urokova sazba'),
      years: z.number().optional().describe('Splatnost v letech'),
      totalInterest: z.number().optional().describe('Celkem na urocich'),
      ltvOk: z.boolean().optional().describe('LTV splneno'),
      dstiOk: z.boolean().optional().describe('DSTI splneno'),
      dtiOk: z.boolean().optional().describe('DTI splneno'),
      ltvValue: z.number().optional().describe('LTV hodnota'),
      dstiValue: z.number().optional().describe('DSTI hodnota'),
      dtiValue: z.number().optional().describe('DTI hodnota'),
    }),
    execute: async (data: {
      email: string; name?: string;
      propertyPrice?: number; equity?: number; loanAmount?: number;
      monthlyPayment?: number; rate?: number; years?: number; totalInterest?: number;
      ltvOk?: boolean; dstiOk?: boolean; dtiOk?: boolean;
      ltvValue?: number; dstiValue?: number; dtiValue?: number;
    }) => {
      const html = buildCalculationEmailHtml(data);
      const result = await sendBrevoEmail({
        to: data.email,
        toName: data.name,
        subject: 'Vaše kalkulace hypotéky -- Hypoteeka AI',
        htmlContent: html,
      });
      if (result.success) {
        return { sent: true, summary: `Email se shrnutím odeslán na ${data.email}.` };
      }
      return { sent: false, error: result.error, summary: `Nepodařilo se odeslat email: ${result.error}` };
    },
  },

  get_news: {
    description: 'Nacti aktualni novinky a clanky z naseho webu. Pouzij kdyz se klient pta na novinky, aktuality, zmeny sazeb, zmeny limitu CNB, nebo co je noveho. Vraci seznam clanku s obsahem.',
    inputSchema: z.object({
      query: z.string().optional().describe('Volitelne klicove slovo pro filtrovani clanku (napr. "sazby", "CNB", "limity")'),
    }),
    execute: async ({ query }: { query?: string }) => {
      const { storage } = await import('./storage');
      const articles = await storage.listNews();
      let filtered = articles;
      if (query) {
        const q = query.toLowerCase();
        filtered = articles.filter(a =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          (a.summary && a.summary.toLowerCase().includes(q))
        );
      }
      if (filtered.length === 0) {
        return { articles: [], summary: 'Žádné novinky nebyly nalezeny.' };
      }
      return {
        articles: filtered.map(a => ({
          title: a.title,
          summary: a.summary,
          content: a.content,
          publishedAt: a.publishedAt,
        })),
        summary: `Nalezeno ${filtered.length} článků.`,
      };
    },
  },

  show_rate_comparison: {
    description: 'Zobraz porovnani urokovych sazeb na trhu. Pouzij kdyz se klient pta na sazby, porovnani bank, nebo chce videt aktualni sazby. Sazby jsou anonymni (bez nazvu bank) a vychazi z prumeru CNB.',
    inputSchema: z.object({
      loanAmount: z.number().describe('Vyse uveru v CZK'),
      years: z.number().optional().describe('Doba splatnosti v letech. Pokud klient neuvedl, NEZADAVEJ - system pouzije 30 let.'),
    }),
    execute: async ({ loanAmount, years }: { loanAmount: number; years?: number }) => {
      const rates = await getMarketRates();
      const y = years ?? DEFAULTS.years;

      const fixRates = [
        rates.mortgageRateFix1y,
        rates.mortgageRateFix5y,
        rates.mortgageRateFix10y,
        rates.mortgageRateFix10yPlus,
      ].filter(r => r > 0);

      const avgRate = rates.mortgageRateFix5y > 0
        ? rates.mortgageRateFix5y / 100
        : (rates.mortgageAvgRate > 0 ? rates.mortgageAvgRate / 100 : DEFAULTS.rate);

      const highRate = fixRates.length > 0
        ? Math.max(...fixRates) / 100
        : avgRate + 0.005;
      const lowRate = fixRates.length > 0
        ? Math.min(...fixRates) / 100
        : avgRate - 0.005;

      // Generate 5 anonymous "bank" tiers from real ČNB data
      const spread = highRate - lowRate;
      const tiers = [
        { label: 'Banka A', rate: lowRate, color: '#22c55e' },
        { label: 'Banka B', rate: lowRate + spread * 0.25, color: '#06b6d4' },
        { label: 'Banka C', rate: avgRate, color: '#f59e0b' },
        { label: 'Banka D', rate: lowRate + spread * 0.75, color: '#6366f1' },
        { label: 'Banka E', rate: highRate, color: '#ef4444' },
      ].sort((a, b) => a.rate - b.rate);

      const calc = (rate: number) => {
        const mr = rate / 12;
        const np = y * 12;
        return mr > 0 ? (loanAmount * mr) / (1 - Math.pow(1 + mr, -np)) : loanAmount / np;
      };

      const banks = tiers.map(t => ({
        label: t.label,
        rate: t.rate,
        monthly: Math.round(calc(t.rate)),
        color: t.color,
      }));

      const bestMonthly = banks[0].monthly;
      const worstMonthly = banks[banks.length - 1].monthly;
      const totalDiff = Math.round((worstMonthly - bestMonthly) * y * 12);

      return {
        loanAmount,
        years: y,
        banks,
        bestRate: banks[0].rate,
        worstRate: banks[banks.length - 1].rate,
        bestMonthly,
        worstMonthly,
        totalDifference: totalDiff,
        summary: `Porovnani sazeb: ${formatPercent(banks[0].rate)} az ${formatPercent(banks[banks.length - 1].rate)}. Rozdil az ${formatCZK(totalDiff)} za celou dobu. Zkuseny poradce se dokaze dostat i pod nejnizsi sazbu.`,
        displayed: true,
      };
    },
  },

  show_timeline: {
    description: 'Zobraz casovou osu procesu koupe/prodeje/refinancovani nemovitosti. Pouzij kdyz se klient pta na postup, kroky, jak to probiha, co ho ceka. Edukacni widget.',
    inputSchema: z.object({
      type: z.enum(['koupe', 'prodej', 'refinancovani']).describe('Typ procesu'),
      currentStep: z.number().optional().describe('Aktualni krok (0-indexed). Pokud nevis, NEZADAVEJ.'),
    }),
    execute: async ({ type, currentStep }: { type: 'koupe' | 'prodej' | 'refinancovani'; currentStep?: number }) => {
      return {
        type,
        currentStep,
        summary: `Casova osa procesu ${type} zobrazena.`,
        displayed: true,
      };
    },
  },

  show_checklist: {
    description: 'Zobraz interaktivni checklist dokumentu potrebnych ke koupi/prodeji/refinancovani. Pouzij kdyz se klient pta na dokumenty, co potrebuje pripravit, nebo co ma mit s sebou.',
    inputSchema: z.object({
      type: z.enum(['koupe', 'prodej', 'refinancovani']).describe('Typ transakce'),
    }),
    execute: async ({ type }: { type: 'koupe' | 'prodej' | 'refinancovani' }) => {
      return {
        type,
        summary: `Checklist dokumentu pro ${type} zobrazen.`,
        displayed: true,
      };
    },
  },

  show_appointment: {
    description: 'Zobraz widget pro rezervaci terminu konzultace se specialistou. Pouzij kdyz klient chce domluvit schuzku, termin, konzultaci. Alternativa k show_lead_capture kdyz klient preferuje konkretni cas.',
    inputSchema: z.object({
      specialistName: z.string().optional().describe('Jmeno specialisty (napr. "Misa", "Filip"). Pokud nevis, NEZADAVEJ.'),
      context: z.string().optional().describe('Kratky kontext co klient potrebuje (napr. "Konzultace k hypotece na byt v Praze")'),
    }),
    execute: async ({ specialistName, context }: { specialistName?: string; context?: string }) => {
      return {
        specialistName,
        context,
        summary: 'Widget pro rezervaci terminu zobrazen.',
        displayed: true,
      };
    },
  },

  show_quick_replies: {
    description: 'Zobraz interaktivni tlacitka s moznostmi k vyber. Pouzij VZDY kdyz nabizis vyber z vice moznosti (napr. typ nemovitosti: byt/dum/pozemek, ucel: vlastni bydleni/investice/refinancovani). NIKDY nevypisuj moznosti textem - vzdy pouzij tato tlacitka.',
    inputSchema: z.object({
      question: z.string().describe('Otazka nebo instrukce pro klienta (napr. "O jakou nemovitost se jedna?")'),
      options: z.array(z.object({
        label: z.string().describe('Text na tlacitku (napr. "Byt")'),
        value: z.string().describe('Hodnota ktera se odesle kdyz klient klikne (napr. "byt")'),
      })).describe('Pole moznosti - kazda ma label (zobrazeny text) a value (odeslana hodnota)'),
    }),
    execute: async ({ question, options }: { question: string; options: { label: string; value: string }[] }) => {
      return {
        question,
        options,
        summary: `Zobrazeno ${options.length} moznosti k vyberu.`,
        displayed: true,
      };
    },
  },

  show_specialists: {
    description: 'Zobraz widget s dostupnymi specialisty. Pouzij VZDY kdyz nabizis osobni konzultaci, schuzku s poradcem, nebo kdyz klient chce mluvit se specialistou.',
    inputSchema: z.object({}),
    execute: async () => {
      return {
        summary: 'Zobrazeni dostupnych specialistu.',
        displayed: true,
      };
    },
  },

  send_whatsapp_link: {
    description: 'Vygeneruj odkaz na WhatsApp pro kontaktovani poradce nebo zaslani shrnuti. Pouzij kdyz klient chce komunikovat pres WhatsApp nebo kdyz nabidnes WhatsApp a klient souhlasi.',
    inputSchema: z.object({
      phone: z.string().describe('Telefonni cislo klienta (cesky format, napr. +420123456789 nebo 123456789)'),
      message: z.string().describe('Predvyplnena zprava pro WhatsApp'),
    }),
    execute: async ({ phone, message }: { phone: string; message: string }) => {
      // Normalize phone number - strip spaces, dashes, parens
      let digits = phone.replace(/[\s\-\(\)]/g, '');
      // Remove leading + or 00 prefix
      digits = digits.replace(/^\+/, '').replace(/^00/, '');
      // If starts with 420 and has 12+ digits, it already has Czech prefix
      // If 9 digits (Czech local), add 420
      if (!digits.startsWith('420') || digits.length <= 9) {
        digits = '420' + digits;
      }
      const normalized = '+' + digits;
      const encoded = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${digits}?text=${encoded}`;
      return {
        whatsappUrl,
        phone: normalized,
        summary: `WhatsApp odkaz připraven pro ${normalized}`,
        displayed: true,
      };
    },
  },
};
