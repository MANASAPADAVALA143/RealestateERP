import {
  balanceSheet,
  entities,
  inrCr,
  loans,
  policies,
  type Entity,
  type Loan,
  type Policy,
} from "@/lib/demoData";

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026] as const;
const SCALE = [0.62, 0.71, 0.78, 0.86, 0.93, 1];
const AS_OF = new Date(2026, 9, 17);

function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function split(total: number, weights: number[]): number[] {
  const raw = weights.map((weight) => r2(total * weight));
  const drift = r2(total - raw.reduce((sum, value) => sum + value, 0));
  raw[raw.length - 1] = r2(raw[raw.length - 1] + drift);
  return raw;
}

export function signedCr(value: number): string {
  const text = inrCr(Math.abs(value));
  if (value > 0) return `+${text}`;
  if (value < 0) return `-${text}`;
  return text;
}

export function inrLakh(value: number): string {
  const abs = Math.abs(value);
  const text = abs >= 100 ? `₹${(abs / 100).toFixed(2)} Cr` : `₹${abs.toFixed(abs >= 10 ? 1 : 2)} L`;
  return value < 0 ? `-${text}` : text;
}

const extras: Entity[] = [
  {
    id: "RHC",
    code: "RHC",
    name: "Rajputana Heritage & Culture",
    role: "Heritage and culture",
    revenue: 21,
    ebitda: 4.2,
    assets: 36,
    debt: 14,
    cash: 2.4,
    equity: 22,
    status: "Healthy",
    focus: "Heritage properties and cultural programmes.",
    color: "#4A7B9D",
  },
  {
    id: "IDT",
    code: "IDT",
    name: "Indus Digital Technologies",
    role: "Digital services",
    revenue: 15,
    ebitda: 3.3,
    assets: 18,
    debt: 4,
    cash: 3.1,
    equity: 14,
    status: "Healthy",
    focus: "Technology park and digital services.",
    color: "#1C3352",
  },
];

const extraLines = [
  { entityId: "RHC", receivables: 2.1, inventory: 8, investments: 6, fixedAssets: 17.5 },
  { entityId: "IDT", receivables: 3.2, inventory: 0.4, investments: 4.5, fixedAssets: 6.8 },
];

const extraLoans: Loan[] = [
  {
    id: "LN-RHC",
    lender: "Bank of Baroda",
    entityId: "RHC",
    entityName: "Rajputana Heritage & Culture",
    type: "Term Loan",
    sanctioned: 10,
    outstanding: 8.4,
    rate: 8.95,
    emi: 0.14,
    maturity: "30 Jun 2031",
    ltv: 48,
    status: "Active",
  },
  {
    id: "LN-IDT",
    lender: "HDFC Bank",
    entityId: "IDT",
    entityName: "Indus Digital Technologies",
    type: "Term Loan",
    sanctioned: 4,
    outstanding: 2.6,
    rate: 9.4,
    emi: 0.06,
    maturity: "31 Mar 2029",
    ltv: 36,
    status: "Active",
  },
];

const extraPolicies: Policy[] = [
  {
    id: "POL-RHC",
    insurer: "New India Assurance",
    entityId: "RHC",
    entityName: "Rajputana Heritage & Culture",
    type: "Fire & Burglary",
    coverage: 22,
    premium: 0.08,
    expiry: "28 Feb 2027",
    status: "Active",
    claim: "None",
  },
  {
    id: "POL-IDT",
    insurer: "ICICI Lombard",
    entityId: "IDT",
    entityName: "Indus Digital Technologies",
    type: "FLEXA",
    coverage: 12,
    premium: 0.05,
    expiry: "18 Jan 2027",
    status: "Active",
    claim: "None",
  },
];

export interface RentalProperty {
  id: string;
  name: string;
  place: string;
  entityId: string;
  units: number;
  occupied: number;
  expected: number;
  collected: number;
  status: "Healthy" | "At Risk" | "Critical";
}

export const rentalProperties: RentalProperty[] = [
  { id: "abp", name: "Aryan Business Park", place: "Jaipur", entityId: "ARL", units: 120, occupied: 117, expected: 14.4, collected: 14.1, status: "Healthy" },
  { id: "rajpur", name: "Rajpur Road Commercial", place: "Jaipur", entityId: "ARL", units: 48, occupied: 45, expected: 9.6, collected: 9.2, status: "Healthy" },
  { id: "lbh-plaza", name: "LBH Plaza", place: "Jaipur", entityId: "LBH", units: 36, occupied: 30, expected: 5.4, collected: 4.8, status: "At Risk" },
  { id: "mg-road", name: "MG Road Office", place: "Jaipur", entityId: "LBH", units: 24, occupied: 18, expected: 4.8, collected: 3.6, status: "Critical" },
  { id: "aravali", name: "Aravali Suites", place: "Ajmer", entityId: "AHS", units: 40, occupied: 38, expected: 2.8, collected: 2.7, status: "Healthy" },
  { id: "tech-hub", name: "Tech Hub", place: "Jaipur", entityId: "IDT", units: 16, occupied: 13, expected: 1.4, collected: 1.1, status: "At Risk" },
];

export const rentalKpis = {
  properties: 6,
  units: 284,
  occupied: 261,
  vacant: 23,
  occupancy: 91.9,
  rentRoll: 38.4,
  collected: 35.1,
  collection: 91.4,
};

export interface UnitRow {
  name: string;
  status: "Occupied" | "Vacant";
  tenant: string;
  start: string;
  end: string;
  rent: string;
  loss: string;
}

const tenants = ["Mehta Traders", "Jaipur Clinics", "Northwind Retail", "S. Kothari", "Pearl Studios", "Indus BPO", "Agarwal Stores", "City Diagnostics"];

export function unitsFor(property: RentalProperty): UnitRow[] {
  const each = property.expected / property.units;
  return Array.from({ length: property.units }, (_, index) => {
    const vacant = index >= property.occupied;
    const rent = inrLakh(each);
    return {
      name: `Unit ${String(index + 1).padStart(3, "0")}`,
      status: vacant ? "Vacant" : "Occupied",
      tenant: vacant ? "—" : tenants[(index + property.name.length) % tenants.length],
      start: vacant ? "—" : "01 Apr 2024",
      end: vacant ? "—" : index % 9 === 0 ? "15 Dec 2026" : "31 Mar 2028",
      rent: vacant ? "—" : rent,
      loss: vacant ? rent : "—",
    };
  });
}

export function rentalById(id: string): RentalProperty | undefined {
  return rentalProperties.find((property) => property.id === id);
}

export interface YearPoint {
  year: number;
  revenue: number;
  opex: number;
  noi: number;
  net: number;
  interest: number;
  assets: number;
  liabilities: number;
  equity: number;
  bank: number;
  currentAssets: number;
  currentLiabilities: number;
  currentRatio: number;
  de: number;
  rental: number;
  services: number;
  sales: number;
  otherIncome: number;
  employee: number;
  materials: number;
  admin: number;
  marketing: number;
  depreciation: number;
  ocf: number;
  icf: number;
  fcf: number;
}

export interface Slice {
  name: string;
  value: number;
}

export interface PropertyRow {
  property: string;
  landCost: number;
  market: number;
  gl: number;
  roi: number;
  units: number;
  occupancy: number;
  rent: string;
}

export interface PartnerRow {
  partner: string;
  property: string;
  own: number;
  cost: number;
  market: number;
  gl: number;
  roi: number;
  status: "Healthy" | "Watch";
}

export interface CallRow {
  id: string;
  partner: string;
  called: number;
  received: number;
  outstanding: number;
  due: string;
  status: "Paid" | "Partial" | "Outstanding" | "Overdue";
}

export interface CoverageRow {
  property: string;
  insurable: number;
  insured: number;
  gap: number;
  ratio: number;
  status: "Adequate" | "Critically underinsured";
}

export interface PerilRow {
  property: string;
  fire: boolean;
  flood: boolean;
  wind: boolean;
  liability: boolean;
  quake: boolean;
}

export interface RenewalRow {
  days: number;
  name: string;
  detail: string;
  premium: string;
}

export interface AssetCard {
  name: string;
  value: number;
  prior: number;
}

export interface EntityBook {
  entity: Entity;
  opex: number;
  noi: number;
  interest: number;
  netIncome: number;
  ocf: number;
  financing: number;
  netCash: number;
  years: YearPoint[];
  quarters: { label: string; revenue: number; noi: number }[];
  months: { label: string; net: number }[];
  expenseMix: Slice[];
  incomeMix: Slice[];
  composition: Slice[];
  properties: PropertyRow[];
  partners: PartnerRow[];
  calls: CallRow[];
  ltv: number;
  debtYield: number;
  capRate: number;
  workingCapital: number;
  currentRatio: number;
  de: number;
  debtToAssets: number;
  capitalInvested: number;
  investmentValue: number;
  investmentReturn: number;
  assetCards: AssetCard[];
  lowCash: boolean;
}

const directory = [...entities, ...extras];

function lineFor(id: string) {
  return [...balanceSheet, ...extraLines].find((line) => line.entityId === id)!;
}

function buildBook(entity: Entity): EntityBook {
  const line = lineFor(entity.id);
  const opex = r2(entity.revenue - entity.ebitda);
  const noi = entity.ebitda;
  const interest = r2(entity.debt * 0.09);
  const netIncome = r2(noi - interest);
  const ocf = r2(noi * 0.72);
  const financing = r2(entity.debt * -0.018);
  const icf = r2(entity.assets * -0.012);
  const netCash = r2(ocf + financing + icf);
  const weakCash = entity.cash < 5;

  const years: YearPoint[] = YEARS.map((year, index) => {
    const factor = SCALE[index];
    const revenue = r2(entity.revenue * factor);
    const op = r2(opex * factor);
    const intCost = r2(interest * factor);
    const [rental, services, sales, otherIncome] = split(revenue, [0.34, 0.22, 0.32, 0.12]);
    const [employee, materials, admin, marketing, depreciation] = split(op, [0.36, 0.28, 0.16, 0.1, 0.1]);
    const assets = r2(entity.assets * factor);
    const liabilities = r2(entity.debt * factor);
    const equity = r2(assets - liabilities);
    const bank = r2(entity.cash * factor);
    const currentAssets = r2((entity.cash + line.receivables) * factor);
    const currentLiabilities = r2(Math.max(currentAssets / (weakCash ? 0.72 : 1.55), 0.1));
    const yearOcf = r2(ocf * factor);
    const yearIcf = r2(icf * factor);
    const yearFcf = r2(financing * factor);
    return {
      year,
      revenue,
      opex: op,
      noi: r2(revenue - op),
      net: r2(revenue - op - intCost),
      interest: intCost,
      assets,
      liabilities,
      equity,
      bank,
      currentAssets,
      currentLiabilities,
      currentRatio: r2(currentAssets / currentLiabilities),
      de: equity === 0 ? 0 : r2(liabilities / equity),
      rental,
      services,
      sales,
      otherIncome,
      employee,
      materials,
      admin,
      marketing,
      depreciation,
      ocf: yearOcf,
      icf: yearIcf,
      fcf: yearFcf,
    };
  });

  const latest = years[years.length - 1];
  const [q1, q2, q3, q4] = split(entity.revenue, [0.18, 0.22, 0.27, 0.33]);
  const noiParts = split(noi, [0.18, 0.22, 0.27, 0.33]);
  const quarters = ["Q1", "Q2", "Q3", "Q4"].map((label, index) => ({
    label,
    revenue: [q1, q2, q3, q4][index],
    noi: noiParts[index],
  }));
  const monthWeights = split(netIncome, [0.06, 0.07, 0.08, 0.07, 0.08, 0.09, 0.08, 0.09, 0.1, 0.09, 0.09, 0.1]);
  const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const months = monthNames.map((label, index) => ({ label, net: monthWeights[index] }));

  const expenseMix: Slice[] = [
    { name: "Employee Costs", value: latest.employee },
    { name: "Raw Materials", value: latest.materials },
    { name: "Admin", value: latest.admin },
    { name: "Marketing", value: latest.marketing },
    { name: "Depreciation", value: latest.depreciation },
  ];
  const incomeMix: Slice[] = [
    { name: "Rental Income", value: latest.rental },
    { name: "Services", value: latest.services },
    { name: "Sales", value: latest.sales },
    { name: "Other", value: latest.otherIncome },
  ];
  const composition: Slice[] = [
    { name: "Cash", value: entity.cash },
    { name: "AR", value: line.receivables },
    { name: "Fixed Assets", value: line.fixedAssets },
    { name: "Investments", value: line.investments },
    { name: "Other", value: line.inventory },
  ];

  const owned = rentalProperties.filter((property) => property.entityId === entity.id);
  const baseProps = owned.length
    ? owned
    : [{ id: `${entity.id}-hq`, name: `${entity.code} head asset`, place: "Hyderabad", entityId: entity.id, units: 1, occupied: 1, expected: 0, collected: 0, status: "Healthy" as const }];
  const stock = r2(line.fixedAssets + line.inventory);
  const unitTotal = baseProps.reduce((sum, property) => sum + property.units, 0) || 1;
  const properties: PropertyRow[] = baseProps.map((property) => {
    const share = property.units / unitTotal;
    const landCost = r2(stock * share * 0.72);
    const market = r2(stock * share);
    const gl = r2(market - landCost);
    return {
      property: property.name,
      landCost,
      market,
      gl,
      roi: landCost === 0 ? 0 : r2((gl / landCost) * 100),
      units: property.units,
      occupancy: property.units === 0 ? 0 : r2((property.occupied / property.units) * 100),
      rent: property.expected ? `${inrLakh(property.expected)} / mo` : "—",
    };
  });

  const shareSet = entity.id === "LBH" ? [62, 16, 10, 7, 5] : [34, 26, 18, 12, 10];
  const names = ["R. Agarwal", "S. Agarwal", "Meera Agarwal", "Vikram Singh", "Agarwal Family Trust"];
  const partners: PartnerRow[] = names.map((partner, index) => {
    const own = shareSet[index];
    const cost = r2(properties.reduce((sum, row) => sum + row.landCost, 0) * (own / 100));
    const market = r2(properties.reduce((sum, row) => sum + row.market, 0) * (own / 100));
    const gl = r2(market - cost);
    return {
      partner,
      property: properties[0]?.property ?? entity.code,
      own,
      cost,
      market,
      gl,
      roi: cost === 0 ? 0 : r2((gl / cost) * 100),
      status: own >= 50 ? "Watch" : "Healthy",
    };
  });

  const calls: CallRow[] = partners.slice(0, 4).map((partner, index) => {
    const called = r2(Math.max(partner.cost * 0.18, 0.2));
    const receivedRatio = index === 3 ? 0 : index === 2 ? 0.4 : 1;
    const received = r2(called * receivedRatio);
    const outstanding = r2(called - received);
    const status: CallRow["status"] = outstanding === 0 ? "Paid" : index === 3 ? "Overdue" : received === 0 ? "Outstanding" : "Partial";
    const due = index === 1 ? "—" : index === 3 ? "30 Sep 2026" : "15 Dec 2026";
    return { id: `${entity.id}-CC-${index + 1}`, partner: partner.partner, called, received, outstanding, due, status };
  });

  const capitalInvested = r2(properties.reduce((sum, row) => sum + row.landCost, 0));
  const investmentValue = r2(properties.reduce((sum, row) => sum + row.market, 0));

  return {
    entity,
    opex,
    noi,
    interest,
    netIncome,
    ocf,
    financing,
    netCash,
    years,
    quarters,
    months,
    expenseMix,
    incomeMix,
    composition,
    properties,
    partners,
    calls,
    ltv: weightedLtv(entity.id),
    debtYield: entity.debt === 0 ? 0 : r2((noi / entity.debt) * 100),
    capRate: stock === 0 ? 0 : r2((noi / stock) * 100),
    workingCapital: r2(latest.currentAssets - latest.currentLiabilities),
    currentRatio: latest.currentRatio,
    de: latest.de,
    debtToAssets: r2((entity.debt / entity.assets) * 100),
    capitalInvested,
    investmentValue,
    investmentReturn: r2(investmentValue - capitalInvested),
    assetCards: [
      { name: "Investments", value: line.investments, prior: r2(line.investments * 0.93) },
      { name: "Other Current Assets", value: line.receivables, prior: r2(line.receivables * 0.93) },
      { name: "Other Assets", value: line.inventory, prior: r2(line.inventory * 0.93) },
    ],
    lowCash: weakCash || latest.currentRatio < 1,
  };
}

const books = new Map<string, EntityBook>();

export function allBooks(): EntityBook[] {
  return directory.map((entity) => getBook(entity.id)!);
}

export function getBook(id: string): EntityBook | undefined {
  const key = id.toUpperCase();
  const found = directory.find((entity) => entity.id === key);
  if (!found) return undefined;
  const cached = books.get(key);
  if (cached) return cached;
  const book = buildBook(found);
  books.set(key, book);
  return book;
}

export function entityLoans(entityId: string): Loan[] {
  return [...loans, ...extraLoans].filter((loan) => loan.entityId === entityId.toUpperCase());
}

export function loanById(loanId: string): Loan | undefined {
  return [...loans, ...extraLoans].find((loan) => loan.id === loanId);
}

export function entityPolicies(entityId: string): Policy[] {
  return [...policies, ...extraPolicies].filter((policy) => policy.entityId === entityId.toUpperCase());
}

export function allPolicies(): Policy[] {
  return [...policies, ...extraPolicies];
}

const monthIndex: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export function daysUntil(expiry: string): number {
  const [day, month, year] = expiry.split(" ");
  const date = new Date(Number(year), monthIndex[month] ?? 0, Number(day));
  return Math.round((date.getTime() - AS_OF.getTime()) / 86400000);
}

export function coverageFor(entityId?: string): CoverageRow[] {
  const rows = entityId ? rentalProperties.filter((property) => property.entityId === entityId.toUpperCase()) : rentalProperties;
  if (rows.length === 0 && entityId) {
    return [{ property: `${entityId.toUpperCase()} operating asset`, insurable: 8, insured: 8.4, gap: 0, ratio: 105, status: "Adequate" }];
  }
  return rows.map((property, index) => {
    const insurable = r2(property.expected * 1.8);
    const insured = index % 3 === 0 ? r2(insurable * 0.62) : r2(insurable * 1.05);
    const gap = r2(Math.max(insurable - insured, 0));
    const ratio = insurable === 0 ? 0 : r2((insured / insurable) * 100);
    return {
      property: property.name,
      insurable,
      insured,
      gap,
      ratio,
      status: ratio < 80 ? "Critically underinsured" : "Adequate",
    };
  });
}

export function perilsFor(entityId?: string): PerilRow[] {
  const rows = entityId ? rentalProperties.filter((property) => property.entityId === entityId.toUpperCase()) : rentalProperties;
  if (rows.length === 0 && entityId) {
    return [{ property: `${entityId.toUpperCase()} operating asset`, fire: true, flood: false, wind: true, liability: true, quake: false }];
  }
  return rows.map((property, index) => ({
    property: property.name,
    fire: true,
    flood: index % 2 === 0,
    wind: index !== 3,
    liability: true,
    quake: index % 3 !== 2,
  }));
}

function weightedLtv(entityId: string): number {
  const book = entityLoans(entityId);
  const outstanding = book.reduce((sum, loan) => sum + loan.outstanding, 0);
  if (outstanding === 0) return 0;
  return r2(book.reduce((sum, loan) => sum + loan.ltv * loan.outstanding, 0) / outstanding);
}

export function renewalsFor(entityId?: string): RenewalRow[] {
  const list = entityId ? entityPolicies(entityId) : allPolicies();
  return list
    .map((policy) => ({
      days: daysUntil(policy.expiry),
      name: `${policy.type} · ${policy.entityId}`,
      detail: `${policy.insurer} · ${policy.id}`,
      premium: inrCr(policy.premium),
    }))
    .filter((row) => row.days >= 0)
    .sort((a, b) => a.days - b.days);
}

export function entityPoliciesSafe(entityId?: string): Policy[] {
  return entityId ? entityPolicies(entityId) : allPolicies();
}

export interface LoanView {
  loan: Loan;
  repaid: number;
  repaidPct: number;
  annualInterest: number;
  termMonths: number;
  emiDay: number;
  account: string;
  contact: string;
  phone: string;
  email: string;
  payments: { date: string; amount: string; principal: string; interest: string; balance: string }[];
}

export function loanView(loan: Loan): LoanView {
  const repaid = r2(loan.sanctioned - loan.outstanding);
  const annualInterest = r2((loan.outstanding * loan.rate) / 100);
  const start = new Date(2024, 3, 7);
  const payments = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 7);
    const interestPart = r2(loan.emi * 0.62);
    const principal = r2(loan.emi - interestPart);
    const balance = r2(loan.outstanding + principal * (5 - index));
    return {
      date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      amount: inrCr(loan.emi),
      principal: inrCr(principal),
      interest: inrCr(interestPart),
      balance: inrCr(balance),
    };
  });
  return {
    loan,
    repaid,
    repaidPct: loan.sanctioned === 0 ? 0 : r2((repaid / loan.sanctioned) * 100),
    annualInterest,
    termMonths: 120,
    emiDay: 7,
    account: loan.id.replace("LN-", "70640"),
    contact: "Relationship desk",
    phone: "+91 40 4000 2100",
    email: "credit@lender.example",
    payments,
  };
}
