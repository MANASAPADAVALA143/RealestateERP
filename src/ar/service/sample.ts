import { ArError, SAMPLE, type ArService } from "./arService.ts";
import type { ArInvoice, ArLease, ArTenant, ChargeSchedule } from "../engine/types.ts";

const OPERATING = "Operating — First Texas Bank";
const EUR_BANK = "EUR collections — Deutsche Bank";

interface SampleTenant {
  code: string;
  name: string;
  entityId: string;
  propertyId: string;
  propertyName: string;
  building: string;
  unit: string;
  contactName: string;
  email: string;
  currency: string;
  lease: { code: string; start: string; end: string; deposit: number; charges: Omit<ChargeSchedule, "id">[] };
}

const tenants: SampleTenant[] = [
  { code: "MER-110", name: "ABC Technologies Inc.", entityId: "MHLP", propertyId: "MER-1790", propertyName: "1790 Meridian Blvd", building: "Suite block A", unit: "110", contactName: "Priya Raman", email: "ap@abctech.example", currency: "USD", lease: { code: "L-MER-110", start: "2025-02-01", end: "2028-01-31", deposit: 17_000, charges: [{ type: "base_rent", description: "Base rent", amount: 8_500, frequency: "monthly", escalationPct: 3 }, { type: "cam", description: "CAM charges", amount: 650, frequency: "monthly", escalationPct: 0 }] } },
  { code: "MER-120", name: "Global Consulting LLC", entityId: "MHLP", propertyId: "MER-1790", propertyName: "1790 Meridian Blvd", building: "Suite block A", unit: "120", contactName: "Marcus Hale", email: "finance@globalconsulting.example", currency: "USD", lease: { code: "L-MER-120", start: "2024-06-01", end: "2027-05-31", deposit: 0, charges: [{ type: "base_rent", description: "Base rent", amount: 6_200, frequency: "monthly", escalationPct: 3 }, { type: "cam", description: "CAM charges", amount: 480, frequency: "monthly", escalationPct: 0 }, { type: "parking", description: "Reserved parking (2 bays)", amount: 150, frequency: "monthly", escalationPct: 0 }] } },
  { code: "MER-130", name: "Lone Star Dental Group", entityId: "MHLP", propertyId: "MER-1790", propertyName: "1790 Meridian Blvd", building: "Suite block B", unit: "130", contactName: "Dr. Elena Cruz", email: "office@lonestardental.example", currency: "USD", lease: { code: "L-MER-130", start: "2025-01-01", end: "2027-12-31", deposit: 0, charges: [{ type: "base_rent", description: "Base rent", amount: 4_550, frequency: "monthly", escalationPct: 0 }, { type: "utilities", description: "Utility recoveries", amount: 220, frequency: "monthly", escalationPct: 0 }] } },
  { code: "BLU-G01", name: "Delta Retail Inc.", entityId: "BRL", propertyId: "P001", propertyName: "Bluestone Plaza", building: "Retail podium", unit: "G-01", contactName: "Sam Ortiz", email: "leases@deltaretail.example", currency: "USD", lease: { code: "L-BLU-G01", start: "2026-01-01", end: "2030-12-31", deposit: 24_000, charges: [{ type: "base_rent", description: "Base rent", amount: 12_000, frequency: "monthly", escalationPct: 3 }, { type: "cam", description: "CAM charges", amount: 900, frequency: "monthly", escalationPct: 0 }] } },
  { code: "BLU-G02", name: "Sunrise Fitness LLC", entityId: "BRL", propertyId: "P001", propertyName: "Bluestone Plaza", building: "Retail podium", unit: "G-02", contactName: "Jordan Lee", email: "accounts@sunrisefitness.example", currency: "USD", lease: { code: "L-BLU-G02", start: "2026-09-15", end: "2031-09-14", deposit: 0, charges: [{ type: "base_rent", description: "Base rent (quarterly in advance)", amount: 27_000, frequency: "quarterly", escalationPct: 2.5 }, { type: "cam", description: "CAM charges", amount: 600, frequency: "monthly", escalationPct: 0 }] } },
  { code: "CRV-W1", name: "Rhein Logistik GmbH", entityId: "CCL", propertyId: "P002", propertyName: "Crestview Logistics Park", building: "Warehouse 1", unit: "W-1", contactName: "Katrin Vogel", email: "kreditoren@rheinlogistik.example", currency: "EUR", lease: { code: "L-CRV-W1", start: "2026-07-01", end: "2029-06-30", deposit: 0, charges: [{ type: "base_rent", description: "Base rent", amount: 15_000, frequency: "monthly", escalationPct: 0 }, { type: "maintenance", description: "Maintenance recoveries", amount: 400, frequency: "monthly", escalationPct: 0 }] } },
];

/**
 * Loads a sample portfolio through the normal service methods, so every invoice, receipt, and credit
 * note is validated and journalled exactly as user-entered records are. All records are tagged “Sample data”.
 */
export async function loadSample(service: ArService, workspaceId: string): Promise<void> {
  if (!(await service.isEmpty(workspaceId))) throw new ArError("The AR ledger already has records. Sample data can only be loaded into an empty ledger.");
  const settings = await service.settings(workspaceId);
  await service.saveSettings(
    {
      ...settings,
      bankAccounts: [
        { name: OPERATING, code: "1010", currency: "USD" },
        { name: EUR_BANK, code: "1015", currency: "EUR" },
      ],
      fxRates: [
        { currency: "EUR", period: "2026-07", rate: 1.09 },
        { currency: "EUR", period: "2026-08", rate: 1.09 },
        { currency: "EUR", period: "2026-09", rate: 1.1 },
        { currency: "EUR", period: "2026-10", rate: 1.08 },
        { currency: "EUR", period: "2026-11", rate: 1.07 },
      ],
    },
    "Sample bank accounts and EUR exchange rates loaded.",
  );

  const byCode = new Map<string, { tenant: ArTenant; lease: ArLease }>();
  for (const item of tenants) {
    const tenant = await service.saveTenant({ workspaceId, code: item.code, name: item.name, entityId: item.entityId, propertyId: item.propertyId, propertyName: item.propertyName, building: item.building, unit: item.unit, contactName: item.contactName, email: item.email, phone: "", billingFrequency: item.lease.charges[0].frequency, paymentTermsDays: 5, currency: item.currency, collectionOwner: "CFO Office", status: "Active", source: SAMPLE });
    const lease = await service.saveLease({ workspaceId, code: item.lease.code, tenantId: tenant.id, entityId: item.entityId, propertyId: item.propertyId, propertyName: item.propertyName, building: item.building, unit: item.unit, start: item.lease.start, end: item.lease.end, currency: item.currency, charges: item.lease.charges.map((charge) => ({ ...charge, id: charge.type })), depositRequired: item.lease.deposit, status: "Active", source: SAMPLE });
    byCode.set(item.code, { tenant, lease });
  }
  const t = (code: string) => byCode.get(code)!.tenant;

  await service.recordDeposit(workspaceId, { tenantId: t("MER-110").id, leaseId: byCode.get("MER-110")!.lease.id, amount: 17_000, currency: "USD", receivedDate: "2026-07-28", bankAccount: OPERATING, source: SAMPLE });
  await service.recordDeposit(workspaceId, { tenantId: t("BLU-G01").id, leaseId: byCode.get("BLU-G01")!.lease.id, amount: 24_000, currency: "USD", receivedDate: "2026-07-30", bankAccount: OPERATING, source: SAMPLE });

  const invoices = new Map<string, ArInvoice>();
  for (const period of ["2026-08", "2026-09", "2026-10", "2026-11"]) {
    const { created } = await service.createDrafts(workspaceId, period, { source: SAMPLE });
    for (const draft of created) {
      await service.approveInvoice(draft.id);
      const posted = await service.postInvoice(draft.id);
      const code = [...byCode.values()].find((entry) => entry.tenant.id === posted.tenantId)!.tenant.code;
      invoices.set(`${code}|${period}`, posted);
    }
  }
  const inv = (code: string, period: string) => invoices.get(`${code}|${period}`)!;
  const pay = (code: string, date: string, amount: number, allocations: [string, number][], reference: string) => {
    const tenant = t(code);
    return service.recordPayment(workspaceId, { tenantId: tenant.id, receivedDate: date, amount, currency: tenant.currency, bankAccount: tenant.currency === "EUR" ? EUR_BANK : OPERATING, method: "Bank transfer", reference, allocations: allocations.map(([period, value]) => ({ invoiceId: inv(code, period).id, amount: value })), source: SAMPLE });
  };

  for (const [period, date] of [["2026-08", "2026-08-03"], ["2026-09", "2026-09-03"], ["2026-10", "2026-10-02"], ["2026-11", "2026-11-04"]]) await pay("MER-110", date, inv("MER-110", period).total, [[period, inv("MER-110", period).total]], `ACH ${period}`);

  await pay("MER-120", "2026-09-12", 3_000, [["2026-08", 3_000]], "Wire — part payment August");
  await pay("MER-120", "2026-10-20", inv("MER-120", "2026-09").total, [["2026-09", inv("MER-120", "2026-09").total]], "Wire — September rent");
  await pay("MER-120", "2026-11-02", 4_000, [["2026-10", 4_000]], "Wire — part payment October");

  await pay("MER-130", "2026-08-05", inv("MER-130", "2026-08").total, [["2026-08", inv("MER-130", "2026-08").total]], "Check 4411");
  await pay("MER-130", "2026-09-06", inv("MER-130", "2026-09").total, [["2026-09", inv("MER-130", "2026-09").total]], "Check 4432");
  await pay("MER-130", "2026-11-05", 1_500, [], "Check 4470 — no remittance advice");

  await pay("BLU-G01", "2026-08-04", inv("BLU-G01", "2026-08").total, [["2026-08", inv("BLU-G01", "2026-08").total]], "ACH Aug");
  await pay("BLU-G01", "2026-09-08", inv("BLU-G01", "2026-09").total, [["2026-09", inv("BLU-G01", "2026-09").total]], "ACH Sep");
  const deltaOctRent = inv("BLU-G01", "2026-10").lines.find((line) => line.chargeType === "base_rent")!.amount;
  await pay("BLU-G01", "2026-10-09", deltaOctRent, [["2026-10", deltaOctRent]], "ACH Oct — rent only");
  await pay("BLU-G01", "2026-11-05", inv("BLU-G01", "2026-11").total, [["2026-11", inv("BLU-G01", "2026-11").total]], "ACH Nov");

  await pay("BLU-G02", "2026-09-25", inv("BLU-G02", "2026-09").total, [["2026-09", inv("BLU-G02", "2026-09").total]], "ACH first invoice");
  await pay("BLU-G02", "2026-10-08", inv("BLU-G02", "2026-10").total, [["2026-10", inv("BLU-G02", "2026-10").total]], "ACH Oct CAM");

  await pay("CRV-W1", "2026-08-10", inv("CRV-W1", "2026-08").total, [["2026-08", inv("CRV-W1", "2026-08").total]], "SEPA Aug");
  await pay("CRV-W1", "2026-10-04", inv("CRV-W1", "2026-09").total, [["2026-09", inv("CRV-W1", "2026-09").total]], "SEPA Sep");
  await pay("CRV-W1", "2026-11-03", inv("CRV-W1", "2026-10").total, [["2026-10", inv("CRV-W1", "2026-10").total]], "SEPA Oct");

  const credit = await service.createCreditNote(workspaceId, { invoiceId: inv("MER-130", "2026-10").id, amount: 70, reason: "Utility recovery over-billed in October (meter re-read)", type: "credit", chargeType: "utilities", date: "2026-10-15", source: SAMPLE });
  if (credit.status === "Draft") await service.approveCreditNote(credit.id);

  await service.openDispute(workspaceId, { invoiceId: inv("BLU-G01", "2026-10").id, amount: 900, reason: "Tenant withholds October CAM until the 2025 CAM reconciliation is provided", owner: "Property manager — Bluestone" });

  await service.addFollowUp(workspaceId, { tenantId: t("MER-120").id, invoiceId: inv("MER-120", "2026-08").id, date: "2026-09-20", type: "Call", note: "Spoke to Marcus Hale; promised the August balance by month end.", promiseDate: "2026-09-30", promiseAmount: inv("MER-120", "2026-08").total - 3_000 });
  await service.addFollowUp(workspaceId, { tenantId: t("MER-120").id, date: "2026-10-25", type: "Email", note: "Statement of account sent. Tenant cites delayed client receipts; will clear August and October balances.", promiseDate: "2026-11-15", nextFollowUp: "2026-11-16" });
  await service.addFollowUp(workspaceId, { tenantId: t("MER-130").id, invoiceId: inv("MER-130", "2026-10").id, date: "2026-11-06", type: "Reminder", note: "Reminder: October rent and utilities remain unpaid. Please remit or send remittance advice for check 4470.", nextFollowUp: "2026-11-13" });
}
