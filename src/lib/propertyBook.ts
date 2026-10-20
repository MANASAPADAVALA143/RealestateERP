export const propertyBookName = "RP & SK Investments – II LP";

export const bookYears = ["FY2024", "FY2025", "FY2026"] as const;
export type BookYear = (typeof bookYears)[number];

export const statementYears = ["FY22", "FY23", "FY24", "FY25", "FY26"] as const;

const yearColumn: Record<BookYear, number> = {
  FY2024: 2,
  FY2025: 3,
  FY2026: 4,
};

export function statementYearIndex(year: BookYear): number {
  return yearColumn[year];
}

export interface Holding {
  property: string;
  entity: string;
  own: string;
  capital: string;
  cost: string;
  market: string;
  gl: string;
  roi: string;
  costValue: number;
  marketValue: number;
  roiValue: number;
}

export const holdings: Holding[] = [
  { property: "King Plaza Bldg 4", entity: "ARL", own: "100%", capital: "₹11.1 Cr", cost: "₹11.1 Cr", market: "₹15.8 Cr", gl: "+₹4.7 Cr", roi: "42.4%", costValue: 11.1, marketValue: 15.8, roiValue: 42.4 },
  { property: "26875 US380 Suite 112", entity: "ARL", own: "100%", capital: "₹3.5 Cr", cost: "₹3.5 Cr", market: "₹6.3 Cr", gl: "+₹2.8 Cr", roi: "78.6%", costValue: 3.5, marketValue: 6.3, roiValue: 78.6 },
  { property: "Aubrey Mobile Home", entity: "ARL", own: "100%", capital: "₹0.32 Cr", cost: "₹0.32 Cr", market: "₹0.33 Cr", gl: "+₹0.02 Cr", roi: "5.3%", costValue: 0.32, marketValue: 0.33, roiValue: 5.3 },
  { property: "248 Howard Rd Valley View", entity: "ARL", own: "100%", capital: "₹14.6 Cr", cost: "₹14.6 Cr", market: "₹18.3 Cr", gl: "+₹3.8 Cr", roi: "25.8%", costValue: 14.6, marketValue: 18.3, roiValue: 25.8 },
  { property: "4433 Punjabway Way", entity: "ARL", own: "100%", capital: "₹4.1 Cr", cost: "₹4.1 Cr", market: "₹6.7 Cr", gl: "+₹2.6 Cr", roi: "64.1%", costValue: 4.1, marketValue: 6.7, roiValue: 64.1 },
];

export const holdingTotals = {
  capital: "₹33.6 Cr",
  cost: "₹33.6 Cr",
  market: "₹47.4 Cr",
  gl: "+₹13.9 Cr",
  roi: "41.3%",
};

export interface PropertyCard {
  name: string;
  place: string;
  cost: string;
  market: string;
  gl: string;
  rent: string;
  occupancy: number;
  roi: string;
}

export const propertyCards: PropertyCard[] = [
  { name: "King Plaza Bldg 4", place: "Frisco, TX 75036", cost: "₹11.1 Cr", market: "₹15.8 Cr", gl: "+₹4.7 Cr", rent: "₹2.2L", occupancy: 100, roi: "42.4%" },
  { name: "26875 US380 Suite 112", place: "Aubrey, TX 76227", cost: "₹3.5 Cr", market: "₹6.3 Cr", gl: "+₹2.8 Cr", rent: "₹0.45L", occupancy: 60, roi: "78.6%" },
  { name: "248 Howard Rd", place: "Valley View, TX 76272", cost: "₹14.6 Cr", market: "₹18.3 Cr", gl: "+₹3.8 Cr", rent: "₹0.92L", occupancy: 100, roi: "25.8%" },
  { name: "4433 Punjabway Way", place: "Frisco, TX 75033", cost: "₹4.1 Cr", market: "₹6.7 Cr", gl: "+₹2.6 Cr", rent: "₹0.51L", occupancy: 100, roi: "64.1%" },
  { name: "Aubrey Mobile Home", place: "Aubrey, TX 76227", cost: "₹0.32 Cr", market: "₹0.33 Cr", gl: "+₹0.02 Cr", rent: "₹0.20L", occupancy: 100, roi: "5.3%" },
];

export const assetKpis = [
  { label: "Total value", value: "₹49.4 Cr" },
  { label: "Non-current", value: "₹47.9 Cr" },
  { label: "Current", value: "₹1.5 Cr" },
  { label: "Portfolio ROI", value: "41.3%" },
];

export interface PropertyLoan {
  property: string;
  lender: string;
  outstanding: string;
  sanctioned: string;
  drawn: number;
  emi: string;
  rate: string;
  ltv: string;
  maturity: string;
  interestYtd: string;
  type: string;
  outstandingValue: number;
}

export const propertyLoans: PropertyLoan[] = [
  { property: "King Plaza Bldg 4", lender: "SBI Home Loans #0162", outstanding: "₹10.5 Cr", sanctioned: "₹14.0 Cr", drawn: 75, emi: "₹9.6L", rate: "8.65%", ltv: "66.5%", maturity: "Mar 2031", interestYtd: "₹54L", type: "Term Loan", outstandingValue: 10.5 },
  { property: "248 Howard Ranch", lender: "HDFC Bank #2196", outstanding: "₹10.0 Cr", sanctioned: "₹13.5 Cr", drawn: 74, emi: "₹9.2L", rate: "8.40%", ltv: "54.6%", maturity: "Jun 2032", interestYtd: "₹50L", type: "Term Loan", outstandingValue: 10.0 },
  { property: "4433 Punjabway", lender: "Axis Bank #3759", outstanding: "₹3.4 Cr", sanctioned: "₹5.5 Cr", drawn: 62, emi: "₹3.2L", rate: "9.10%", ltv: "42.0%", maturity: "Sep 2029", interestYtd: "₹18L", type: "Term Loan", outstandingValue: 3.4 },
  { property: "26875 Suite 112", lender: "Great Plains #5999", outstanding: "₹3.3 Cr", sanctioned: "₹4.8 Cr", drawn: 69, emi: "₹2.9L", rate: "8.80%", ltv: "52.5%", maturity: "Dec 2030", interestYtd: "₹17L", type: "Term Loan", outstandingValue: 3.3 },
];

export interface AmountCell {
  text: string;
  tone?: "pos" | "neg";
}

export interface StatementRow {
  label: string;
  kind: "group" | "line" | "subtotal" | "total";
  values: AmountCell[];
}

const blank: AmountCell[] = [{ text: "" }, { text: "" }, { text: "" }, { text: "" }, { text: "" }];

export const profitAndLoss: StatementRow[] = [
  { label: "Income", kind: "group", values: blank },
  { label: "Rental Income", kind: "line", values: ["₹4.8 Cr", "₹4.0 Cr", "₹4.3 Cr", "₹3.5 Cr", "₹1.8 Cr"].map((text) => ({ text })) },
  { label: "Other Income", kind: "line", values: ["₹0.8 Cr", "₹0.4 Cr", "₹0.1 Cr", "₹0.6 Cr", "₹0.1 Cr"].map((text) => ({ text })) },
  { label: "Profit on Investments", kind: "line", values: ["—", "₹2.1 Cr", "—", "₹0.7 Cr", "—"].map((text) => ({ text })) },
  { label: "Total Revenue", kind: "subtotal", values: ["₹5.7 Cr", "₹6.5 Cr", "₹4.4 Cr", "₹4.8 Cr", "₹1.9 Cr"].map((text) => ({ text })) },
  { label: "Expenses", kind: "group", values: blank },
  { label: "Interest", kind: "line", values: ["₹1.8 Cr", "₹1.9 Cr", "₹1.8 Cr", "₹1.7 Cr", "₹1.1 Cr"].map((text) => ({ text })) },
  { label: "Tax", kind: "line", values: ["₹0.9 Cr", "₹0.5 Cr", "₹0.6 Cr", "₹0.5 Cr", "₹0.4 Cr"].map((text) => ({ text })) },
  { label: "Repairs", kind: "line", values: ["₹0.2 Cr", "₹0.1 Cr", "₹0.3 Cr", "₹0.3 Cr", "₹0.1 Cr"].map((text) => ({ text })) },
  { label: "HOA", kind: "line", values: ["₹0.3 Cr", "₹0.2 Cr", "₹0.2 Cr", "₹0.4 Cr", "₹0.1 Cr"].map((text) => ({ text })) },
  { label: "Total Expenses", kind: "subtotal", values: ["₹7.5 Cr", "₹5.6 Cr", "₹7.8 Cr", "₹4.7 Cr", "₹1.8 Cr"].map((text) => ({ text })) },
  {
    label: "Net Income / (Loss)",
    kind: "total",
    values: [
      { text: "(₹3.4 Cr)", tone: "neg" },
      { text: "(₹6.9 Cr)", tone: "neg" },
      { text: "(₹11.8 Cr)", tone: "neg" },
      { text: "(₹0.6 Cr)", tone: "neg" },
      { text: "+₹0.9 Cr", tone: "pos" },
    ],
  },
];

export const balanceSheet: StatementRow[] = [
  { label: "Assets", kind: "group", values: blank },
  { label: "Bank Accounts", kind: "line", values: ["₹0.4 Cr", "₹0.3 Cr", "₹0.6 Cr", "₹0.2 Cr", "₹0.1 Cr"].map((text) => ({ text })) },
  { label: "Accounts Receivable", kind: "line", values: ["₹0.2 Cr", "₹0.1 Cr", "₹0.1 Cr", "₹0.2 Cr", "₹0.2 Cr"].map((text) => ({ text })) },
  { label: "Property", kind: "line", values: ["₹38.4 Cr", "₹38.6 Cr", "₹37.8 Cr", "₹37.6 Cr", "₹37.2 Cr"].map((text) => ({ text })) },
  { label: "Investments", kind: "line", values: ["₹24.8 Cr", "₹22.6 Cr", "₹12.8 Cr", "₹11.9 Cr", "₹11.6 Cr"].map((text) => ({ text })) },
  { label: "Total Assets", kind: "total", values: ["₹63.0 Cr", "₹59.9 Cr", "₹50.2 Cr", "₹49.4 Cr", "₹49.4 Cr"].map((text) => ({ text })) },
  { label: "Liabilities & Equity", kind: "group", values: blank },
  { label: "Bank Loans", kind: "line", values: ["₹28.1 Cr", "₹29.7 Cr", "₹26.4 Cr", "₹27.2 Cr", "₹27.2 Cr"].map((text) => ({ text })) },
  { label: "Other Liabilities", kind: "line", values: ["₹16.8 Cr", "₹14.2 Cr", "₹7.9 Cr", "₹18.9 Cr", "₹18.1 Cr"].map((text) => ({ text })) },
  { label: "Equity", kind: "line", values: ["₹18.1 Cr", "₹16.0 Cr", "₹15.9 Cr", "₹3.3 Cr", "₹4.0 Cr"].map((text) => ({ text })) },
  { label: "Total Liabilities & Equity", kind: "total", values: ["₹63.0 Cr", "₹59.9 Cr", "₹50.2 Cr", "₹49.4 Cr", "₹49.4 Cr"].map((text) => ({ text })) },
];

export const cashFlow: StatementRow[] = [
  { label: "Operating", kind: "group", values: blank },
  {
    label: "Net Income",
    kind: "line",
    values: [
      { text: "(₹3.4 Cr)", tone: "neg" },
      { text: "(₹6.9 Cr)", tone: "neg" },
      { text: "(₹11.8 Cr)", tone: "neg" },
      { text: "(₹0.6 Cr)", tone: "neg" },
      { text: "+₹0.9 Cr", tone: "pos" },
    ],
  },
  { label: "Depreciation", kind: "line", values: ["₹0.7 Cr", "₹4.9 Cr", "₹5.7 Cr", "₹0.7 Cr", "₹1.1 Cr"].map((text) => ({ text })) },
  {
    label: "WC Changes",
    kind: "line",
    values: [
      { text: "(₹1.0 Cr)", tone: "neg" },
      { text: "+₹3.4 Cr", tone: "pos" },
      { text: "(₹13.8 Cr)", tone: "neg" },
      { text: "(₹13.1 Cr)", tone: "neg" },
      { text: "(₹2.4 Cr)", tone: "neg" },
    ],
  },
  {
    label: "Operating CF",
    kind: "subtotal",
    values: [
      { text: "(₹3.7 Cr)", tone: "neg" },
      { text: "(₹23.2 Cr)", tone: "neg" },
      { text: "(₹19.9 Cr)", tone: "neg" },
      { text: "+₹11.8 Cr", tone: "pos" },
      { text: "(₹0.4 Cr)", tone: "neg" },
    ],
  },
  { label: "Investing", kind: "group", values: blank },
  {
    label: "Property",
    kind: "line",
    values: [
      { text: "—" },
      { text: "—" },
      { text: "(₹0.3 Cr)", tone: "neg" },
      { text: "+₹4.1 Cr", tone: "pos" },
      { text: "+₹0.5 Cr", tone: "pos" },
    ],
  },
  {
    label: "Investments",
    kind: "line",
    values: [
      { text: "+₹0.5 Cr", tone: "pos" },
      { text: "+₹0.9 Cr", tone: "pos" },
      { text: "+₹9.1 Cr", tone: "pos" },
      { text: "(₹4.5 Cr)", tone: "neg" },
      { text: "+₹0.5 Cr", tone: "pos" },
    ],
  },
  {
    label: "Investing CF",
    kind: "subtotal",
    values: [
      { text: "+₹0.5 Cr", tone: "pos" },
      { text: "+₹0.9 Cr", tone: "pos" },
      { text: "+₹9.1 Cr", tone: "pos" },
      { text: "(₹4.5 Cr)", tone: "neg" },
      { text: "+₹0.5 Cr", tone: "pos" },
    ],
  },
  { label: "Financing", kind: "group", values: blank },
  {
    label: "Bank Loan",
    kind: "line",
    values: [
      { text: "(₹1.0 Cr)", tone: "neg" },
      { text: "(₹0.9 Cr)", tone: "neg" },
      { text: "(₹0.9 Cr)", tone: "neg" },
      { text: "+₹0.7 Cr", tone: "pos" },
      { text: "(₹0.4 Cr)", tone: "neg" },
    ],
  },
  {
    label: "Owner",
    kind: "line",
    values: [
      { text: "+₹3.8 Cr", tone: "pos" },
      { text: "(₹8.3 Cr)", tone: "neg" },
      { text: "(₹16.7 Cr)", tone: "neg" },
      { text: "+₹13.2 Cr", tone: "pos" },
      { text: "—" },
    ],
  },
  {
    label: "Financing CF",
    kind: "subtotal",
    values: [
      { text: "+₹2.8 Cr", tone: "pos" },
      { text: "(₹9.2 Cr)", tone: "neg" },
      { text: "(₹17.6 Cr)", tone: "neg" },
      { text: "+₹13.9 Cr", tone: "pos" },
      { text: "(₹0.4 Cr)", tone: "neg" },
    ],
  },
  {
    label: "Net Change in Cash",
    kind: "total",
    values: [
      { text: "(₹0.4 Cr)", tone: "neg" },
      { text: "(₹31.5 Cr)", tone: "neg" },
      { text: "(₹28.4 Cr)", tone: "neg" },
      { text: "+₹21.2 Cr", tone: "pos" },
      { text: "(₹0.3 Cr)", tone: "neg" },
    ],
  },
];

export interface SnapshotYear {
  label: string;
  ni: string;
  niTone: "good" | "bad";
  niNote: string;
  da: string;
  daNote: string;
  de: string;
  deNote: string;
  eq: string;
  eqNote: string;
}

export const snapshots: Record<BookYear, SnapshotYear> = {
  FY2026: {
    label: "Net Income FY26",
    ni: "+₹0.9 Cr",
    niTone: "good",
    niNote: "41% net margin",
    da: "91.9%",
    daNote: "High leverage",
    de: "6.75x",
    deNote: "",
    eq: "+₹4.0 Cr",
    eqNote: "",
  },
  FY2025: {
    label: "Net Income FY25",
    ni: "(₹0.6 Cr)",
    niTone: "bad",
    niNote: "Loss year",
    da: "93.3%",
    daNote: "Liabilities ÷ assets",
    de: "8.24x",
    deNote: "Bank loans ÷ equity",
    eq: "+₹3.3 Cr",
    eqNote: "Partnership book",
  },
  FY2024: {
    label: "Net Income FY24",
    ni: "(₹11.8 Cr)",
    niTone: "bad",
    niNote: "Loss year",
    da: "68.3%",
    daNote: "Liabilities ÷ assets",
    de: "1.66x",
    deNote: "Bank loans ÷ equity",
    eq: "+₹15.9 Cr",
    eqNote: "Partnership book",
  },
};

export const snapshotFixed = {
  ltv: "38.9%",
  ltvNote: "Portfolio debt ÷ FMV",
  dy: "2.7%",
  dyNote: "NOI ÷ debt",
  cr: "0.08x",
  cap: "1.1%",
};

export interface SummaryYear {
  id: BookYear | "FY2022" | "FY2023";
  year: string;
  revenue: string;
  ni: AmountCell;
  assets: string;
  liabilities: string;
  equity: string;
  operatingCf: AmountCell;
}

export const summaryYears: SummaryYear[] = [
  { id: "FY2022", year: "FY22", revenue: "₹5.7 Cr", ni: { text: "(₹3.4 Cr)", tone: "neg" }, assets: "₹63.0 Cr", liabilities: "₹44.9 Cr", equity: "₹18.1 Cr", operatingCf: { text: "(₹3.7 Cr)", tone: "neg" } },
  { id: "FY2023", year: "FY23", revenue: "₹6.5 Cr", ni: { text: "(₹6.9 Cr)", tone: "neg" }, assets: "₹59.9 Cr", liabilities: "₹43.9 Cr", equity: "₹16.0 Cr", operatingCf: { text: "(₹23.2 Cr)", tone: "neg" } },
  { id: "FY2024", year: "FY24", revenue: "₹4.4 Cr", ni: { text: "(₹11.8 Cr)", tone: "neg" }, assets: "₹50.2 Cr", liabilities: "₹34.3 Cr", equity: "₹15.9 Cr", operatingCf: { text: "(₹19.9 Cr)", tone: "neg" } },
  { id: "FY2025", year: "FY25", revenue: "₹4.8 Cr", ni: { text: "(₹0.6 Cr)", tone: "neg" }, assets: "₹49.4 Cr", liabilities: "₹46.1 Cr", equity: "₹3.3 Cr", operatingCf: { text: "+₹11.8 Cr", tone: "pos" } },
  { id: "FY2026", year: "FY26", revenue: "₹1.9 Cr", ni: { text: "+₹0.9 Cr", tone: "pos" }, assets: "₹49.4 Cr", liabilities: "₹45.3 Cr", equity: "₹4.0 Cr", operatingCf: { text: "(₹0.4 Cr)", tone: "neg" } },
];

export const revenueExpense = [
  { year: "FY22", revenue: 5.7, expense: 7.5 },
  { year: "FY23", revenue: 6.5, expense: 5.6 },
  { year: "FY24", revenue: 4.4, expense: 7.8 },
  { year: "FY25", revenue: 4.8, expense: 4.7 },
  { year: "FY26", revenue: 1.9, expense: 1.8 },
];

export const netIncomeTrend = [
  { year: "FY22", value: -3.4, label: "(₹3.4 Cr)" },
  { year: "FY23", value: -6.9, label: "(₹6.9 Cr)" },
  { year: "FY24", value: -11.8, label: "(₹11.8 Cr)" },
  { year: "FY25", value: -0.6, label: "(₹0.6 Cr)" },
  { year: "FY26", value: 0.9, label: "+₹0.9 Cr" },
];

let bookYear: BookYear = "FY2026";
const yearListeners = new Set<() => void>();

export function getBookYear(): BookYear {
  return bookYear;
}

export function subscribeBookYear(listener: () => void): () => void {
  yearListeners.add(listener);
  return () => {
    yearListeners.delete(listener);
  };
}

export function setBookYear(year: BookYear): void {
  bookYear = year;
  yearListeners.forEach((listener) => listener());
}
