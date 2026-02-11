// Hypoteeka AI - Calculation Engine
// Based on CNB 2026 methodology

export const DEFAULTS = {
  rate: 0.045,
  rpsn: 0.047,
  months: 360,
  years: 30,
  ltvLimit: 0.80,
  ltvLimitYoung: 0.90,
  dstiLimit: 0.45,
  dtiLimit: 9.5,
};

export function calculateAnnuity(principal: number, rateAnnual = DEFAULTS.rate, months = DEFAULTS.months): number {
  const r = rateAnnual / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export function calculateLTV(loanAmount: number, propertyPrice: number): number {
  return loanAmount / propertyPrice;
}

export function calculateDSTI(monthlyPayment: number, monthlyIncome: number): number {
  return monthlyPayment / monthlyIncome;
}

export function calculateDTI(loanAmount: number, annualIncome: number): number {
  return loanAmount / annualIncome;
}

export function calculateTotalPaid(monthlyPayment: number, months = DEFAULTS.months): number {
  return monthlyPayment * months;
}

export function calculateTotalInterest(monthlyPayment: number, principal: number, months = DEFAULTS.months): number {
  return (monthlyPayment * months) - principal;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function calculateAmortization(
  loanAmount: number,
  rateAnnual = DEFAULTS.rate,
  months = DEFAULTS.months
): AmortizationRow[] {
  const r = rateAnnual / 12;
  const payment = calculateAnnuity(loanAmount, rateAnnual, months);
  const rows: AmortizationRow[] = [];
  let balance = loanAmount;

  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principal = payment - interest;
    balance -= principal;
    rows.push({
      month: i,
      payment: Math.round(payment),
      principal: Math.round(principal),
      interest: Math.round(interest),
      balance: Math.max(0, Math.round(balance)),
    });
  }
  return rows;
}

export interface EligibilityResult {
  ltvValue: number;
  ltvLimit: number;
  ltvOk: boolean;
  dstiValue: number;
  dstiLimit: number;
  dstiOk: boolean;
  dtiValue: number;
  dtiLimit: number;
  dtiOk: boolean;
  allOk: boolean;
  monthlyPayment: number;
  loanAmount: number;
  reasons: string[];
}

export function checkEligibility(
  propertyPrice: number,
  equity: number,
  monthlyIncome: number,
  isYoung = false
): EligibilityResult {
  const loanAmount = propertyPrice - equity;
  const monthlyPayment = calculateAnnuity(loanAmount);
  const ltvValue = calculateLTV(loanAmount, propertyPrice);
  const ltvLimit = isYoung ? DEFAULTS.ltvLimitYoung : DEFAULTS.ltvLimit;
  const dstiValue = calculateDSTI(monthlyPayment, monthlyIncome);
  const dtiValue = calculateDTI(loanAmount, monthlyIncome * 12);

  const ltvOk = ltvValue <= ltvLimit;
  const dstiOk = dstiValue <= DEFAULTS.dstiLimit;
  const dtiOk = dtiValue <= DEFAULTS.dtiLimit;

  const reasons: string[] = [];
  if (!ltvOk) reasons.push(`LTV ${(ltvValue * 100).toFixed(1)} % prekracuje limit ${(ltvLimit * 100).toFixed(0)} % - navyste vlastni zdroje`);
  if (!dstiOk) reasons.push(`DSTI ${(dstiValue * 100).toFixed(1)} % prekracuje limit 45 % - splatka je prilis vysoka vuci prijmu`);
  if (!dtiOk) reasons.push(`DTI ${dtiValue.toFixed(1)}x prekracuje limit 9,5 - celkovy dluh je prilis vysoky`);

  return {
    ltvValue, ltvLimit, ltvOk,
    dstiValue, dstiLimit: DEFAULTS.dstiLimit, dstiOk,
    dtiValue, dtiLimit: DEFAULTS.dtiLimit, dtiOk,
    allOk: ltvOk && dstiOk && dtiOk,
    monthlyPayment,
    loanAmount,
    reasons,
  };
}

export interface RentVsBuyResult {
  monthlyRent: number;
  monthlyMortgage: number;
  difference: number;
  rentIsCheaper: boolean;
  totalRentCost: number;
  totalMortgageCost: number;
  equityAfterYears: number;
  breakEvenYears: number | null;
}

export function compareRentVsBuy(
  propertyPrice: number,
  equity: number,
  monthlyRent: number,
  years = 30
): RentVsBuyResult {
  const loanAmount = propertyPrice - equity;
  const monthlyMortgage = calculateAnnuity(loanAmount);
  const totalRentCost = monthlyRent * years * 12;
  const totalMortgageCost = (monthlyMortgage * years * 12) + equity;

  // Break-even: when cumulative mortgage cost (building equity) beats rent
  let breakEvenYears: number | null = null;
  let cumulativeRent = 0;
  let cumulativeMortgage = equity;
  const amortization = calculateAmortization(loanAmount);

  for (let year = 1; year <= years; year++) {
    cumulativeRent += monthlyRent * 12;
    for (let m = (year - 1) * 12; m < year * 12 && m < amortization.length; m++) {
      cumulativeMortgage += amortization[m].payment;
    }
    const equityBuilt = propertyPrice - (amortization[Math.min(year * 12 - 1, amortization.length - 1)]?.balance ?? 0);
    if (equityBuilt >= cumulativeRent && breakEvenYears === null) {
      breakEvenYears = year;
    }
  }

  const lastRow = amortization[Math.min(years * 12 - 1, amortization.length - 1)];
  const equityAfterYears = propertyPrice - (lastRow?.balance ?? 0);

  return {
    monthlyRent,
    monthlyMortgage: Math.round(monthlyMortgage),
    difference: Math.round(monthlyMortgage - monthlyRent),
    rentIsCheaper: monthlyRent < monthlyMortgage,
    totalRentCost: Math.round(totalRentCost),
    totalMortgageCost: Math.round(totalMortgageCost),
    equityAfterYears: Math.round(equityAfterYears),
    breakEvenYears,
  };
}

export interface InvestmentResult {
  purchasePrice: number;
  monthlyRentalIncome: number;
  annualRentalIncome: number;
  monthlyMortgage: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  roi: number;
  roe: number;
  cashOnCash: number;
  capRate: number;
}

export function calculateInvestment(
  purchasePrice: number,
  equity: number,
  monthlyRentalIncome: number,
  monthlyExpenses = 0
): InvestmentResult {
  const loanAmount = purchasePrice - equity;
  const monthlyMortgage = loanAmount > 0 ? calculateAnnuity(loanAmount) : 0;
  const monthlyCashFlow = monthlyRentalIncome - monthlyMortgage - monthlyExpenses;
  const annualRentalIncome = monthlyRentalIncome * 12;
  const annualExpenses = monthlyExpenses * 12;
  const annualCashFlow = monthlyCashFlow * 12;

  const noi = annualRentalIncome - annualExpenses;
  const capRate = noi / purchasePrice;
  const roi = noi / purchasePrice;
  const roe = equity > 0 ? annualCashFlow / equity : 0;
  const cashOnCash = equity > 0 ? annualCashFlow / equity : 0;

  return {
    purchasePrice,
    monthlyRentalIncome,
    annualRentalIncome,
    monthlyMortgage: Math.round(monthlyMortgage),
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualCashFlow: Math.round(annualCashFlow),
    roi,
    roe,
    cashOnCash,
    capRate,
  };
}

export interface AffordabilityResult {
  maxLoan: number;
  maxPropertyPrice: number;
  monthlyPayment: number;
}

export function calculateAffordability(
  monthlyIncome: number,
  equity: number,
  isYoung = false
): AffordabilityResult {
  // Max payment based on DSTI 45%
  const maxPayment = monthlyIncome * DEFAULTS.dstiLimit;

  // Max loan based on DTI 9.5
  const maxLoanDTI = monthlyIncome * 12 * DEFAULTS.dtiLimit;

  // Max loan based on DSTI (reverse annuity)
  const r = DEFAULTS.rate / 12;
  const n = DEFAULTS.months;
  const maxLoanDSTI = maxPayment * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));

  const maxLoan = Math.min(maxLoanDTI, maxLoanDSTI);

  // Max property price based on LTV
  const ltvLimit = isYoung ? DEFAULTS.ltvLimitYoung : DEFAULTS.ltvLimit;
  const maxPropertyFromLTV = (equity + maxLoan) > 0 ? equity / (1 - ltvLimit) : 0;
  const maxPropertyFromLoan = equity + maxLoan;
  const maxPropertyPrice = Math.min(maxPropertyFromLTV, maxPropertyFromLoan);

  const actualLoan = maxPropertyPrice - equity;
  const monthlyPayment = calculateAnnuity(actualLoan);

  return {
    maxLoan: Math.round(actualLoan),
    maxPropertyPrice: Math.round(maxPropertyPrice),
    monthlyPayment: Math.round(monthlyPayment),
  };
}

export interface RefinanceResult {
  currentPayment: number;
  newPayment: number;
  monthlySaving: number;
  totalSaving: number;
  remainingMonths: number;
}

export function calculateRefinance(
  remainingBalance: number,
  currentRate: number,
  newRate: number,
  remainingYears: number
): RefinanceResult {
  const remainingMonths = remainingYears * 12;
  const currentPayment = calculateAnnuity(remainingBalance, currentRate, remainingMonths);
  const newPayment = calculateAnnuity(remainingBalance, newRate, remainingMonths);
  const monthlySaving = currentPayment - newPayment;
  const totalSaving = monthlySaving * remainingMonths;

  return {
    currentPayment: Math.round(currentPayment),
    newPayment: Math.round(newPayment),
    monthlySaving: Math.round(monthlySaving),
    totalSaving: Math.round(totalSaving),
    remainingMonths,
  };
}
