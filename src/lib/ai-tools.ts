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
    description: 'Odesli zadost o oceneni nemovitosti pres RealVisor API. PRED volanim MUSIS mit: (1) validovanou adresu z geocode_address (lat, lng), (2) kontaktni udaje (firstName, lastName, email), (3) typ nemovitosti, (4) povinne parametry podle typu: BYT = floorArea + rating + localType + ownership + construction, DUM = floorArea + lotArea + rating + ownership + construction + houseType (default family_house), POZEMEK = lotArea. BEZ construction a houseType pro dum oceneni SELZE. Vysledek obsahuje odhadni cenu a je odeslan na email klienta.',
    inputSchema: z.object({
      // Kontakt - povinne
      firstName: z.string().describe('Jmeno klienta'),
      lastName: z.string().describe('Prijmeni klienta'),
      email: z.string().describe('Email klienta - na tento email prijde vysledek'),
      phone: z.string().optional().describe('Telefon klienta - silne doporuceny'),
      // Nemovitost - povinne
      kind: z.enum(['sale', 'lease']).describe('Typ nabidky: sale = prodej, lease = pronajem'),
      propertyType: z.enum(['flat', 'house', 'land']).describe('Typ nemovitosti'),
      address: z.string().describe('Validovana adresa z geocode_address (pouzij label)'),
      lat: z.number().describe('GPS sirka z geocode_address'),
      lng: z.number().describe('GPS delka z geocode_address'),
      // Plochy - povinne podle typu
      floorArea: z.number().optional().describe('Uzitna plocha v m2 - POVINNE pro byt a dum'),
      lotArea: z.number().optional().describe('Plocha pozemku v m2 - POVINNE pro dum a pozemek'),
      // Stav - povinny pro byt a dum
      rating: z.enum(['bad', 'nothing_much', 'good', 'very_good', 'new', 'excellent']).optional().describe('Stav nemovitosti - POVINNY pro byt a dum'),
      // Povinne pro byt a dum
      localType: z.string().optional().describe('Dispozice bytu: 1+kk, 2+1, 3+kk atd. POVINNE pro byt'),
      ownership: z.enum(['private', 'cooperative', 'council', 'other']).optional().describe('Vlastnictvi - POVINNE pro byt a dum'),
      construction: z.enum(['brick', 'panel', 'wood', 'stone', 'montage', 'mixed', 'other']).optional().describe('Konstrukce - POVINNE pro byt a dum'),
      houseType: z.enum(['family_house', 'villa', 'cottage', 'hut', 'other']).optional().describe('Typ domu - POVINNE pro dum, default family_house'),
      landType: z.enum(['building', 'garden', 'field', 'meadow', 'forest', 'other']).optional().describe('Typ pozemku - POVINNE pro pozemek, default building'),
      floor: z.number().optional().describe('Patro (0 = prizemi)'),
      totalFloors: z.number().optional().describe('Celkovy pocet podlazi budovy'),
      elevator: z.boolean().optional().describe('Vytah v budove'),
      energyPerformance: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).optional().describe('Energeticky stitek'),
      rooms: z.number().optional().describe('Celkovy pocet pokoju'),
      bathrooms: z.number().optional().describe('Pocet koupelen'),
      bedrooms: z.number().optional().describe('Pocet loznic'),
      balconyArea: z.number().optional().describe('Balkon v m2'),
      terraceArea: z.number().optional().describe('Terasa v m2'),
      cellarArea: z.number().optional().describe('Sklep v m2'),
      gardenArea: z.number().optional().describe('Zahrada v m2'),
      garages: z.number().optional().describe('Pocet garazi'),
      parkingSpaces: z.number().optional().describe('Pocet parkovacich mist'),
      // Strukturovana adresa z geocode
      street: z.string().optional().describe('Ulice z geocode_address'),
      streetNumber: z.string().optional().describe('Cislo z geocode_address'),
      city: z.string().optional().describe('Mesto z geocode_address'),
      district: z.string().optional().describe('Mestska cast z geocode_address'),
      region: z.string().optional().describe('Kraj z geocode_address'),
      postalCode: z.string().optional().describe('PSC z geocode_address'),
    }),
    execute: async (params: Record<string, unknown>) => {
      // Auto-fill defaults that RealVisor requires but Hugo might omit
      if (params.propertyType === 'house' && !params.houseType) params.houseType = 'family_house';
      if (params.propertyType === 'land' && !params.landType) params.landType = 'building';

      // HARD VALIDATION: check all required fields BEFORE sending to API
      const missing: string[] = [];
      if (!params.firstName) missing.push('firstName (jmeno)');
      if (!params.lastName) missing.push('lastName (prijmeni)');
      if (!params.email) missing.push('email');
      if (!params.lat || !params.lng) missing.push('lat/lng (adresa nebyla validovana pres geocode_address)');
      if (params.propertyType === 'flat') {
        if (!params.floorArea) missing.push('floorArea (uzitna plocha)');
        if (!params.rating) missing.push('rating (stav nemovitosti)');
        if (!params.localType) missing.push('localType (dispozice: 1+kk, 2+1...)');
        if (!params.ownership) missing.push('ownership (vlastnictvi: private/cooperative)');
        if (!params.construction) missing.push('construction (konstrukce: brick/panel/wood)');
      } else if (params.propertyType === 'house') {
        if (!params.floorArea) missing.push('floorArea (uzitna plocha)');
        if (!params.lotArea) missing.push('lotArea (plocha pozemku)');
        if (!params.rating) missing.push('rating (stav nemovitosti)');
        if (!params.ownership) missing.push('ownership (vlastnictvi: private/cooperative)');
        if (!params.construction) missing.push('construction (konstrukce: brick/panel/wood)');
      } else if (params.propertyType === 'land') {
        if (!params.lotArea) missing.push('lotArea (plocha pozemku)');
      }
      if (missing.length > 0) {
        return {
          success: false,
          missingFields: missing,
          summary: `NELZE odeslat oceneni -- chybi povinne udaje: ${missing.join(', ')}. Zeptej se klienta na chybejici informace a zavolej request_valuation znovu.`,
        };
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      try {
        const res = await fetch(`${baseUrl}/api/valuation/valuo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (!res.ok) {
          const text = await res.text();
          let detail = text;
          try { detail = JSON.parse(text).message ?? text; } catch { /* keep raw */ }
          return { success: false, error: detail, summary: `Oceneni se nepodarilo: ${detail}` };
        }
        const data = await res.json();
        if (!data.success) {
          return { success: false, error: data.error ?? 'Valuo API selhalo', summary: 'Oceneni se nepodarilo. Zkus to znovu s jinymi parametry.' };
        }
        const v = data.valuation;
        const fmtPrice = (n: number) => Math.round(n).toLocaleString('cs-CZ');
        return {
          success: true,
          valuationId: data.valuationId,
          propertyId: data.propertyId,
          avgPrice: v?.avgPrice,
          minPrice: v?.minPrice,
          maxPrice: v?.maxPrice,
          avgPriceM2: v?.avgPriceM2,
          avgDuration: v?.avgDuration,
          emailSent: data.emailSent,
          contactEmail: params.email,
          summary: v
            ? `Oceneni dokonceno. Odhadni cena: ${fmtPrice(v.avgPrice)} Kc (rozmezi ${fmtPrice(v.minPrice)} - ${fmtPrice(v.maxPrice)} Kc). Cena za m2: ${fmtPrice(v.avgPriceM2)} Kc/m2. Prumerna doba prodeje: ${v.avgDuration} dni. Vysledek odeslan na email ${params.email}.`
            : 'Oceneni dokonceno, ale bez cenoveho vysledku.',
          displayed: true,
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Network error', summary: 'Chyba pri odesilani oceneni.' };
      }
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
