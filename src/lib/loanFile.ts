import { loanById } from "@/lib/drillData";
import type { Loan } from "@/lib/demoData";

function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function r4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

export function annuityEmi(principal: number, annualRate: number, months = 60): number {
  const monthly = annualRate / 100 / 12;
  if (monthly === 0) return r4(principal / months);
  const growth = (1 + monthly) ** months;
  return r4((principal * monthly * growth) / (growth - 1));
}

export interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function amortize(opening: number, annualRate: number, emi: number, months = 60): AmortRow[] {
  const monthly = annualRate / 100 / 12;
  const rows: AmortRow[] = [];
  let balance = opening;
  for (let month = 1; month <= months && balance > 0.00005; month += 1) {
    const interest = r4(balance * monthly);
    let principal = r4(emi - interest);
    if (principal < 0) principal = 0;
    if (principal > balance) principal = r4(balance);
    const payment = r4(principal + interest);
    balance = r4(Math.max(balance - principal, 0));
    rows.push({ month, payment, principal, interest, balance });
  }
  return rows;
}

export function crToLakh(cr: number): string {
  const sign = cr < 0 ? "-" : "";
  return `${sign}₹${Math.abs(cr * 100).toFixed(2)} L`;
}

export interface LoanFile {
  id: string;
  name: string;
  typeLabel: string;
  lender: string;
  lenderShort: string;
  entityId: string;
  entityName: string;
  status: string;
  direction: "Borrowed" | "Lent";
  category: string;
  guarantor: string;
  contact: string;
  email: string;
  phone: string;
  asset: string;
  market: number;
  equity: number;
  ltv: number;
  outstanding: number;
  sanctioned: number;
  rate: number;
  emi: number;
  start: string;
  maturity: string;
  frequency: "Monthly" | "Quarterly" | "Bullet";
  emiDate: string;
  termLabel: string;
  prepay: string;
  account: string;
  outstandingInterest: number;
  downPayment: number;
  propertyValue: number;
  noi: number;
  compound: boolean;
  notes: string;
  building: string;
}

interface SparksSeed {
  id: string;
  lender: string;
  lenderShort: string;
  entityId: string;
  entityName: string;
  category: string;
  typeLabel: string;
  rate: number;
  guarantor: string;
  contact: string;
  email: string;
  phone: string;
  asset: string;
  market: number;
  equity: number;
  ltv: number;
  account: string;
}

const sparks: SparksSeed[] = [
  { id: "SBI-ARL001", lender: "State Bank of India", lenderShort: "SBI", entityId: "ARL", entityName: "Agarwal Realty Ltd", category: "Term Loan", typeLabel: "TERM LOAN", rate: 8.65, guarantor: "Aryan Group / Directors", contact: "Priya Sharma", email: "priya.sharma@sbi.co.in", phone: "+91-141-2345678", asset: "Aryan Business Park", market: 32, equity: 24.18, ltv: 24.4, account: "ARL001" },
  { id: "HDFC-ARL002", lender: "HDFC Bank", lenderShort: "HDFC", entityId: "ARL", entityName: "Agarwal Realty Ltd", category: "Mortgage", typeLabel: "MORTGAGE", rate: 9.25, guarantor: "Aryan Group", contact: "Rahul Mehta", email: "rahul.mehta@hdfcbank.com", phone: "+91-141-4001234", asset: "Rajpur Road Commercial", market: 145, equity: 66.6, ltv: 54.1, account: "ARL002" },
  { id: "HDFC-PCS002", lender: "HDFC Bank", lenderShort: "HDFC", entityId: "PCS", entityName: "Prime Commercial SPV", category: "Term Loan", typeLabel: "TERM LOAN", rate: 9.1, guarantor: "Precision Components / Directors", contact: "Anjali Singh", email: "anjali.singh@hdfcbank.com", phone: "+91-141-4005678", asset: "PCS Factory, Bhiwadi", market: 8.5, equity: 6.05, ltv: 28.8, account: "PCS002" },
  { id: "ICICI-LBH003", lender: "ICICI Bank", lenderShort: "ICICI", entityId: "LBH", entityName: "Land Bank Holdco", category: "Term Loan", typeLabel: "TERM LOAN", rate: 8.9, guarantor: "Lakshmi Buildcon / Directors", contact: "Vikram Nair", email: "vikram.nair@icicibank.com", phone: "+91-141-3001234", asset: "LBH Plaza, Jaipur", market: 28, equity: 16.8, ltv: 40, account: "LBH003" },
  { id: "Axis-AHS004", lender: "Axis Bank", lenderShort: "AXIS", entityId: "AHS", entityName: "Affordable Housing SPV", category: "Term Loan", typeLabel: "TERM LOAN", rate: 9.4, guarantor: "Aravali Hospitality", contact: "Deepa Verma", email: "deepa.verma@axisbank.com", phone: "+91-145-2345678", asset: "Aravali Suites, Ajmer", market: 12, equity: 9.5, ltv: 20.8, account: "AHS004" },
  { id: "Kotak-IDT005", lender: "Kotak Mahindra Bank", lenderShort: "KOTAK", entityId: "IDT", entityName: "Indus Digital Technologies", category: "Term Loan", typeLabel: "TERM LOAN", rate: 10.1, guarantor: "Indus Digital / Directors", contact: "Sanjay Patel", email: "sanjay.patel@kotak.com", phone: "+91-141-6001234", asset: "Tech Hub, Jaipur", market: 4.5, equity: 3.18, ltv: 29.3, account: "IDT005" },
  { id: "SBI-RHC006", lender: "State Bank of India", lenderShort: "SBI", entityId: "RHC", entityName: "Rajputana Heritage & Culture", category: "Mortgage", typeLabel: "MORTGAGE", rate: 8.75, guarantor: "Rajputana Heritage / Directors", contact: "Meena Joshi", email: "meena.joshi@sbi.co.in", phone: "+91-141-2349876", asset: "Rajputana Heritage Hotel", market: 18, equity: 14.2, ltv: 21.1, account: "RHC006" },
];

function fromSeed(seed: SparksSeed): LoanFile {
  const outstanding = r2((seed.market * seed.ltv) / 100);
  const emi = annuityEmi(outstanding, seed.rate, 60);
  return {
    id: seed.id,
    name: `${seed.lenderShort} – ${seed.account}`,
    typeLabel: seed.typeLabel,
    lender: seed.lender,
    lenderShort: seed.lenderShort,
    entityId: seed.entityId,
    entityName: seed.entityName,
    status: "Active",
    direction: "Borrowed",
    category: seed.category,
    guarantor: seed.guarantor,
    contact: seed.contact,
    email: seed.email,
    phone: seed.phone,
    asset: seed.asset,
    market: seed.market,
    equity: seed.equity,
    ltv: seed.ltv,
    outstanding,
    sanctioned: r2(outstanding / 0.82),
    rate: seed.rate,
    emi,
    start: "2021-11-07",
    maturity: "2031-11-07",
    frequency: "Monthly",
    emiDate: "2026-11-07",
    termLabel: "5 years",
    prepay: "Allowed after 12 EMIs, with a 2% prepayment fee",
    account: seed.account,
    outstandingInterest: r4(outstanding * (seed.rate / 100) / 12),
    downPayment: seed.equity,
    propertyValue: seed.market,
    noi: r2(seed.market * 0.08),
    compound: false,
    notes: "",
    building: seed.asset,
  };
}

const assetByEntity: Record<string, string> = {
  ARL: "Kokapet towers",
  PCS: "Gachibowli office",
  LBH: "Shamirpet land",
  AHS: "PMAY phase 3",
  AFM: "FM workshop",
  PHC: "Holdco office",
  RHC: "Rajputana Heritage Hotel",
  IDT: "Tech Hub, Jaipur",
};

function fromBookLoan(loan: Loan): LoanFile {
  const market = loan.ltv > 0 ? r2(loan.outstanding / (loan.ltv / 100)) : loan.outstanding;
  const short = loan.lender.split(" ")[0].toUpperCase();
  return {
    id: loan.id,
    name: `${short} – ${loan.id}`,
    typeLabel: loan.type.toUpperCase(),
    lender: loan.lender,
    lenderShort: short,
    entityId: loan.entityId,
    entityName: loan.entityName,
    status: loan.status,
    direction: "Borrowed",
    category: loan.type,
    guarantor: "Gnanova Group / Directors",
    contact: "Relationship manager",
    email: "rm@bank.in",
    phone: "+91-141-2345000",
    asset: assetByEntity[loan.entityId] ?? loan.entityName,
    market,
    equity: r2(market - loan.outstanding),
    ltv: loan.ltv,
    outstanding: loan.outstanding,
    sanctioned: loan.sanctioned,
    rate: loan.rate,
    emi: loan.emi,
    start: "2024-04-07",
    maturity: "2031-03-31",
    frequency: "Monthly",
    emiDate: "2026-11-07",
    termLabel: "10 years",
    prepay: "Allowed after 12 months",
    account: loan.id,
    outstandingInterest: r4(loan.outstanding * (loan.rate / 100) / 12),
    downPayment: r2(Math.max(market - loan.sanctioned, 0)),
    propertyValue: market,
    noi: r2(market * 0.06),
    compound: false,
    notes: "",
    building: assetByEntity[loan.entityId] ?? loan.entityName,
  };
}

const baseFiles = new Map<string, LoanFile>(sparks.map((seed) => [seed.id, fromSeed(seed)]));

const edits = new Map<string, Partial<LoanFile>>();
const extraPayments = new Map<string, HistoryRow[]>();

export function sparksForEntity(entityId: string): LoanFile[] {
  return sparks.filter((seed) => seed.entityId === entityId.toUpperCase()).map((seed) => resolveLoan(seed.id)!);
}

export function resolveLoan(id: string): LoanFile | undefined {
  const base = baseFiles.get(id) ?? (loanById(id) ? fromBookLoan(loanById(id) as Loan) : undefined);
  if (!base) return undefined;
  return { ...base, ...edits.get(id) };
}

export function saveLoanFile(file: LoanFile): void {
  edits.set(file.id, file);
}

export interface HistoryRow {
  n: number;
  datePaid: string;
  emiDate: string;
  amount: number;
  principal: number;
  interest: number;
  recorded: string;
}

const monthLabel = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function paymentHistory(file: LoanFile): HistoryRow[] {
  const schedule = amortize(file.outstanding, file.rate, file.emi, 60).slice(0, 6);
  const stamped = schedule.map((row, index) => {
    const date = new Date(2026, 4 + index, 7);
    const label = `07 ${monthLabel[date.getMonth()]} ${date.getFullYear()}`;
    return {
      n: index + 1,
      datePaid: label,
      emiDate: label,
      amount: row.payment,
      principal: row.principal,
      interest: row.interest,
      recorded: "CFO Office",
    };
  });
  const added = extraPayments.get(file.id) ?? [];
  return [...added, ...stamped.reverse()].map((row, index) => ({ ...row, n: index + 1 }));
}

export function recordPayment(file: LoanFile): void {
  const interest = r4(file.outstanding * (file.rate / 100) / 12);
  const principal = r4(Math.max(file.emi - interest, 0));
  const row: HistoryRow = {
    n: 0,
    datePaid: "20 Oct 2026",
    emiDate: "07 Oct 2026",
    amount: r4(principal + interest),
    principal,
    interest,
    recorded: "CFO Office",
  };
  extraPayments.set(file.id, [row, ...(extraPayments.get(file.id) ?? [])]);
}

export function scheduleFor(file: LoanFile): AmortRow[] {
  return amortize(file.outstanding, file.rate, file.emi, 60);
}

export interface AuditEntry {
  n: number;
  when: string;
  entity: string;
  detail: string;
  action: "Payment" | "Updated" | "Created";
  category: "Payment Entry" | "Data Update" | "Loan Created";
  by: string;
}

export function auditLog(file: LoanFile): AuditEntry[] {
  const rows: Omit<AuditEntry, "n">[] = [
    { when: "20 Oct 2026, 09:40", entity: file.entityId, detail: "EMI receipt matched to the October demand.", action: "Payment", category: "Payment Entry", by: "CFO Office" },
    { when: "07 Oct 2026, 11:15", entity: file.entityId, detail: "Outstanding interest refreshed from the lender statement.", action: "Updated", category: "Data Update", by: "CFO Office" },
    { when: "07 Sep 2026, 10:05", entity: file.entityId, detail: "September EMI posted to the loan account.", action: "Payment", category: "Payment Entry", by: "CFO Office" },
    { when: "18 Aug 2026, 16:20", entity: file.entityId, detail: "Linked asset market value confirmed.", action: "Updated", category: "Data Update", by: "CFO Office" },
    { when: "07 Aug 2026, 10:02", entity: file.entityId, detail: "August EMI posted to the loan account.", action: "Payment", category: "Payment Entry", by: "CFO Office" },
    { when: "07 Nov 2021, 12:00", entity: file.entityId, detail: "Facility opened on the group register.", action: "Created", category: "Loan Created", by: "CFO Office" },
  ];
  return rows.map((row, index) => ({ ...row, n: index + 1 }));
}
