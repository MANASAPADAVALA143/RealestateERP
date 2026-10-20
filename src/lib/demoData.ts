export type EntityStatus = "Healthy" | "Watch" | "Stress";
export type LoanStatus = "Active" | "Overdue" | "Watch";
export type PolicyStatus = "Active" | "Expiring" | "Watch";
export type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
export type AlertModule = "Loans" | "Compliance" | "Insurance" | "Cash" | "RERA";

export interface Entity {
  id: string;
  code: string;
  name: string;
  role: string;
  revenue: number;
  ebitda: number;
  assets: number;
  debt: number;
  cash: number;
  equity: number;
  status: EntityStatus;
  focus: string;
  color: string;
}

export interface QuarterPoint {
  quarter: string;
  revenue: number;
}

export interface ForecastWeek {
  id: string;
  week: string;
  label: string;
  inflows: number;
  outflows: number;
  net: number;
  closing: number;
}

export interface IntercompanyFlow {
  id: string;
  fromId: string;
  toId: string;
  nature: string;
  amount: number;
  timing: string;
}

export interface BalanceLine {
  entityId: string;
  receivables: number;
  inventory: number;
  investments: number;
  fixedAssets: number;
}

export interface Investment {
  id: string;
  name: string;
  type: string;
  sector: string;
  invested: number;
  currentValue: number;
  unrealizedGL: number;
  roi: number;
  dividends: number;
  entityId: string;
}

export interface Loan {
  id: string;
  lender: string;
  entityId: string;
  entityName: string;
  type: string;
  sanctioned: number;
  outstanding: number;
  rate: number;
  emi: number;
  maturity: string;
  ltv: number;
  status: LoanStatus;
}

export interface Policy {
  id: string;
  insurer: string;
  entityId: string;
  entityName: string;
  type: string;
  coverage: number;
  premium: number;
  expiry: string;
  status: PolicyStatus;
  claim: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  module: AlertModule;
  entityId: string;
  entityName: string;
  title: string;
  description: string;
  action: string;
  dueDate: string;
}

export interface Insight {
  title: string;
  body: string;
}

export function inrCr(v: number): string {
  return `₹${v.toFixed(2)} Cr`;
}

export function inrCrShort(v: number): string {
  return `₹${v.toFixed(1)} Cr`;
}

export function pct(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function signedInr(v: number): string {
  const text = inrCr(Math.abs(v));
  if (v > 0) return `+${text}`;
  if (v < 0) return `-${text}`;
  return text;
}

export function signedPct(v: number): string {
  const text = pct(v);
  return v > 0 ? `+${text}` : text;
}

export function rateLabel(v: number): string {
  return `${v.toFixed(2)}%`;
}

export function deLabel(debt: number, equity: number): string {
  return `${(debt / equity).toFixed(2)}x`;
}

export function ebitdaMargin(entity: Entity): number {
  return (entity.ebitda / entity.revenue) * 100;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const entities: Entity[] = [
  {
    id: "ARL",
    code: "ARL",
    name: "Agarwal Realty Ltd",
    role: "Flagship developer",
    revenue: 142,
    ebitda: 48.564,
    assets: 312,
    debt: 180,
    cash: 23.7,
    equity: 132,
    status: "Healthy",
    focus: "Flagship residential and commercial developer.",
    color: "#0B1D33",
  },
  {
    id: "PCS",
    code: "PCS",
    name: "Prime Commercial SPV",
    role: "Leased commercial",
    revenue: 38,
    ebitda: 15.58,
    assets: 98,
    debt: 52,
    cash: 7.2,
    equity: 46,
    status: "Healthy",
    focus: "Leased commercial portfolio with steady collections.",
    color: "#1E4D73",
  },
  {
    id: "LBH",
    code: "LBH",
    name: "Land Bank Holdco",
    role: "Land bank",
    revenue: 22,
    ebitda: 3.96,
    assets: 278,
    debt: 190,
    cash: 4.1,
    equity: 88,
    status: "Watch",
    focus: "Large land bank, thin cash, and elevated leverage.",
    color: "#C79A2B",
  },
  {
    id: "AHS",
    code: "AHS",
    name: "Affordable Housing SPV",
    role: "Affordable housing",
    revenue: 18,
    ebitda: 2.52,
    assets: 67,
    debt: 41,
    cash: 3.8,
    equity: 26,
    status: "Watch",
    focus: "Affordable projects with tight margins and a high LTV loan.",
    color: "#8A6A2F",
  },
  {
    id: "AFM",
    code: "AFM",
    name: "Agarwal Facility Mgmt",
    role: "Facility services",
    revenue: 9,
    ebitda: 1.98,
    assets: 24,
    debt: 8,
    cash: 2.9,
    equity: 16,
    status: "Healthy",
    focus: "Asset-light services with the lowest leverage in the group.",
    color: "#3E6B5B",
  },
  {
    id: "PHC",
    code: "PHC",
    name: "PromoterHoldCo",
    role: "Promoter holdco",
    revenue: 5,
    ebitda: 1.574,
    assets: 114,
    debt: 62,
    cash: 2.2,
    equity: 52,
    status: "Healthy",
    focus: "Promoter holdco for stakes and the treasury book.",
    color: "#6A4A3A",
  },
];

export const group = {
  revenue: round2(entities.reduce((sum, entity) => sum + entity.revenue, 0)),
  ebitda: round2(entities.reduce((sum, entity) => sum + entity.ebitda, 0)),
  ebitdaMargin: 31.7,
  assets: round2(entities.reduce((sum, entity) => sum + entity.assets, 0)),
  debt: round2(entities.reduce((sum, entity) => sum + entity.debt, 0)),
  equity: round2(entities.reduce((sum, entity) => sum + entity.equity, 0)),
  cash: round2(entities.reduce((sum, entity) => sum + entity.cash, 0)),
};

export const quarters: QuarterPoint[] = [
  { quarter: "Q1", revenue: 48.6 },
  { quarter: "Q2", revenue: 55.2 },
  { quarter: "Q3", revenue: 62.4 },
  { quarter: "Q4", revenue: 67.8 },
];

export const balanceSheet: BalanceLine[] = [
  { entityId: "ARL", receivables: 31.4, inventory: 168.5, investments: 28.6, fixedAssets: 59.8 },
  { entityId: "PCS", receivables: 11.4, inventory: 36.8, investments: 24.1, fixedAssets: 18.5 },
  { entityId: "LBH", receivables: 8.6, inventory: 241.3, investments: 12.4, fixedAssets: 11.6 },
  { entityId: "AHS", receivables: 9.2, inventory: 39.4, investments: 3.1, fixedAssets: 11.5 },
  { entityId: "AFM", receivables: 5.4, inventory: 0.8, investments: 1.2, fixedAssets: 13.7 },
  { entityId: "PHC", receivables: 1.8, inventory: 0, investments: 98.5, fixedAssets: 11.5 },
];

export const forecast: ForecastWeek[] = [
  { id: "W1", week: "W1", label: "19 Oct", inflows: 8.4, outflows: 6.15, net: 2.25, closing: 46.15 },
  { id: "W2", week: "W2", label: "26 Oct", inflows: 5.2, outflows: 7.85, net: -2.65, closing: 43.5 },
  { id: "W3", week: "W3", label: "02 Nov", inflows: 12.4, outflows: 6.8, net: 5.6, closing: 49.1 },
  { id: "W4", week: "W4", label: "09 Nov", inflows: 4.6, outflows: 9.35, net: -4.75, closing: 44.35 },
  { id: "W5", week: "W5", label: "16 Nov", inflows: 7.1, outflows: 6.4, net: 0.7, closing: 45.05 },
  { id: "W6", week: "W6", label: "23 Nov", inflows: 3.8, outflows: 8.25, net: -4.45, closing: 40.6 },
  { id: "W7", week: "W7", label: "30 Nov", inflows: 11.5, outflows: 5.9, net: 5.6, closing: 46.2 },
  { id: "W8", week: "W8", label: "07 Dec", inflows: 6.4, outflows: 7.15, net: -0.75, closing: 45.45 },
];

export const intercompany: IntercompanyFlow[] = [
  {
    id: "IC-01",
    fromId: "ARL",
    toId: "PHC",
    nature: "Upstream dividend",
    amount: 4.2,
    timing: "Quarterly",
  },
  {
    id: "IC-02",
    fromId: "PCS",
    toId: "PHC",
    nature: "Brand and management fee",
    amount: 0.85,
    timing: "Monthly",
  },
  {
    id: "IC-03",
    fromId: "ARL",
    toId: "AFM",
    nature: "Facility management contract",
    amount: 1.1,
    timing: "Monthly",
  },
  {
    id: "IC-04",
    fromId: "LBH",
    toId: "ARL",
    nature: "Land sale advance",
    amount: 6.5,
    timing: "Before quarter close",
  },
  {
    id: "IC-05",
    fromId: "PHC",
    toId: "AHS",
    nature: "Promoter infusion",
    amount: 2.4,
    timing: "As required",
  },
  {
    id: "IC-06",
    fromId: "AHS",
    toId: "AFM",
    nature: "Operations retainer",
    amount: 0.36,
    timing: "Monthly",
  },
];

export const investments: Investment[] = [
  {
    id: "INV-01",
    name: "Embassy REIT",
    type: "REIT",
    sector: "Commercial Real Estate",
    invested: 18.5,
    currentValue: 21.2,
    unrealizedGL: 2.7,
    roi: 14.6,
    dividends: 1.24,
    entityId: "PHC",
  },
  {
    id: "INV-02",
    name: "Mindspace REIT",
    type: "REIT",
    sector: "Office",
    invested: 12,
    currentValue: 11.4,
    unrealizedGL: -0.6,
    roi: -5,
    dividends: 0.82,
    entityId: "PHC",
  },
  {
    id: "INV-03",
    name: "Axis Bluechip Fund",
    type: "Mutual Fund",
    sector: "Large Cap Equity",
    invested: 8.5,
    currentValue: 10.1,
    unrealizedGL: 1.6,
    roi: 18.8,
    dividends: 0,
    entityId: "ARL",
  },
  {
    id: "INV-04",
    name: "HDFC Nifty 50 ETF",
    type: "ETF",
    sector: "Index",
    invested: 6,
    currentValue: 7.35,
    unrealizedGL: 1.35,
    roi: 22.5,
    dividends: 0.12,
    entityId: "ARL",
  },
  {
    id: "INV-05",
    name: "Tata Steel bonds",
    type: "Bond",
    sector: "Metals",
    invested: 5,
    currentValue: 5.15,
    unrealizedGL: 0.15,
    roi: 3,
    dividends: 0.38,
    entityId: "PCS",
  },
  {
    id: "INV-06",
    name: "Prestige Estates shares",
    type: "Equity",
    sector: "Real Estate",
    invested: 9.2,
    currentValue: 8.4,
    unrealizedGL: -0.8,
    roi: -8.7,
    dividends: 0.06,
    entityId: "PHC",
  },
  {
    id: "INV-07",
    name: "IndusInd Bank FD",
    type: "Fixed Deposit",
    sector: "Banking",
    invested: 15,
    currentValue: 15.9,
    unrealizedGL: 0.9,
    roi: 6,
    dividends: 0.9,
    entityId: "PHC",
  },
];

export const loans: Loan[] = [
  {
    id: "LN-01",
    lender: "HDFC Bank",
    entityId: "ARL",
    entityName: "Agarwal Realty Ltd",
    type: "LAP",
    sanctioned: 85,
    outstanding: 78.4,
    rate: 9.25,
    emi: 1.12,
    maturity: "31 Mar 2031",
    ltv: 58,
    status: "Active",
  },
  {
    id: "LN-02",
    lender: "State Bank of India",
    entityId: "LBH",
    entityName: "Land Bank Holdco",
    type: "Term Loan",
    sanctioned: 62,
    outstanding: 54.8,
    rate: 8.75,
    emi: 0.86,
    maturity: "31 Dec 2032",
    ltv: 62,
    status: "Active",
  },
  {
    id: "LN-03",
    lender: "PNB Housing",
    entityId: "AHS",
    entityName: "Affordable Housing SPV",
    type: "Housing Term Loan",
    sanctioned: 45,
    outstanding: 39.2,
    rate: 9.4,
    emi: 0.62,
    maturity: "30 Jun 2029",
    ltv: 71,
    status: "Watch",
  },
  {
    id: "LN-04",
    lender: "Axis Bank",
    entityId: "PCS",
    entityName: "Prime Commercial SPV",
    type: "Overdraft",
    sanctioned: 18,
    outstanding: 14.6,
    rate: 10.25,
    emi: 0.18,
    maturity: "31 Mar 2027",
    ltv: 45,
    status: "Active",
  },
  {
    id: "LN-05",
    lender: "ICICI Bank",
    entityId: "ARL",
    entityName: "Agarwal Realty Ltd",
    type: "Construction Finance",
    sanctioned: 95,
    outstanding: 86.5,
    rate: 9.55,
    emi: 1.35,
    maturity: "30 Sep 2030",
    ltv: 64,
    status: "Active",
  },
  {
    id: "LN-06",
    lender: "Kotak Mahindra Bank",
    entityId: "PHC",
    entityName: "PromoterHoldCo",
    type: "LAP",
    sanctioned: 40,
    outstanding: 36.8,
    rate: 9.85,
    emi: 0.54,
    maturity: "31 Jan 2028",
    ltv: 68,
    status: "Overdue",
  },
  {
    id: "LN-07",
    lender: "Bank of Baroda",
    entityId: "LBH",
    entityName: "Land Bank Holdco",
    type: "Term Loan",
    sanctioned: 80,
    outstanding: 71.2,
    rate: 8.9,
    emi: 0.98,
    maturity: "31 Aug 2033",
    ltv: 55,
    status: "Active",
  },
  {
    id: "LN-08",
    lender: "IndusInd Bank",
    entityId: "AFM",
    entityName: "Agarwal Facility Mgmt",
    type: "Working Capital",
    sanctioned: 10,
    outstanding: 6.4,
    rate: 11.1,
    emi: 0.16,
    maturity: "30 Nov 2027",
    ltv: 40,
    status: "Active",
  },
];

export const policies: Policy[] = [
  {
    id: "POL-01",
    insurer: "New India Assurance",
    entityId: "ARL",
    entityName: "Agarwal Realty Ltd",
    type: "Fire & Burglary",
    coverage: 180,
    premium: 0.42,
    expiry: "31 Mar 2027",
    status: "Active",
    claim: "None",
  },
  {
    id: "POL-02",
    insurer: "ICICI Lombard",
    entityId: "PCS",
    entityName: "Prime Commercial SPV",
    type: "FLEXA",
    coverage: 85,
    premium: 0.28,
    expiry: "15 Jan 2027",
    status: "Active",
    claim: "None",
  },
  {
    id: "POL-03",
    insurer: "HDFC ERGO",
    entityId: "PHC",
    entityName: "PromoterHoldCo",
    type: "D&O",
    coverage: 25,
    premium: 0.18,
    expiry: "15 Nov 2026",
    status: "Expiring",
    claim: "None",
  },
  {
    id: "POL-04",
    insurer: "Tata AIG",
    entityId: "ARL",
    entityName: "Agarwal Realty Ltd",
    type: "CAR",
    coverage: 120,
    premium: 0.55,
    expiry: "20 Aug 2027",
    status: "Active",
    claim: "Open · ₹1.20 Cr",
  },
  {
    id: "POL-05",
    insurer: "Star Health",
    entityId: "AFM",
    entityName: "Agarwal Facility Mgmt",
    type: "Group Health",
    coverage: 2,
    premium: 0.09,
    expiry: "01 Apr 2027",
    status: "Active",
    claim: "YTD · ₹0.04 Cr",
  },
  {
    id: "POL-06",
    insurer: "Bajaj Allianz",
    entityId: "AHS",
    entityName: "Affordable Housing SPV",
    type: "Workmen Comp",
    coverage: 5,
    premium: 0.06,
    expiry: "30 Nov 2026",
    status: "Expiring",
    claim: "None",
  },
  {
    id: "POL-07",
    insurer: "Oriental Insurance",
    entityId: "LBH",
    entityName: "Land Bank Holdco",
    type: "Fire & Burglary",
    coverage: 40,
    premium: 0.11,
    expiry: "12 May 2027",
    status: "Active",
    claim: "None",
  },
  {
    id: "POL-08",
    insurer: "SBI General",
    entityId: "LBH",
    entityName: "Land Bank Holdco",
    type: "FLEXA",
    coverage: 95,
    premium: 0.33,
    expiry: "31 Dec 2026",
    status: "Watch",
    claim: "None",
  },
];

export const alerts: Alert[] = [
  {
    id: "ALT-02",
    severity: "Critical",
    module: "RERA",
    entityId: "AHS",
    entityName: "Affordable Housing SPV",
    title: "RERA quarterly return is overdue",
    description:
      "The Q2 FY26 update for Greenfield Phase 2 has not been filed with Telangana RERA. The late-fee clock is already running.",
    action: "File the quarterly update and pay the late fee before the authority issues a notice.",
    dueDate: "22 Oct 2026",
  },
  {
    id: "ALT-01",
    severity: "Critical",
    module: "Loans",
    entityId: "PHC",
    entityName: "PromoterHoldCo",
    title: "Kotak LAP installment is 18 days overdue",
    description:
      "The October EMI of ₹0.54 Cr on the Kotak Mahindra LAP has not been received. Day 18 puts the facility close to an SMA-1 mark.",
    action: "Remit ₹0.54 Cr plus penal interest and send the bank the UTR the same day.",
    dueDate: "25 Oct 2026",
  },
  {
    id: "ALT-03",
    severity: "High",
    module: "Insurance",
    entityId: "PHC",
    entityName: "PromoterHoldCo",
    title: "Directors and officers cover expires next month",
    description:
      "HDFC ERGO D&O policy of ₹25.00 Cr sum insured ends on 15 Nov 2026. No renewal quote is on the file.",
    action: "Bind renewal terms before the November board meeting.",
    dueDate: "31 Oct 2026",
  },
  {
    id: "ALT-04",
    severity: "High",
    module: "Cash",
    entityId: "LBH",
    entityName: "Land Bank Holdco",
    title: "Cash covers under 3 months of LBH debt service",
    description:
      "LBH holds ₹4.10 Cr against a heavy EMI share on the SBI and Bank of Baroda land loans. Plot-sale collections are behind the plan.",
    action: "Approve a cash sweep from ARL or defer non-critical development spend.",
    dueDate: "05 Nov 2026",
  },
  {
    id: "ALT-05",
    severity: "High",
    module: "Compliance",
    entityId: "ARL",
    entityName: "Agarwal Realty Ltd",
    title: "GST reconciliation gap of ₹1.80 Cr",
    description:
      "Annual GST reconciliation does not match the books by ₹1.80 Cr. The difference sits in output tax on cancelled bookings.",
    action: "Close the variance with the statutory auditor before the tax audit.",
    dueDate: "12 Nov 2026",
  },
  {
    id: "ALT-07",
    severity: "Medium",
    module: "Insurance",
    entityId: "AHS",
    entityName: "Affordable Housing SPV",
    title: "Workmen compensation expires as Phase 2 ramps",
    description:
      "Bajaj Allianz workmen compensation of ₹5.00 Cr ends on 30 Nov 2026. Site labour is due to increase the same week.",
    action: "Renew the policy and lift the sum insured to ₹8.00 Cr before mobilisation.",
    dueDate: "20 Nov 2026",
  },
  {
    id: "ALT-06",
    severity: "Medium",
    module: "Loans",
    entityId: "AHS",
    entityName: "Affordable Housing SPV",
    title: "PNB Housing LTV is above the internal ceiling",
    description:
      "LTV on the PNB Housing facility is 71% against the group ceiling of 70%. Affordable inventory is the only security.",
    action: "Prepay ₹2.00 Cr or add collateral from ARL before the next stock statement.",
    dueDate: "30 Nov 2026",
  },
  {
    id: "ALT-08",
    severity: "Low",
    module: "Cash",
    entityId: "AFM",
    entityName: "Agarwal Facility Mgmt",
    title: "Idle cash can move to the group treasury",
    description:
      "AFM holds ₹2.90 Cr in a current account. The operating float the business needs is closer to ₹1.00 Cr.",
    action: "Sweep ₹1.90 Cr into the group FD ladder.",
    dueDate: "31 Oct 2026",
  },
];

export type ApprovalState = "pending" | "approved" | "rejected";

export interface PipelineDeal {
  id: string;
  name: string;
  entityId: string;
  stage: "Lead" | "Qualified" | "Proposal" | "Negotiation" | "Verbal";
  value: number;
  probability: number;
  owner: string;
  close: string;
}

export interface PurchaseOrder {
  id: string;
  vendor: string;
  entityId: string;
  value: number;
  received: number;
  status: "Open" | "Partial" | "Closed";
}

export interface InventoryClass {
  name: string;
  entityId: string;
  value: number;
}

export interface HeadcountRow {
  entityId: string;
  people: number;
  monthlyPayroll: number;
  attrition: number;
  openRoles: number;
}

export interface CapexProject {
  id: string;
  name: string;
  entityId: string;
  place: string;
  finish: string;
  budget: number;
  spent: number;
  status: "On track" | "Watch" | "Delayed";
}

export interface ApprovalItem {
  id: string;
  code: string;
  title: string;
  module: string;
  entityId: string;
  owner: string;
  amount: number;
  state: ApprovalState;
}

export const pipelineStages: { stage: PipelineDeal["stage"]; value: number; weight: number }[] = [
  { stage: "Lead", value: 38.4, weight: 0.1 },
  { stage: "Qualified", value: 31.2, weight: 0.25 },
  { stage: "Proposal", value: 24.6, weight: 0.45 },
  { stage: "Negotiation", value: 18.8, weight: 0.7 },
  { stage: "Verbal", value: 11, weight: 0.9 },
];

export const pipelineByEntity = [
  { entityId: "ARL", value: 62.4 },
  { entityId: "PCS", value: 18.6 },
  { entityId: "LBH", value: 14.2 },
  { entityId: "AHS", value: 22.8 },
  { entityId: "AFM", value: 4.4 },
  { entityId: "PHC", value: 1.6 },
];

export const pipelineDeals: PipelineDeal[] = [
  { id: "D1", name: "Kokapet tower bookings", entityId: "ARL", stage: "Negotiation", value: 12.4, probability: 70, owner: "Priya Shah", close: "18 Dec 2026" },
  { id: "D2", name: "Gachibowli office lease", entityId: "PCS", stage: "Proposal", value: 8.6, probability: 45, owner: "Arjun Mehta", close: "31 Jan 2027" },
  { id: "D3", name: "Shamirpet plot JV", entityId: "LBH", stage: "Qualified", value: 9.2, probability: 25, owner: "S. Reddy", close: "30 Mar 2027" },
  { id: "D4", name: "PMAY block C", entityId: "AHS", stage: "Verbal", value: 6.4, probability: 90, owner: "Neha Iyer", close: "15 Nov 2026" },
  { id: "D5", name: "Campus FM renewal", entityId: "AFM", stage: "Negotiation", value: 2.2, probability: 70, owner: "Kabir Das", close: "20 Dec 2026" },
  { id: "D6", name: "Holdco stake top-up", entityId: "PHC", stage: "Lead", value: 1.6, probability: 10, owner: "RP desk", close: "30 Jun 2027" },
  { id: "D7", name: "Affordable phase 4", entityId: "AHS", stage: "Qualified", value: 7.8, probability: 25, owner: "Neha Iyer", close: "15 Apr 2027" },
  { id: "D8", name: "Clubhouse pre-sales", entityId: "ARL", stage: "Proposal", value: 5.4, probability: 45, owner: "Priya Shah", close: "28 Feb 2027" },
];

export const pipelineOpen = round2(pipelineStages.reduce((sum, row) => sum + row.value, 0));
export const pipelineWeighted = round2(pipelineStages.reduce((sum, row) => sum + row.value * row.weight, 0));
export const pipelineWon = 51.4;
export const pipelineWinRate = 27.6;
export const pipelineCycleDays = 81;

export const purchaseCategories = [
  { name: "Cement and steel", value: 34.2 },
  { name: "MEP", value: 18.4 },
  { name: "Civil contracts", value: 16.8 },
  { name: "Professional", value: 8.6 },
  { name: "Facilities", value: 9.2 },
  { name: "Other", value: 9.2 },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "PO-1842", vendor: "UltraTech Cement", entityId: "LBH", value: 4.2, received: 62, status: "Open" },
  { id: "PO-1908", vendor: "Schneider MEP", entityId: "PCS", value: 2.8, received: 40, status: "Open" },
  { id: "PO-1766", vendor: "Studio Line Interiors", entityId: "ARL", value: 3.6, received: 80, status: "Partial" },
  { id: "PO-2011", vendor: "Design counsel", entityId: "AHS", value: 1.1, received: 15, status: "Open" },
  { id: "PO-1688", vendor: "Site services panel", entityId: "AFM", value: 0.9, received: 100, status: "Closed" },
  { id: "PO-1540", vendor: "Treasury advisory", entityId: "PHC", value: 0.4, received: 100, status: "Closed" },
];

export const procurementSpend = round2(purchaseCategories.reduce((sum, row) => sum + row.value, 0));
export const procurementOpen = 12.8;
export const procurementVendors = 64;
export const procurementSavings = 2.6;

export const inventoryClasses: InventoryClass[] = [
  { name: "Land held for development", entityId: "LBH", value: 241.3 },
  { name: "Work in progress", entityId: "ARL", value: 112 },
  { name: "Finished stock", entityId: "ARL", value: 48.2 },
  { name: "Materials", entityId: "ARL", value: 8.3 },
  { name: "Work in progress", entityId: "PCS", value: 22.4 },
  { name: "Finished stock", entityId: "PCS", value: 8.2 },
  { name: "Materials", entityId: "PCS", value: 6.2 },
  { name: "Work in progress", entityId: "AHS", value: 24.6 },
  { name: "Finished stock", entityId: "AHS", value: 14.8 },
  { name: "Stores", entityId: "AFM", value: 0.8 },
];

export const headcount: HeadcountRow[] = [
  { entityId: "ARL", people: 420, monthlyPayroll: 1.85, attrition: 7.4, openRoles: 8 },
  { entityId: "PCS", people: 86, monthlyPayroll: 0.48, attrition: 6.1, openRoles: 2 },
  { entityId: "LBH", people: 48, monthlyPayroll: 0.22, attrition: 5.2, openRoles: 1 },
  { entityId: "AHS", people: 310, monthlyPayroll: 1.12, attrition: 12.8, openRoles: 12 },
  { entityId: "AFM", people: 186, monthlyPayroll: 0.64, attrition: 10.4, openRoles: 6 },
  { entityId: "PHC", people: 22, monthlyPayroll: 0.28, attrition: 3.6, openRoles: 1 },
];

export const capexProjects: CapexProject[] = [
  { id: "C1", name: "Kokapet towers", entityId: "ARL", place: "Hyderabad", finish: "Dec 2027", budget: 28, spent: 16.4, status: "On track" },
  { id: "C2", name: "PMAY phase 3", entityId: "AHS", place: "3 cities", finish: "Sep 2027", budget: 18.5, spent: 11.2, status: "On track" },
  { id: "C3", name: "Shamirpet conversion", entityId: "LBH", place: "Hyderabad", finish: "Jun 2027", budget: 12.6, spent: 9.8, status: "Watch" },
  { id: "C4", name: "Clubhouse", entityId: "ARL", place: "Kokapet", finish: "Mar 2027", budget: 9.5, spent: 3.8, status: "On track" },
  { id: "C5", name: "Gachibowli lobby", entityId: "PCS", place: "Hyderabad", finish: "Aug 2026", budget: 6.4, spent: 4.1, status: "Delayed" },
  { id: "C6", name: "Site infrastructure", entityId: "AHS", place: "Warangal", finish: "Nov 2027", budget: 5.4, spent: 2.2, status: "On track" },
  { id: "C7", name: "FM workshop", entityId: "AFM", place: "Hyderabad", finish: "May 2027", budget: 3.2, spent: 1.1, status: "On track" },
  { id: "C8", name: "Holdco office", entityId: "PHC", place: "Banjara Hills", finish: "Jan 2027", budget: 2.4, spent: 0.6, status: "Watch" },
];

export const capexBudget = round2(capexProjects.reduce((sum, row) => sum + row.budget, 0));
export const capexSpent = round2(capexProjects.reduce((sum, row) => sum + row.spent, 0));
export const capexCommitted = 18.4;
export const capexAvailable = round2(capexBudget - capexSpent - capexCommitted);

const approvalSeed: ApprovalItem[] = [
  { id: "AP-2401", code: "AP-2401", title: "Kokapet tower draw", module: "Capex", entityId: "ARL", owner: "Priya Shah", amount: 1.4, state: "pending" },
  { id: "AP-2402", code: "AP-2402", title: "UltraTech cement PO-1842", module: "Procurement", entityId: "LBH", owner: "S. Reddy", amount: 4.2, state: "pending" },
  { id: "AP-2403", code: "AP-2403", title: "Gachibowli lease concession", module: "Sales", entityId: "PCS", owner: "Arjun Mehta", amount: 0.85, state: "pending" },
  { id: "AP-2404", code: "AP-2404", title: "Group FP&A lead hire", module: "HR", entityId: "PHC", owner: "Neha Iyer", amount: 0.36, state: "pending" },
  { id: "AP-2405", code: "AP-2405", title: "Shamirpet EMI support", module: "Treasury", entityId: "LBH", owner: "RP desk", amount: 1.1, state: "pending" },
  { id: "AP-2406", code: "AP-2406", title: "PMAY unit price release", module: "Sales", entityId: "AHS", owner: "Neha Iyer", amount: 2.4, state: "pending" },
  { id: "AP-2407", code: "AP-2407", title: "Schneider MEP vendor onboard", module: "Procurement", entityId: "PCS", owner: "Kabir Das", amount: 2.8, state: "pending" },
];

let approvalItems: ApprovalItem[] = approvalSeed.map((item) => ({ ...item }));
const approvalListeners = new Set<() => void>();

export function getApprovals(): ApprovalItem[] {
  return approvalItems;
}

export function subscribeApprovals(listener: () => void): () => void {
  approvalListeners.add(listener);
  return () => {
    approvalListeners.delete(listener);
  };
}

export function decideApproval(id: string, state: Exclude<ApprovalState, "pending">): void {
  const current = approvalItems.find((item) => item.id === id);
  if (!current || current.state !== "pending") return;
  approvalItems = approvalItems.map((item) => (item.id === id ? { ...item, state } : item));
  approvalListeners.forEach((listener) => listener());
}

export const insights: Record<string, Insight[]> = {
  Dashboard: [
    {
      title: "Cure the PHC facility first",
      body: "The Kotak LAP is 18 days overdue. A remittance of ₹0.54 Cr plus penal interest this week keeps the account out of SMA-1 and protects the group borrowing rate.",
    },
    {
      title: "Land bank is the liquidity lever",
      body: "LBH carries ₹278.00 Cr of assets and only ₹4.10 Cr of cash. A staged plot sale to ARL funds EMIs without adding group debt.",
    },
    {
      title: "Margin sits in two entities",
      body: "Group EBITDA margin is 31.7%. ARL and PCS produce most of it. AHS at 14.0% pulls the blend down and deserves a pricing review.",
    },
    {
      title: "Cash is concentrated",
      body: "ARL holds ₹23.70 Cr, about 54% of group cash. A documented sweep policy lets LBH meet EMIs without a fresh sanction.",
    },
  ],
  Companies: [
    {
      title: "Two names need a watch rhythm",
      body: "LBH and AHS are the only Watch entities. LBH is a leverage story. AHS is a margin and LTV story. They need different actions, not one group covenant.",
    },
    {
      title: "The flagship still carries the group",
      body: "ARL is 60.7% of revenue and holds the deepest cash. Any delay in its collections shows up in the group forecast within two weeks.",
    },
    {
      title: "Facility management is the shock absorber",
      body: "AFM runs at 0.50x debt to equity. It can take a temporary working-capital stretch if the group wants to avoid drawing the Axis overdraft.",
    },
    {
      title: "Holdco is healthy, one loan is not",
      body: "PHC screens as Healthy on leverage and cash, but the Kotak LAP is Overdue. Entity status and facility status are telling different stories. Read both.",
    },
  ],
  Cash: [
    {
      title: "Group cover is comfortable",
      body: "Cash of ₹43.90 Cr against monthly EMI of ₹5.81 Cr on the tracked book is about 7.6 months of cover. The comfort is not evenly spread.",
    },
    {
      title: "November trough needs a pull-forward",
      body: "The 8-week forecast dips to ₹40.60 Cr in the week of 23 Nov. Bring the PCS collection forward by one week and the trough disappears.",
    },
    {
      title: "Sweep idle balances",
      body: "AFM and PHC together hold ₹5.10 Cr at a savings rate. Move ₹3.00 Cr onto the IndusInd FD ladder and keep operating float local.",
    },
    {
      title: "Book the land advance",
      body: "The largest open intercompany item is the ₹6.50 Cr land sale advance from LBH to ARL. Recognise it before the quarter closes so both balance sheets foot.",
    },
  ],
  Assets: [
    {
      title: "Trim the weak REIT",
      body: "Embassy REIT is up 14.6% with dividends of ₹1.24 Cr. Mindspace REIT is the only REIT position underwater. Trim Mindspace into Embassy on weakness.",
    },
    {
      title: "Do not realise Prestige yet",
      body: "Prestige Estates shares are ₹0.80 Cr below cost. The Hyderabad office cycle is the reason the group owns them. Hold through the next two quarters.",
    },
    {
      title: "Ladder the fixed deposit",
      body: "The IndusInd Bank FD of ₹15.00 Cr is the liquidity buffer. Split it so ₹5.00 Cr matures each quarter and treasury is never forced to break the whole deposit.",
    },
    {
      title: "Yield on the land bank",
      body: "LBH is 31% of group assets and contributes little revenue. Monetising a tenth of that land would lift group return on assets without a new equity raise.",
    },
  ],
  Loans: [
    {
      title: "Overdue is a this-week item",
      body: "Kotak Mahindra LAP on PHC is the only Overdue line. Clear ₹0.54 Cr before 25 Oct 2026 so the facility does not migrate to a watch-list classification.",
    },
    {
      title: "AHS is through the LTV ceiling",
      body: "PNB Housing is at 71% LTV against an internal ceiling of 70%. A ₹2.00 Cr prepayment, or extra security from ARL, restores headroom.",
    },
    {
      title: "Protect the cheap land loans",
      body: "Weighted cost of this book is about 9.3%. SBI and Bank of Baroda fund LBH near 8.8%. Leave those facilities alone and refinance the costlier working-capital lines first.",
    },
    {
      title: "Open the Axis renewal early",
      body: "The PCS overdraft matures on 31 Mar 2027. Start the renewal file in January so the spread is agreed before the sanction window closes.",
    },
  ],
  Insurance: [
    {
      title: "D&O lapses in November",
      body: "HDFC ERGO directors and officers cover on PHC expires on 15 Nov 2026. Bind the renewal before the November board so the side-A tower stays in force.",
    },
    {
      title: "Chase the CAR surveyor",
      body: "Tata AIG has an open contractors all-risk claim of ₹1.20 Cr on ARL. The surveyor report is the item that unlocks settlement. Follow it up this month.",
    },
    {
      title: "Renew workmen cover before mobilisation",
      body: "Bajaj Allianz workmen compensation for AHS ends on 30 Nov 2026, just as Phase 2 labour ramps. Renew at a higher sum insured of ₹8.00 Cr.",
    },
    {
      title: "Check FLEXA for gaps and overlap",
      body: "PCS and LBH both carry FLEXA. Confirm each land parcel is named once, and that no completed tower has dropped off the schedule.",
    },
  ],
  "Sales Pipeline": [
    {
      title: "Verbal stock is the near cash",
      body: "The verbal stage is ₹11.00 Cr at a 90% weight. PMAY block C is the largest piece and can be booked before 15 Nov 2026.",
    },
    {
      title: "Bookings are not revenue",
      body: "Won bookings are ₹51.40 Cr. Recognised group revenue is ₹234.00 Cr. Do not add the pipeline to the P&L.",
    },
    {
      title: "ARL still sets the funnel",
      body: "ARL holds ₹62.40 Cr of the open book. A slip in Kokapet pre-sales moves the group weighted pipeline more than any other name.",
    },
    {
      title: "LBH deals need land clearance",
      body: "The Shamirpet JV is only Qualified. Do not staff a project team until title and conversion are both in the data room.",
    },
  ],
  Procurement: [
    {
      title: "Cement is the open exposure",
      body: "PO-1842 is ₹4.20 Cr and only 62% received. It also sits in the approvals queue. Decide it before the next pour schedule.",
    },
    {
      title: "Spend is inside the build plan",
      body: "FY26 purchases are ₹96.40 Cr against an ₹86.00 Cr capex budget plus operating materials. The two books are not the same number.",
    },
    {
      title: "Three-way match is the control",
      body: "94% of invoices match the PO and the GRN. The gap is professional fees, where the PO is often raised after the bill.",
    },
    {
      title: "AFM can buy for the group",
      body: "Facility consumables are fragmented across entities. One AFM rate contract cuts the vendor count without moving the project POs.",
    },
  ],
  Inventory: [
    {
      title: "This page matches the asset book",
      body: "Inventory here is the same stock line as the Assets page. Land at LBH is the largest single class.",
    },
    {
      title: "Finished stock is the slow piece",
      body: "Finished units are the part that should turn. AHS carries unsold affordable stock that needs a price release, which is already in the queue.",
    },
    {
      title: "Land is not spare material",
      body: "LBH land is strategic inventory, not a stores balance. Do not apply a materials days-on-hand rule to it.",
    },
    {
      title: "PHC holds no stock",
      body: "PromoterHoldCo inventory is zero. Its balance sheet is investments and the treasury book, which is correct.",
    },
  ],
  "HR & Payroll": [
    {
      title: "Site rolls drive attrition",
      body: "AHS attrition is 12.8% and AFM is 10.4%. The holdco and the land bank are quiet. Retention spend belongs on the sites.",
    },
    {
      title: "Payroll is about a quarter of revenue",
      body: "The annual run-rate is twelve times the monthly bill. It should stay near a quarter of the ₹234.00 Cr revenue base.",
    },
    {
      title: "Twelve open roles sit in AHS",
      body: "Half the vacancy list is affordable housing. Fill site engineers before adding another holdco analyst.",
    },
    {
      title: "The FP&A hire is in the queue",
      body: "AP-2404 is a ₹0.36 Cr annual cost at PHC. Approve it only if the person closes the group pack, not a local MIS.",
    },
  ],
  "Projects & Capex": [
    {
      title: "Budget, spent, and committed foot",
      body: "₹49.20 Cr spent plus ₹18.40 Cr committed plus ₹18.40 Cr available equals the ₹86.00 Cr FY26 budget.",
    },
    {
      title: "Gachibowli lobby is late",
      body: "PCS is the only Delayed project. The finish date is Aug 2026, which is already behind a October review.",
    },
    {
      title: "Shamirpet is a watch, not a stop",
      body: "LBH has used most of its conversion budget. The next rupee needs the JV approval, not an automatic draw.",
    },
    {
      title: "Kokapet is the flagship draw",
      body: "ARL towers are on track and are the largest budget. The ₹1.40 Cr draw in the queue is the next certificate, not a new sanction.",
    },
  ],
  Approvals: [
    {
      title: "Seven items, one desk",
      body: "Capex, procurement, sales, HR, and treasury are in one queue so the group CFO sees the rupee before the entity does.",
    },
    {
      title: "Cement and MEP are the large tickets",
      body: "PO-1842 and the Schneider onboard are the two amounts above ₹2.00 Cr. Read those files first.",
    },
    {
      title: "A decision locks the row",
      body: "Approve and Reject update the badge immediately. A decided row cannot be clicked again in this demo.",
    },
    {
      title: "Price release helps inventory",
      body: "The AHS unit price release is the commercial unlock for finished affordable stock sitting on the inventory page.",
    },
  ],
  Alerts: [
    {
      title: "Two items inside eight days",
      body: "File the AHS RERA return on 22 Oct, then remit the PHC EMI by 25 Oct. Both are Critical, and both are cheaper to close than to explain later.",
    },
    {
      title: "November is a renewal cluster",
      body: "D&O, workmen compensation, and the LBH FLEXA review all fall before year end. One broker mandate will beat three separate negotiations.",
    },
    {
      title: "Cash alerts are early, not breaches",
      body: "The LBH cover warning and the AFM sweep are signals, not covenant breaches. A Monday treasury huddle keeps them from compounding.",
    },
    {
      title: "Close the GST variance in audit",
      body: "ARL shows a ₹1.80 Cr GST reconciliation gap versus the books. It is a close item, not a demand. Clear it before the tax audit starts on 12 Nov 2026.",
    },
  ],
};

export function entityById(id: string): Entity {
  const found = entities.find((entity) => entity.id === id);
  if (!found) {
    throw new Error(`Unknown entity ${id}`);
  }
  return found;
}

function assertClose(label: string, actual: number, expected: number): void {
  if (Math.abs(actual - expected) > 0.02) {
    throw new Error(`${label} expected ${expected} received ${actual}`);
  }
}

assertClose("revenue", group.revenue, 234);
assertClose("assets", group.assets, 893);
assertClose("debt", group.debt, 533);
assertClose("equity", group.equity, 360);
assertClose("cash", group.cash, 43.9);
assertClose("ebitda", group.ebitda, 74.178);
assertClose(
  "quarters",
  quarters.reduce((sum, point) => sum + point.revenue, 0),
  234,
);

let runningCash = group.cash;
for (const week of forecast) {
  assertClose(`${week.id} net`, week.net, round2(week.inflows - week.outflows));
  runningCash = round2(runningCash + week.net);
  assertClose(`${week.id} close`, week.closing, runningCash);
}

for (const line of balanceSheet) {
  const entity = entityById(line.entityId);
  const assets = round2(
    entity.cash + line.receivables + line.inventory + line.investments + line.fixedAssets,
  );
  assertClose(`${entity.id} assets`, assets, entity.assets);
  assertClose(`${entity.id} foot`, round2(entity.debt + entity.equity), entity.assets);
}

for (const position of investments) {
  assertClose(
    `${position.id} gl`,
    position.unrealizedGL,
    round2(position.currentValue - position.invested),
  );
  if (Math.abs(position.roi - (position.unrealizedGL / position.invested) * 100) > 0.06) {
    throw new Error(`${position.id} roi does not match price return`);
  }
}

assertClose("pipeline open", pipelineOpen, 124);
assertClose(
  "pipeline entities",
  round2(pipelineByEntity.reduce((sum, row) => sum + row.value, 0)),
  pipelineOpen,
);
assertClose("procurement spend", procurementSpend, 96.4);
assertClose("capex budget", capexBudget, 86);
assertClose("capex spent", capexSpent, 49.2);
assertClose("capex available", capexAvailable, 18.4);

const inventoryByEntity = new Map<string, number>();
for (const row of inventoryClasses) {
  inventoryByEntity.set(row.entityId, round2((inventoryByEntity.get(row.entityId) ?? 0) + row.value));
}
for (const line of balanceSheet) {
  assertClose(
    `${line.entityId} inventory class`,
    inventoryByEntity.get(line.entityId) ?? 0,
    line.inventory,
  );
}
