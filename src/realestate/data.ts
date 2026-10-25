export function usd(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

export function usdSigned(value: number): string {
  if (value > 0) return `+${usd(value)}`;
  return usd(value);
}

export const company = "Meridian Holdings LP";
export const parentGroup = "Meridian Ventures Group";

export const companyOptions = [
  { value: "Meridian Holdings LP", label: "Meridian Holdings LP" },
  { value: "Ridgeline Capital Partners", label: "Ridgeline Capital Partners (Group)" },
  { value: "Meridian Construction LLC", label: "├── Meridian Construction LLC" },
  { value: "Bluestone Rentals LLC", label: "├── Bluestone Rentals LLC" },
  { value: "Crestview Commercial LLC", label: "├── Crestview Commercial LLC" },
  { value: "Summit Land Holdings LLC", label: "└── Summit Land Holdings LLC" },
];

const assetsTotal = 4_792_100;
const liabilitiesTotal = 1_593_171;
const equityTotal = assetsTotal - liabilitiesTotal;

export const balance = {
  assets: assetsTotal,
  liabilities: liabilitiesTotal,
  equity: equityTotal,
  currentAssets: 14_100,
  nonCurrentAssets: 4_778_000,
  cash: 14_100,
  deRatio: Math.round((liabilitiesTotal / equityTotal) * 100) / 100,
  debtToAssets: Math.round((liabilitiesTotal / assetsTotal) * 1000) / 10,
};

const osbTerms = { balance: 773_112, rate: 6.5, termMonths: 240 };
const sfgTerms = { balance: 820_059, rate: 7.7, termMonths: 180 };
const osbRows = schedule(osbTerms.balance, osbTerms.rate, osbTerms.termMonths);
const osbEmi = Math.round(annuityPayment(osbTerms.balance, osbTerms.rate, osbTerms.termMonths));
const sfgEmi = Math.round(annuityPayment(sfgTerms.balance, sfgTerms.rate, sfgTerms.termMonths));
const osbFirstYearInterest = osbRows.slice(0, 12).reduce((sum, row) => sum + row.interest, 0);

export const monthlyDebtService = osbEmi + sfgEmi;
export const cashGap30 = balance.cash - monthlyDebtService;

export const portfolio = {
  landCost: 19_885_189,
  bookValue: 28_824_816,
  marketValue: 40_850_000,
  unrealized: 20_964_811,
  equityValue: 39_256_829,
  propertyEquityValue: 40_076_888,
  returnPct: 105.4,
  bookVsCost: 45.0,
};

export interface PropertyRow {
  id: string;
  name: string;
  shortName: string;
  partner: string;
  share: number;
  partners: number;
  cost: number;
  book: number;
  market: number;
  gain: number;
  roi: number;
  debt: number | null;
  emi: number | null;
  lender: string | null;
  interest: string | null;
}

export const properties: PropertyRow[] = [
  {
    id: "austin",
    name: "AUSTIN BLVD (Commercial Lot)",
    shortName: "AUSTIN BLVD",
    partner: "Daniel Ridge",
    share: 16.3,
    partners: 1,
    cost: 19_696_356,
    book: 28_003_660,
    market: 40_000_000,
    gain: 20_303_644,
    roi: 103.1,
    debt: null,
    emi: null,
    lender: null,
    interest: null,
  },
  {
    id: "meridian",
    name: "1790 Meridian Blvd, Suite-130, Carrollton TX",
    shortName: "1790 Meridian Blvd",
    partner: "Alex Meridian",
    share: 25.0,
    partners: 1,
    cost: 188_833,
    book: 821_156,
    market: 850_000,
    gain: 661_167,
    roi: 350.1,
    debt: osbTerms.balance,
    emi: osbEmi,
    lender: "Oakwood Savings Bank",
    interest: `${usd(osbRows[0].interest)}/${usd(osbFirstYearInterest)}`,
  },
];

export const partners = [
  { name: "Alex Meridian", property: "1790 Meridian Blvd, Suite-130, Carrollton TX", share: 25.0, invested: 188_833, value: 850_000, gain: 661_167, roi: 350.1 },
  { name: "Daniel Ridge", property: "AUSTIN BLVD (Commercial Lot)", share: 16.3, invested: 19_696_356, value: 40_000_000, gain: 20_303_644, roi: 103.1 },
];

export const debt = {
  entity: balance.liabilities,
  propertyAllocated: osbTerms.balance,
  unallocated: balance.liabilities - osbTerms.balance,
  monthlyEmi: osbEmi,
  annualService: osbEmi * 12,
  propertyRepaid: 26_888,
  propertyOriginal: 800_000,
  propertyRepaidPct: 3.4,
  ltv: 1.9,
};

export const loanBook = {
  outstanding: 1_593_171,
  asOf: "Sep 29, 2026",
  borrowed: 1_650_000,
  lent: 0,
  principalPaid: 56_829,
  repaidPct: 3,
  monthly: monthlyDebtService,
  avgRate: Math.round(((osbTerms.balance * osbTerms.rate + sfgTerms.balance * sfgTerms.rate) / (osbTerms.balance + sfgTerms.balance)) * 10) / 10,
};

export interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function annuityPayment(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - (1 + r) ** -months);
}

export function schedule(principal: number, annualRate: number, months: number): AmortRow[] {
  const r = annualRate / 100 / 12;
  const payment = annuityPayment(principal, annualRate, months);
  const rows: AmortRow[] = [];
  let balanceLeft = principal;
  for (let month = 1; month <= months; month += 1) {
    const interest = balanceLeft * r;
    const principalPart = month === months ? balanceLeft : payment - interest;
    balanceLeft = Math.max(balanceLeft - principalPart, 0);
    rows.push({ month, payment: principalPart + interest, principal: principalPart, interest, balance: balanceLeft });
  }
  return rows;
}

export interface RealLoan {
  id: string;
  lender: string;
  code: string;
  balance: number;
  rate: number;
  termMonths: number;
  monthly: number;
  totalInterest: number;
  totalCost: number;
  rows: AmortRow[];
  maturity: string;
  dueDay: string;
  status: "Active";
  property: string | null;
}

function buildLoan(seed: Omit<RealLoan, "monthly" | "totalInterest" | "totalCost" | "rows">): RealLoan {
  const rows = schedule(seed.balance, seed.rate, seed.termMonths);
  const totalCost = rows.reduce((sum, row) => sum + row.payment, 0);
  return {
    ...seed,
    monthly: annuityPayment(seed.balance, seed.rate, seed.termMonths),
    totalInterest: totalCost - seed.balance,
    totalCost,
    rows,
  };
}

export const loans: RealLoan[] = [
  buildLoan({ id: "OSB-2947", lender: "Oakwood Savings Bank", code: "OSB-2947", ...osbTerms, maturity: "Apr 25, 2027", dueDay: "25th", status: "Active", property: "1790 Meridian Blvd" }),
  buildLoan({ id: "SFG-0920", lender: "Summit Financial Group", code: "SFG-0920", ...sfgTerms, maturity: "Nov 23, 2026", dueDay: "16th", status: "Active", property: null }),
];

export const obligations = {
  d30: monthlyDebtService,
  d60: monthlyDebtService * 2,
  d90: monthlyDebtService * 3,
  net: -monthlyDebtService,
};

export const capital = {
  called: 236_000,
  funded: 164_000,
  pending: 72_000,
  fundedPct: 69.5,
  pendingPct: 30.5,
  dashboardPending: 72_050,
};

export const capitalCalls = [
  { id: "CC-2026-001", date: "Mar 1, 2026", amount: 96_000, purpose: "Property acquisition — Austin Blvd", status: "Funded" as const, funded: 100 },
  { id: "CC-2026-002", date: "Jun 15, 2026", amount: 68_000, purpose: "Capital improvements — Meridian Blvd", status: "Funded" as const, funded: 100 },
  { id: "CC-2026-003", date: "Sep 1, 2026", amount: 72_000, purpose: "Working capital reserve", status: "Pending" as const, funded: 0 },
];

const revenue = 109_200;
const opex = 213_832;
const interestExpense = 109_150;
const noi = revenue - opex;
const netIncome = noi - interestExpense;

export const pnl = {
  revenue,
  opex,
  noi,
  interest: interestExpense,
  net: netIncome,
  margin: Math.round((netIncome / revenue) * 1000) / 10,
};

export const cashFlow = {
  operating: -44_632,
  investing: -20_147,
  financing: -200_972,
  net: -265_752,
};

export const allocation = [
  { name: "Land", value: 2_550_193, pct: 19, color: "#2563EB" },
  { name: "Commercial building", value: 7_637_622, pct: 57, color: "#1E3A8A" },
  { name: "Residential property", value: 3_132_435, pct: 24, color: "#7C3AED" },
];

export const insurance = {
  premium: 16_350,
  activePolicies: 4,
  totalCoverage: 13_275_000,
  nextRenewalDays: 99,
  nextRenewalProperty: "Property — 12800 King Plaza Bldg 4, Dallas TX",
};

export interface Policy {
  id: string;
  type: "Vehicle" | "Property" | "Umbrella";
  insurer: string;
  number: string;
  location: string;
  coverage: number;
  premium: number;
  expiry: string;
}

export const policies: Policy[] = [
  { id: "p1", type: "Vehicle", insurer: "Progressive Insurance", number: "MH-PRG-2026", location: "12800 King Plaza, Dallas TX", coverage: 75_000, premium: 1_850, expiry: "Apr 1, 2027" },
  { id: "p2", type: "Property", insurer: "Chubb Insurance", number: "MH-CHB-2026-02", location: "248 Howard Ranch Hs, Valley View TX", coverage: 1_200_000, premium: 3_200, expiry: "Apr 15, 2027" },
  { id: "p3", type: "Umbrella", insurer: "AIG Insurance", number: "MH-UMB-2026", location: "12800 King Plaza Bldg 4, Dallas TX", coverage: 10_000_000, premium: 5_800, expiry: "Mar 1, 2027" },
  { id: "p4", type: "Property", insurer: "Hartford Insurance", number: "MH-HART-2026-01", location: "12800 King Plaza Bldg 4, Dallas TX", coverage: 2_000_000, premium: 5_500, expiry: "Feb 1, 2027" },
];

export interface CoverageGap {
  property: string;
  insurable: number;
  insured: number;
  gap: number;
  ratio: number;
  status: "Fully Covered" | "Critically Underinsured";
}

function gapRow(property: string, insurable: number, insured: number): CoverageGap {
  const ratio = Math.round((insured / insurable) * 100);
  return {
    property,
    insurable,
    insured,
    gap: Math.max(insurable - insured, 0),
    ratio,
    status: ratio >= 100 ? "Fully Covered" : "Critically Underinsured",
  };
}

export const coverageGaps: CoverageGap[] = [
  gapRow("1790 Meridian Blvd", 850_000, 1_200_000),
  gapRow("Austin Blvd Commercial Lot", 40_000_000, 2_000_000),
  gapRow("Vehicle Fleet", 75_000, 75_000),
  gapRow("Umbrella Liability", 10_000_000, 10_000_000),
];

export const totalCoverageGap = coverageGaps.reduce((sum, row) => sum + row.gap, 0);
