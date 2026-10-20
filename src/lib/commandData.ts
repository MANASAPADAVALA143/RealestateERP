export type Period = "Today" | "MTD" | "QTD" | "YTD";
export type PulseId = "ARL" | "PCS" | "LBH" | "AHS" | "RHC" | "IDT";

export const periods: Period[] = ["Today", "MTD", "QTD", "YTD"];
export const pulseIds: PulseId[] = ["ARL", "PCS", "LBH", "AHS", "RHC", "IDT"];

const periodFactor: Record<Period, number> = {
  Today: 1 / 20,
  MTD: 1,
  QTD: 1,
  YTD: 6.5,
};

export interface EntityPulse {
  id: PulseId;
  sector: string;
  revenue: number;
  margin: number;
  cash: number;
  exceptions: number;
  vs: number;
  tone: "green" | "amber" | "red" | "grey";
  arrow: string;
}

export const pulses: EntityPulse[] = [
  { id: "ARL", sector: "Real Estate", revenue: 3.2, margin: 34.2, cash: 1.1, exceptions: 1, vs: 4.1, tone: "green", arrow: "↑" },
  { id: "PCS", sector: "Manufacturing", revenue: 1.8, margin: 18.5, cash: 0.6, exceptions: 2, vs: -2.3, tone: "amber", arrow: "↓" },
  { id: "LBH", sector: "Real Estate", revenue: 0.9, margin: 8.2, cash: 0.3, exceptions: 3, vs: -6.8, tone: "red", arrow: "↓" },
  { id: "AHS", sector: "Hospitality", revenue: 1.2, margin: 22.4, cash: 0.8, exceptions: 0, vs: 1.2, tone: "green", arrow: "↑" },
  { id: "RHC", sector: "Heritage", revenue: 0.8, margin: 19.6, cash: 0.2, exceptions: 1, vs: -0.8, tone: "grey", arrow: "→" },
  { id: "IDT", sector: "Digital", revenue: 0.5, margin: 24.0, cash: 0.2, exceptions: 0, vs: 3.4, tone: "green", arrow: "↑" },
];

export const groupPulse = { revenue: 8.4, profit: 1.26, margin: 15, cash: 3.2, exceptions: 7, vs: 0.9 };

export function scaleFlow(value: number, period: Period): number {
  return value * periodFactor[period];
}

export function fmtCr(value: number, digits = 2): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${Math.abs(value).toFixed(digits)} Cr`;
}

export function fmtLakh(lakh: number): string {
  const sign = lakh < 0 ? "-" : "";
  const abs = Math.abs(lakh);
  if (abs >= 100) return `${sign}₹${(abs / 100).toFixed(2)} Cr`;
  const text = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1);
  return `${sign}₹${text} L`;
}

export function fmtSignedCr(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}₹${Math.abs(value).toFixed(2)} Cr`;
}

export const overdueByEntity: Record<PulseId, number> = {
  ARL: 19,
  PCS: 32,
  LBH: 17,
  AHS: 8,
  RHC: 0,
  IDT: 5,
};

export interface Receivable {
  id: string;
  customer: string;
  entity: PulseId;
  invoice: string;
  due: string;
  amount: number;
  days: number;
  bucket: "31-60" | "61-90" | "90+";
  owner: string;
  status: string;
}

export const receivables: Receivable[] = [
  { id: "r1", customer: "Mehta Exports", entity: "PCS", invoice: "12 Aug 2026", due: "12 Sep 2026", amount: 22, days: 38, bucket: "31-60", owner: "Rajesh Kumar", status: "Follow-up sent" },
  { id: "r2", customer: "Sunrise Builders", entity: "ARL", invoice: "28 Jul 2026", due: "27 Aug 2026", amount: 18, days: 54, bucket: "31-60", owner: "Priya Sharma", status: "Promise: 25 Oct" },
  { id: "r3", customer: "City Mall Corp", entity: "LBH", invoice: "15 Jul 2026", due: "14 Aug 2026", amount: 14, days: 67, bucket: "61-90", owner: "Ankit Verma", status: "Escalated" },
  { id: "r4", customer: "Raj Textiles", entity: "PCS", invoice: "1 Jul 2026", due: "31 Jul 2026", amount: 10, days: 81, bucket: "61-90", owner: "Rajesh Kumar", status: "Legal notice" },
  { id: "r5", customer: "Hotel Oasis", entity: "AHS", invoice: "20 Jun 2026", due: "20 Jul 2026", amount: 8, days: 92, bucket: "90+", owner: "Priya Sharma", status: "Disputed" },
  { id: "r6", customer: "TechBridge", entity: "IDT", invoice: "5 Jun 2026", due: "5 Jul 2026", amount: 5, days: 107, bucket: "90+", owner: "Sneha Rao", status: "No response" },
  { id: "r7", customer: "Global Infra", entity: "LBH", invoice: "1 Jun 2026", due: "1 Jul 2026", amount: 3, days: 111, bucket: "90+", owner: "Ankit Verma", status: "Write-off review" },
  { id: "r8", customer: "Pinnacle Co.", entity: "ARL", invoice: "25 May 2026", due: "24 Jun 2026", amount: 1, days: 118, bucket: "90+", owner: "Priya Sharma", status: "Last reminder" },
];

export const ageing = [
  { label: "0-30 days", lakh: 110, className: "bg-navy" },
  { label: "31-60 days", lakh: 32, className: "bg-amber-500" },
  { label: "61-90 days", lakh: 26, className: "bg-orange-500" },
  { label: "90+ days", lakh: 16, className: "bg-red-600" },
];

export type DecisionStatus = "Pending" | "In Review" | "Approved" | "Rejected";

export interface DecisionItem {
  id: string;
  n: number;
  action: string;
  entity: PulseId;
  type: string;
  amount: string;
  owner: string;
  due: string;
  priority: "High" | "Medium" | "Normal";
  status: DecisionStatus;
  reason: string;
  detail: string;
}

const decisionSeed: DecisionItem[] = [
  { id: "d1", n: 1, action: "Approve vendor payment — Bharat Steel", entity: "PCS", type: "Payment Approval", amount: "₹45 L", owner: "CFO", due: "22 Oct", priority: "High", status: "Pending", reason: "", detail: "Invoice PCS-8841 for steel. Paying it leaves the 30-day PCS position on watch unless October collections land." },
  { id: "d2", n: 2, action: "Capital expenditure — Aravali renovation", entity: "AHS", type: "Capex Approval", amount: "₹28 L", owner: "CEO", due: "25 Oct", priority: "High", status: "Pending", reason: "", detail: "Guest rooms 12 to 18. AHS cash stays above its minimum after this tranche." },
  { id: "d3", n: 3, action: "Review LBH lease covenant breach", entity: "LBH", type: "Compliance Review", amount: "—", owner: "Legal", due: "28 Oct", priority: "Medium", status: "In Review", reason: "", detail: "MG Road occupancy is 25% against an 80% lease covenant. Vacancy of 75% is the margin driver." },
  { id: "d4", n: 4, action: "Sign off Q2 statutory audit report", entity: "ARL", type: "Audit Sign-off", amount: "—", owner: "CFO", due: "31 Oct", priority: "Medium", status: "In Review", reason: "", detail: "Q2 pack is with the CFO. No draft qualification is on the file." },
  { id: "d5", n: 5, action: "Capital call notice — Phase 2", entity: "AHS", type: "Capital Call", amount: "₹1.2 Cr", owner: "CFO", due: "5 Nov", priority: "Normal", status: "Pending", reason: "", detail: "Phase 2 call of ₹1.2 Cr across AHS partners. Notice date is 5 Nov 2026." },
  { id: "d6", n: 6, action: "Renew insurance — PCS factory", entity: "PCS", type: "Insurance", amount: "₹8 L", owner: "CFO", due: "10 Nov", priority: "Normal", status: "Pending", reason: "", detail: "Factory policy renews 10 Nov. Premium ₹8 L with cover unchanged." },
];

export const completedActions = [
  { action: "Vendor payment cleared — UltraTech cement", entity: "LBH", date: "14 Oct 2026" },
  { action: "Salary register signed off", entity: "ARL", date: "15 Oct 2026" },
  { action: "GST return filed", entity: "PCS", date: "16 Oct 2026" },
  { action: "Insurance endorsement issued", entity: "AHS", date: "17 Oct 2026" },
  { action: "Rent demand issued", entity: "RHC", date: "18 Oct 2026" },
  { action: "OD sweep confirmed", entity: "IDT", date: "19 Oct 2026" },
];

let decisions = decisionSeed.map((item) => ({ ...item }));
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeDecisions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDecisions(): DecisionItem[] {
  return decisions;
}

export function pendingCount(entity?: string): number {
  return decisions.filter((item) => item.status === "Pending" && (!entity || item.entity === entity)).length;
}

export function approveDecision(id: string): void {
  decisions = decisions.map((item) => (item.id === id ? { ...item, status: "Approved", reason: "" } : item));
  emit();
}

export function rejectDecision(id: string, reason: string): void {
  decisions = decisions.map((item) => (item.id === id ? { ...item, status: "Rejected", reason } : item));
  emit();
}

export interface CashPosition {
  id: string;
  bank: number;
  restricted: number;
  available: number;
  committed: number;
  incoming: number;
  net: number;
  minimum: number;
  status: "Safe" | "Watch";
}

export const cashPositions: CashPosition[] = [
  { id: "ARL", bank: 1.35, restricted: 0.25, available: 1.1, committed: 0.42, incoming: 0.68, net: 0.26, minimum: 0.5, status: "Safe" },
  { id: "PCS", bank: 0.78, restricted: 0.18, available: 0.6, committed: 0.55, incoming: 0.32, net: -0.23, minimum: 0.4, status: "Watch" },
  { id: "LBH", bank: 0.42, restricted: 0.12, available: 0.3, committed: 0.28, incoming: 0.18, net: -0.1, minimum: 0.25, status: "Watch" },
  { id: "AHS", bank: 0.95, restricted: 0.15, available: 0.8, committed: 0.14, incoming: 0.26, net: 0.12, minimum: 0.3, status: "Safe" },
  { id: "RHC", bank: 0.28, restricted: 0.05, available: 0.23, committed: 0.06, incoming: 0.04, net: -0.02, minimum: 0.2, status: "Watch" },
  { id: "IDT", bank: 0.22, restricted: 0, available: 0.22, committed: 0.04, incoming: 0.08, net: 0.04, minimum: 0.1, status: "Safe" },
];

export const groupCash: CashPosition = {
  id: "GROUP",
  bank: 4,
  restricted: 0.75,
  available: 3.25,
  committed: 1.49,
  incoming: 1.56,
  net: 0.07,
  minimum: 1.75,
  status: "Safe",
};

export const cashPath = [3.2, 3.05, 2.85, 2.62, 2.4, 2.22, 2.1, 2.18, 2.32, 2.48, 2.6, 2.72, 2.8];
export const collectionPath = [0.18, 0.32, 0.48, 0.62, 0.78, 0.95, 1.12, 1.22, 1.35, 1.48, 1.58, 1.68, 1.8];
export const weekLabels = ["20 Oct", "27 Oct", "3 Nov", "10 Nov", "17 Nov", "24 Nov", "1 Dec", "8 Dec", "15 Dec", "22 Dec", "29 Dec", "5 Jan", "18 Jan"];
export const bufferCr = 1.75;
export const pcsBreachWeek = 6;

export interface UpcomingPayment {
  date: string;
  description: string;
  entity: string;
  category: "EMI" | "Vendor" | "Salary" | "Tax" | "Insurance";
  amount: number;
  status: string;
}

export const upcomingPayments: UpcomingPayment[] = [
  { date: "22 Oct", description: "SBI EMI — ARL001", entity: "ARL", category: "EMI", amount: 16, status: "Scheduled" },
  { date: "22 Oct", description: "Bharat Steel vendor payment", entity: "PCS", category: "Vendor", amount: 45, status: "Awaiting approval" },
  { date: "25 Oct", description: "October salaries", entity: "ARL", category: "Salary", amount: 14, status: "Scheduled" },
  { date: "28 Oct", description: "GST payment", entity: "PCS", category: "Tax", amount: 12, status: "Scheduled" },
  { date: "31 Oct", description: "HDFC EMI — LBH", entity: "LBH", category: "EMI", amount: 9, status: "Scheduled" },
  { date: "2 Nov", description: "Factory insurance renewal", entity: "PCS", category: "Insurance", amount: 8, status: "Scheduled" },
  { date: "5 Nov", description: "Aravali renovation tranche", entity: "AHS", category: "Vendor", amount: 28, status: "Awaiting approval" },
  { date: "7 Nov", description: "Payroll — hospitality", entity: "AHS", category: "Salary", amount: 6, status: "Scheduled" },
  { date: "10 Nov", description: "TDS deposit", entity: "LBH", category: "Tax", amount: 4, status: "Scheduled" },
  { date: "15 Nov", description: "Axis OD interest", entity: "PCS", category: "EMI", amount: 3, status: "Scheduled" },
];
