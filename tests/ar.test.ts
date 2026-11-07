import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryById } from "../src/integrations/engine/categories.ts";
import { adapterAliases, applyAdapter } from "../src/integrations/engine/connectors.ts";
import { dataRows, detectHeaderRow, headersFor, parseWorkbook, profileColumns } from "../src/integrations/engine/parse.ts";
import type { CategoryId, DateOrder } from "../src/integrations/engine/types.ts";
import { IntegrationService, autoMapping } from "../src/integrations/service/service.ts";
import { MemoryAdapter } from "../src/integrations/service/storage.ts";
import { DEFAULT_TENANT } from "../src/integrations/service/master.ts";
import { ageing, balances, bucketTotals, collectionsByBank, drill, kpis, statementOfAccount, subledgerSummary, tenantBalances } from "../src/ar/engine/analytics.ts";
import { suggestMatch } from "../src/ar/engine/importer.ts";
import { collectionsIntelligence } from "../src/ar/engine/intelligence.ts";
import { trialBalance } from "../src/ar/engine/ledger.ts";
import type { ArBook } from "../src/ar/engine/types.ts";
import { ArService } from "../src/ar/service/arService.ts";
import { loadSample } from "../src/ar/service/sample.ts";
import * as fx from "./fixtures.ts";

const W = DEFAULT_TENANT;

function setup() {
  const integration = new IntegrationService(new MemoryAdapter());
  return { integration, ar: new ArService(integration) };
}

async function addTenant(ar: ArService, code: string, overrides: Record<string, unknown> = {}) {
  return ar.saveTenant({ workspaceId: W, code, name: `Tenant ${code}`, entityId: "MHLP", propertyId: "MER-1790", propertyName: "1790 Meridian Blvd", building: "A", unit: code, contactName: "", email: "", phone: "", billingFrequency: "monthly", paymentTermsDays: 5, currency: "USD", collectionOwner: "CFO Office", status: "Active", ...overrides });
}

async function addLease(ar: ArService, tenantId: string, code: string, start: string, charges: { type: "base_rent" | "cam" | "parking"; amount: number; frequency?: "monthly" | "quarterly"; escalationPct?: number }[], overrides: Record<string, unknown> = {}) {
  return ar.saveLease({ workspaceId: W, code, tenantId, entityId: "MHLP", propertyId: "MER-1790", propertyName: "1790 Meridian Blvd", building: "A", unit: code, start, end: "2030-12-31", currency: "USD", depositRequired: 0, status: "Active", charges: charges.map((charge) => ({ id: charge.type, type: charge.type, description: charge.type, amount: charge.amount, frequency: charge.frequency ?? "monthly", escalationPct: charge.escalationPct ?? 0 })), ...overrides });
}

async function billAndPost(ar: ArService, period: string) {
  const { created } = await ar.createDrafts(W, period);
  const posted = [];
  for (const invoice of created) {
    await ar.approveInvoice(invoice.id);
    posted.push(await ar.postInvoice(invoice.id));
  }
  return posted;
}

function arBalance(book: ArBook, to?: string): number {
  return trialBalance(book.journals, { to }).rows.find((row) => row.account === "1200")?.balance ?? 0;
}

test("tenant register, lease mapping, billing with escalation, proration, quarterly charges, and duplicate prevention", async () => {
  const { ar } = setup();
  const abc = await addTenant(ar, "MER-110", { name: "ABC Technologies" });
  await assert.rejects(addTenant(ar, "mer-110"), /already used/, "tenant codes are unique, case-insensitively");
  await assert.rejects(ar.saveTenant({ ...abc, id: undefined, code: "X", entityId: "" }), /legal entity/);
  const lease = await addLease(ar, abc.id, "L-110", "2025-02-01", [{ type: "base_rent", amount: 8_500, escalationPct: 3 }, { type: "cam", amount: 650 }]);
  assert.equal(lease.tenantId, abc.id);
  await assert.rejects(addLease(ar, abc.id, "L-BAD", "2026-05-01", [{ type: "base_rent", amount: 1 }], { end: "2026-01-01" }), /before lease start/);

  const fitness = await addTenant(ar, "BLU-G02");
  await addLease(ar, fitness.id, "L-G02", "2026-09-15", [{ type: "base_rent", amount: 27_000, frequency: "quarterly" }, { type: "cam", amount: 600 }]);

  const august = await ar.billingPreview(W, "2026-08");
  assert.equal(august.proposals.length, 1, "the September lease is not billed in August");
  const abcAug = august.proposals[0];
  assert.deepEqual(abcAug.lines.map((line) => line.amount), [8_755, 650], "base rent escalated 3% after one anniversary");
  assert.match(abcAug.lines[0].note ?? "", /Escalated 3% × 1 year/);
  assert.equal(abcAug.dueDate, "2026-08-06");

  const september = await ar.billingPreview(W, "2026-09");
  const g02 = september.proposals.find((proposal) => proposal.tenantId === fitness.id)!;
  assert.equal(g02.lines[0].amount, 22_846.15, "quarterly rent prorated 77 of 91 days");
  assert.equal(g02.lines[0].periodEnd, "2026-11-30");
  assert.equal(g02.lines[1].amount, 320, "monthly CAM prorated 16 of 30 days");
  assert.equal(g02.invoiceDate, "2026-09-15");
  const october = await ar.billingPreview(W, "2026-10");
  assert.deepEqual(october.proposals.find((proposal) => proposal.tenantId === fitness.id)!.lines.map((line) => line.chargeType), ["cam"], "quarterly rent is not billed again until December");

  const first = await ar.createDrafts(W, "2026-08");
  assert.equal(first.created.length, 1);
  const again = await ar.createDrafts(W, "2026-08");
  assert.equal(again.created.length, 0, "the same tenant, lease, and billing period cannot be billed twice");
  assert.match(again.skipped[0].reason, /Already billed on INV-00001/);

  const draft = first.created[0];
  await assert.rejects(ar.postInvoice(draft.id), /must be approved/);
  await ar.approveInvoice(draft.id);
  const posted = await ar.postInvoice(draft.id);
  assert.equal(posted.status, "Posted");
  const book = await ar.book(W);
  const journal = book.journals.find((item) => item.id === posted.journalId)!;
  assert.deepEqual(journal.lines.map((line) => [line.account, line.debit, line.credit]), [["1200", 9_405, 0], ["4000", 0, 8_755], ["4010", 0, 650]], "Dr tenant receivables, Cr rental revenue and CAM recoveries");
  await assert.rejects(ar.deleteDraft(posted.id), /never deleted/);
});

test("receipts: the 10,000 / 7,000 example, multi-invoice allocation, unallocated cash, and reversal with approval", async () => {
  const { ar } = setup();
  const tenant = await addTenant(ar, "T1");
  const other = await addTenant(ar, "T2");
  await addLease(ar, tenant.id, "L1", "2026-01-01", [{ type: "base_rent", amount: 10_000 }]);
  await addLease(ar, other.id, "L2", "2026-01-01", [{ type: "base_rent", amount: 2_000 }]);
  await billAndPost(ar, "2026-08");
  await billAndPost(ar, "2026-09");
  let book = await ar.book(W);
  const aug = book.invoices.find((invoice) => invoice.tenantId === tenant.id && invoice.billingPeriod === "2026-08")!;
  const sep = book.invoices.find((invoice) => invoice.tenantId === tenant.id && invoice.billingPeriod === "2026-09")!;
  const otherAug = book.invoices.find((invoice) => invoice.tenantId === other.id && invoice.billingPeriod === "2026-08")!;
  const bank = book.settings.bankAccounts[0].name;
  const receipt = (amount: number, allocations: { invoiceId: string; amount: number }[], date = "2026-08-10") => ar.recordPayment(W, { tenantId: tenant.id, receivedDate: date, amount, currency: "USD", bankAccount: bank, method: "ACH", reference: "test", allocations });

  const first = await receipt(7_000, [{ invoiceId: aug.id, amount: 7_000 }]);
  book = await ar.book(W);
  assert.equal(balances(book).get(aug.id)!.outstanding, 3_000, "the $3,000 balance is preserved");
  assert.deepEqual(book.journals.find((journal) => journal.id === first.journalIds[0])!.lines.map((line) => [line.account, line.debit, line.credit]), [["1010", 7_000, 0], ["1200", 0, 7_000]], "Dr bank, Cr tenant receivables");

  await assert.rejects(receipt(5_000, [{ invoiceId: aug.id, amount: 5_000 }]), /exceeds the 3000 outstanding/);
  await assert.rejects(receipt(100, [{ invoiceId: otherAug.id, amount: 100 }]), /another tenant/);
  await assert.rejects(receipt(100, [{ invoiceId: aug.id, amount: 60 }, { invoiceId: sep.id, amount: 60 }]), /exceed the amount available/);

  const split = await receipt(8_000, [{ invoiceId: aug.id, amount: 3_000 }, { invoiceId: sep.id, amount: 5_000 }], "2026-09-05");
  const loose = await receipt(1_000, [], "2026-09-06");
  book = await ar.book(W);
  assert.equal(balances(book).get(aug.id)!.outstanding, 0);
  assert.equal(balances(book).get(sep.id)!.outstanding, 5_000);
  assert.equal(kpis(book, "2026-09-30").unallocated, 1_000, "unallocated receipts are reported, not applied");
  assert.deepEqual(book.journals.find((journal) => journal.id === loose.journalIds[0])!.lines.map((line) => line.account), ["1010", "2150"], "unallocated cash sits in unapplied receipts");

  await ar.allocate(loose.id, [{ invoiceId: sep.id, amount: 1_000 }], "2026-09-07");
  book = await ar.book(W);
  assert.equal(balances(book).get(sep.id)!.outstanding, 4_000);
  assert.equal(kpis(book, "2026-09-30").unallocated, 0);

  await ar.requestPaymentReversal(split.id, "Cheque returned unpaid");
  book = await ar.book(W);
  assert.equal(balances(book).get(aug.id)!.outstanding, 0, "a requested reversal changes nothing until approved");
  await ar.approvePaymentReversal(split.id, "2026-09-20");
  book = await ar.book(W);
  assert.equal(balances(book).get(aug.id)!.outstanding, 3_000);
  assert.equal(balances(book).get(sep.id)!.outstanding, 9_000);
  const original = book.journals.find((journal) => journal.id === split.journalIds[0])!;
  assert.ok(original.reversedBy, "the original journal is kept and linked to its reversal");
  assert.equal(original.lines[0].debit, 8_000, "posted journal lines are never edited");
  assert.equal(arBalance(book), round(ageing(book, "2026-09-30").reduce((sum, row) => sum + row.outstanding, 0)), "subledger GL equals the ageing");
  const statement = statementOfAccount(book, tenant.id);
  assert.equal(statement[statement.length - 1].balance, 12_000 - 0, "statement: 20,000 billed − 7,000 − 1,000 received (reversed receipt excluded)");
});

function round(value: number) {
  return Math.round(value * 100) / 100;
}

test("credit notes, write-offs, security deposits, and late payment charges", async () => {
  const { ar } = setup();
  const tenant = await addTenant(ar, "T1");
  await addLease(ar, tenant.id, "L1", "2026-01-01", [{ type: "base_rent", amount: 5_000 }, { type: "cam", amount: 500 }]);
  const [aug] = await billAndPost(ar, "2026-08");
  const [sep] = await billAndPost(ar, "2026-09");

  await assert.rejects(ar.createCreditNote(W, { invoiceId: aug.id, amount: 6_000, reason: "x", type: "credit", date: "2026-08-20" }), /exceed the 5500 outstanding/);
  const credit = await ar.createCreditNote(W, { invoiceId: aug.id, amount: 500, reason: "CAM waived for August", type: "credit", chargeType: "cam", date: "2026-08-20" });
  let book = await ar.book(W);
  assert.equal(balances(book).get(aug.id)!.outstanding, 5_500, "draft credit notes do not reduce the balance");
  await ar.approveCreditNote(credit.id);
  book = await ar.book(W);
  assert.equal(balances(book).get(aug.id)!.outstanding, 5_000);
  const creditJournal = book.journals.find((journal) => journal.sourceId === credit.id)!;
  assert.deepEqual(creditJournal.lines.map((line) => [line.account, line.debit, line.credit]), [["4010", 500, 0], ["1200", 0, 500]], "Dr CAM recoveries, Cr tenant receivables");

  const writeOff = await ar.createCreditNote(W, { invoiceId: aug.id, amount: 1_000, reason: "Uncollectable portion", type: "write_off", date: "2026-10-01" });
  await ar.approveCreditNote(writeOff.id);
  book = await ar.book(W);
  assert.equal(book.journals.find((journal) => journal.sourceId === writeOff.id)!.lines[0].account, "6900", "write-offs go to bad debt expense");

  const deposit = await ar.recordDeposit(W, { tenantId: tenant.id, amount: 4_000, currency: "USD", receivedDate: "2026-08-01", bankAccount: book.settings.bankAccounts[0].name });
  book = await ar.book(W);
  const depositJournal = book.journals.find((journal) => journal.sourceId === deposit.id)!;
  assert.deepEqual(depositJournal.lines.map((line) => [line.account, line.debit, line.credit]), [["1010", 4_000, 0], ["2200", 0, 4_000]], "deposits are a liability, not revenue");
  assert.equal(subledgerSummary(book, "2026-08-01", "2026-08-31").netRevenue, 5_000, "August revenue is 5,500 billed less the 500 credit; the deposit is excluded");
  assert.equal(subledgerSummary(book, "2026-08-01", "2026-08-31").deposits, 4_000);

  await ar.openDispute(W, { invoiceId: sep.id, amount: 500, reason: "CAM disputed", owner: "PM" });
  const lateFees = await ar.lateFeePreview(W, "2026-10-15");
  assert.equal(lateFees.proposals.length, 1, "only the undisputed overdue invoice gets a late charge");
  assert.equal(lateFees.proposals[0].total, 200, "5% of the 4,000 outstanding, above the 50 minimum");
  assert.match(lateFees.skipped[0].reason, /under dispute/);
  await ar.createLateFeeDrafts(W, "2026-10-15");
  assert.equal((await ar.lateFeePreview(W, "2026-10-20")).proposals.length, 0, "one late charge per invoice");

  await ar.settleDeposit(deposit.id, { kind: "apply", date: "2026-10-20", invoiceId: aug.id });
  book = await ar.book(W);
  assert.equal(balances(book).get(aug.id)!.outstanding, 0, "deposit applied against the remaining 4,000");
  assert.equal(subledgerSummary(book, "2026-10-01", "2026-10-31").deposits, 0);
});

test("multi-entity and multi-currency: rates, FX differences on settlement, and missing rates", async () => {
  const { ar } = setup();
  const settings = await ar.settings(W);
  await ar.saveSettings({ ...settings, entityCurrencies: { EUCO: "EUR" }, bankAccounts: [...settings.bankAccounts, { name: "EUR bank", code: "1015", currency: "EUR" }], fxRates: [{ currency: "EUR", period: "2026-09", rate: 1.1 }, { currency: "EUR", period: "2026-10", rate: 1.08 }] }, "test");
  const rhein = await addTenant(ar, "RH", { entityId: "CCL", propertyId: "P002", currency: "EUR" });
  await addLease(ar, rhein.id, "L-RH", "2026-01-01", [{ type: "base_rent", amount: 15_000 }], { entityId: "CCL", propertyId: "P002", currency: "EUR" });
  const [sep] = await billAndPost(ar, "2026-09");
  assert.equal(sep.fx!.rateToFunctional, 1.1);
  let book = await ar.book(W);
  assert.equal(book.journals.find((journal) => journal.id === sep.journalId)!.lines[0].debit, 16_500, "EUR 15,000 booked at 1.10 in USD functional currency");
  await assert.rejects(billAndPost(ar, "2026-08"), /No exchange rate for EUR/, "rates are never invented");

  const payment = await ar.recordPayment(W, { tenantId: rhein.id, receivedDate: "2026-10-04", amount: 15_000, currency: "EUR", bankAccount: "EUR bank", method: "SEPA", reference: "", allocations: [{ invoiceId: sep.id, amount: 15_000 }] });
  book = await ar.book(W);
  const lines = book.journals.find((journal) => journal.id === payment.journalIds[0])!.lines.map((line) => [line.account, line.debit, line.credit]);
  assert.deepEqual(lines, [["1015", 16_200, 0], ["1200", 0, 16_500], ["7900", 300, 0]], "settled at 1.08: 300 FX loss");
  await assert.rejects(ar.recordPayment(W, { tenantId: rhein.id, receivedDate: "2026-10-04", amount: 10, currency: "USD", bankAccount: "EUR bank", method: "", reference: "", allocations: [{ invoiceId: sep.id, amount: 10 }] }), /in EUR/);

  const euro = await addTenant(ar, "EU1", { entityId: "EUCO", propertyId: "P900", currency: "USD" });
  await addLease(ar, euro.id, "L-EU1", "2026-01-01", [{ type: "base_rent", amount: 1_100 }], { entityId: "EUCO", propertyId: "P900", currency: "USD" });
  const [usdInEuro] = (await billAndPost(ar, "2026-10")).filter((invoice) => invoice.tenantId === euro.id);
  assert.equal(usdInEuro.fx!.functionalCurrency, "EUR");
  assert.equal(Math.round(usdInEuro.fx!.rateToFunctional * 10_000) / 10_000, 0.9259, "USD invoice in a EUR entity: 1 / 1.08");
  book = await ar.book(W);
  const ccl = trialBalance(book.journals, { entityId: "CCL", currency: "functional" });
  assert.equal(ccl.debit, ccl.credit, "each entity's subledger balances");
  assert.deepEqual(ccl.currencies, ["USD"]);
  const euco = trialBalance(book.journals, { entityId: "EUCO", currency: "functional" });
  assert.deepEqual(euco.currencies, ["EUR"]);
  assert.equal(euco.rows.find((row) => row.account === "1200")!.balance, 1_018.52);
  const group = trialBalance(book.journals);
  assert.equal(group.debit, group.credit);
  assert.deepEqual(group.currencies, ["USD"], "consolidated in group currency");
  const october = book.invoices.find((invoice) => invoice.tenantId === rhein.id && invoice.billingPeriod === "2026-10")!;
  const row = ageing(book, "2026-10-31").find((item) => item.invoice.id === october.id)!;
  assert.equal(row.outstanding, 15_000);
  assert.equal(row.outstandingGroup, 16_200, "ageing translates open EUR balances at the closing rate");
});

test("period locks block posting, receipts, and reversals in closed periods", async () => {
  const { integration, ar } = setup();
  const tenant = await addTenant(ar, "T1");
  await addLease(ar, tenant.id, "L1", "2026-01-01", [{ type: "base_rent", amount: 1_000 }]);
  const [aug] = await billAndPost(ar, "2026-08");
  const settings = await integration.settings(W);
  await integration.saveSettings({ ...settings, lockedPeriods: ["2026-08", "2026-09"] }, "lock");
  const { created } = await ar.createDrafts(W, "2026-09");
  await ar.approveInvoice(created[0].id);
  await assert.rejects(ar.postInvoice(created[0].id), /period 2026-09 is locked/);
  await ar.postInvoice(created[0].id, "2026-10-01");
  await assert.rejects(ar.recordPayment(W, { tenantId: tenant.id, receivedDate: "2026-08-15", amount: 100, currency: "USD", bankAccount: "Operating bank", method: "", reference: "", allocations: [] }), /locked/);
  await ar.requestInvoiceReversal(created[0].id, "Billed in error");
  await assert.rejects(ar.approveInvoiceReversal(created[0].id, "2026-09-30"), /locked/);
  await ar.approveInvoiceReversal(created[0].id, "2026-10-02");
  const book = await ar.book(W);
  assert.equal(book.invoices.find((invoice) => invoice.id === created[0].id)!.status, "Reversed");
  assert.equal(balances(book).get(aug.id)!.outstanding, 1_000);
  assert.equal(arBalance(book), 1_000, "the reversed invoice nets to zero in the ledger");
});

function prepare(category: CategoryId, fileName: string, bytes: ArrayBuffer, connectorId: string) {
  const workbook = parseWorkbook(fileName, bytes);
  const sheet = [...workbook.sheets].sort((a, b) => b.rows.length - a.rows.length)[0];
  const headerRow = detectHeaderRow(sheet.rows, categoryById(category));
  const adapted = applyAdapter(connectorId, category, headersFor(sheet.rows, headerRow), dataRows(sheet.rows, headerRow));
  const profiles = profileColumns(adapted.headers, adapted.rows);
  const { mapping } = autoMapping(category, adapted.headers, profiles, adapterAliases(connectorId, category));
  const named: Record<string, string> = {};
  for (const [key, column] of Object.entries(mapping)) if (column !== null) named[key] = adapted.headers[column];
  const dateOrders: Record<string, DateOrder> = {};
  for (const profile of profiles) if (profile.dateOrder === "ambiguous") dateOrders[profile.header] = "MDY";
  return { sheet, headerRow, mapping: named, dateOrders };
}

async function importAndPublish(integration: IntegrationService, category: CategoryId, fileName: string, bytes: ArrayBuffer, connectionId: string) {
  const connection = (await integration.connection(connectionId))!;
  const prepared = prepare(category, fileName, bytes, connection.connectorId);
  const job = await integration.commit({ tenantId: W, connectionId, syncMode: "incremental", category, fileName, bytes, fileSize: bytes.byteLength, sheetName: prepared.sheet.name, headerRow: prepared.headerRow, mapping: prepared.mapping, dateOrders: prepared.dateOrders });
  assert.ok(job.successfulRecords > 0, `${category}: ${job.failedRecords} failed`);
  const outcome = await integration.publish(job.id, false);
  if (outcome.status === "confirm") await integration.publish(job.id, true);
  return job;
}

test("Yardi and Excel imports flow into AR with lineage, duplicate prevention, and no cross-source assumptions", async () => {
  const { integration, ar } = setup();
  await integration.connections(W);
  const yardi = IntegrationService.defaultConnectionId(W, "yardi_voyager_8");
  const excel = IntegrationService.defaultConnectionId(W, "excel");
  await importAndPublish(integration, "property_master", "pm.xlsx", fx.propertyMaster100(), excel);
  await importAndPublish(integration, "tenant_master", "yardi_tenants.csv", fx.yardiTenants(), yardi);
  await importAndPublish(integration, "lease_register", "yardi_leases.csv", fx.yardiLeases(), yardi);
  await importAndPublish(integration, "rent_charges", "yardi_rent_charges.csv", fx.yardiRentCharges(), yardi);
  await importAndPublish(integration, "accounts_receivable", "yardi_ar.csv", fx.accountsReceivable(), yardi);
  await importAndPublish(integration, "ar_payments", "yardi_receipts.csv", fx.yardiReceipts(), yardi);
  await importAndPublish(integration, "credit_notes", "yardi_credit_notes.csv", fx.yardiCreditNotes(), yardi);
  await importAndPublish(integration, "ar_ageing", "yardi_ageing.csv", fx.yardiAgeing(), yardi);

  const preview = await ar.importPreview(W);
  assert.deepEqual(preview.plan.tenants.add.map((tenant) => tenant.code).sort(), ["T-130", "T-140", "T-210"]);
  assert.equal(preview.plan.tenants.add.find((tenant) => tenant.code === "T-140")!.paymentTermsDays, 10);
  assert.deepEqual(preview.plan.leases.add.map((lease) => lease.code).sort(), ["L-130", "L-140"]);
  assert.ok(preview.plan.skipped.some((item) => item.reference === "HQ-OFFICE" && /IFRS 16/.test(item.reason)), "lessee leases stay with IFRS 16");
  const l140 = preview.plan.leases.add.find((lease) => lease.code === "L-140")!;
  assert.deepEqual(l140.charges.map((charge) => [charge.type, charge.amount]), [["base_rent", 5_200], ["cam", 410], ["parking", 75]], "rent charges replace the lease register's single base rent");
  assert.equal(preview.plan.leases.add.find((lease) => lease.code === "L-130")!.charges[0].escalationPct, 3, "escalation parsed from “3% annually”");
  assert.equal(preview.plan.invoices.length, 2);
  assert.equal(preview.plan.invoices.find((invoice) => invoice.number === "AR-9002")!.priorCollected, 1_200);
  assert.equal(preview.plan.creditNotes.length, 1);
  assert.equal(preview.plan.tenants.add[0].source.connectionId, yardi, "lineage keeps the source connection");

  const result = await ar.bringIn(W, "2026-11-01");
  assert.deepEqual([result.tenants, result.leases, result.invoices, result.creditNotes], [3, 2, 2, 1]);
  let book = await ar.book(W);
  const opening = book.journals.filter((journal) => journal.sourceType === "opening");
  assert.equal(opening.length, 2);
  assert.deepEqual(opening[0].lines.map((line) => line.account), ["1200", "3990"], "imported balances post against opening clearing, not revenue");
  assert.equal(subledgerSummary(book, "2026-11-01", "2026-11-30").netRevenue, 0, "no revenue is recognised twice");
  assert.equal(book.creditNotes[0].status, "Draft", "imported credit notes wait for approval");

  const second = await ar.importPreview(W);
  assert.equal(second.plan.invoices.length, 0, "re-importing does not duplicate open invoices");
  assert.equal(second.plan.tenants.add.length, 0);

  const lines = preview.bankLines;
  assert.equal(lines.length, 2);
  const r5001 = lines.find((line) => line.reference === "ACH 88231")!;
  const suggestion = suggestMatch(book, r5001, "2026-11-07");
  assert.equal(suggestion.confidence, "high");
  const ar9001 = book.invoices.find((invoice) => invoice.number === "AR-9001")!;
  assert.deepEqual(suggestion.allocations, [{ invoiceId: ar9001.id, amount: 2_550 }]);
  await ar.matchBankLine(W, r5001, { tenantId: suggestion.tenantId!, allocations: suggestion.allocations, bankAccount: book.settings.bankAccounts[0].name });
  await assert.rejects(ar.matchBankLine(W, r5001, { tenantId: suggestion.tenantId!, allocations: [], bankAccount: book.settings.bankAccounts[0].name }), /already matched/);
  assert.equal((await ar.importPreview(W)).bankLines.length, 1, "matched lines leave the queue");
  book = await ar.book(W);
  assert.equal(balances(book).get(ar9001.id)!.outstanding, 2_000);

  const recon = (await ar.importPreview(W)).ageing;
  assert.equal(recon.asOf, "2026-10-31");
  const t130 = recon.rows.find((row) => row.tenantCode === "T-130")!;
  assert.equal(t130.source.total, 4_550);
  assert.equal(t130.estatecfo.total, 2_000, "EstateCFO applied the 3 October receipt");
  assert.equal(t130.difference, 2_550, "the source ageing does not reflect that receipt: reported as a reconciliation difference");

  const billing = await ar.billingPreview(W, "2026-11");
  assert.deepEqual(billing.proposals.find((proposal) => proposal.leaseId === l140.id)!.lines.map((line) => line.amount), [5_200, 410, 75], "imported leases bill through the same engine");

  await importAndPublish(integration, "tenant_master", "excel_tenants.csv", fx.yardiTenants(), excel);
  const clash = await ar.importPreview(W);
  assert.ok(clash.plan.skipped.some((item) => item.reference === "T-130" && /not assumed to be the same tenant/.test(item.reason)), "the same code from another source is not merged");
  assert.equal(clash.plan.tenants.update.length, 0);
});

test("AR ledger feeds ageing drill-down, KPIs, statements, cash, and collections intelligence", async () => {
  const { ar } = setup();
  await loadSample(ar, W);
  await assert.rejects(loadSample(ar, W), /already has records/);
  const book = await ar.book(W);
  const asOf = "2026-11-07";

  const rows = ageing(book, asOf);
  const buckets = bucketTotals(rows);
  const total = round(rows.reduce((sum, row) => sum + row.outstandingGroup, 0));
  assert.equal(round(Object.values(buckets).reduce((sum, value) => sum + value, 0)), total);
  assert.equal(arBalance(book, asOf), total, "AR control account equals the ageing in group currency");
  const globalAug = rows.find((row) => row.tenantName === "Global Consulting LLC" && row.invoice.billingPeriod === "2026-08")!;
  assert.equal(globalAug.bucket, "90+");
  assert.equal(globalAug.outstanding, round(6_577.58 + 480 + 150 - 3_000));
  const dentalOct = rows.find((row) => row.tenantName === "Lone Star Dental Group" && row.invoice.billingPeriod === "2026-10")!;
  assert.equal(dentalOct.bucket, "31–60");
  assert.equal(dentalOct.outstanding, 4_700, "4,770 billed less the 70 credit note");

  const entities = drill(rows, "entity");
  assert.deepEqual(entities.map((node) => node.key).sort(), ["BRL", "CCL", "MHLP"]);
  const mhlpProperties = drill(rows.filter((row) => row.invoice.entityId === "MHLP"), "property");
  assert.equal(mhlpProperties[0].label, "1790 Meridian Blvd");
  const tenantsAtMer = drill(rows.filter((row) => row.invoice.propertyId === "MER-1790"), "tenant");
  assert.equal(tenantsAtMer[0].label, "Global Consulting LLC");

  const k = kpis(book, asOf);
  const abcNov = book.invoices.find((invoice) => invoice.billingPeriod === "2026-11" && invoice.lines[0].amount === 8_755)!;
  const deltaNov = book.invoices.find((invoice) => invoice.billingPeriod === "2026-11" && invoice.lines[0].amount === 12_000)!;
  const rheinOct = book.invoices.find((invoice) => invoice.billingPeriod === "2026-10" && invoice.currency === "EUR")!;
  assert.equal(k.collectedThisMonth, round(abcNov.total + 4_000 + 1_500 + deltaNov.total + rheinOct.total * 1.07));
  assert.equal(k.unallocated, 1_500);
  assert.equal(k.disputed, 900);
  assert.equal(k.depositsHeld, 41_000);
  assert.equal(k.total, total);
  assert.ok(k.collectionRate! > 0 && k.collectionRate! < 100);
  assert.equal(k.unbilled, 0, "every active lease is billed for November");
  assert.equal(tenantBalances(book, asOf).get(book.tenants.find((tenant) => tenant.code === "MER-130")!.id)!.unapplied, 1_500);

  const november = subledgerSummary(book, "2026-11-01", "2026-11-30");
  const novInvoices = book.invoices.filter((invoice) => invoice.billingPeriod === "2026-11" && invoice.status === "Posted");
  assert.equal(november.grossBilled, round(novInvoices.reduce((sum, invoice) => sum + invoice.total * invoice.fx!.rateToGroup, 0)));
  assert.equal(november.receivables, arBalance(book, "2026-11-30"));
  assert.equal(november.deposits, 41_000);
  assert.equal(november.unapplied, 1_500);
  assert.ok(november.balanced);
  assert.equal(november.cashCollected, k.collectedThisMonth);
  const banks = collectionsByBank(book, "2026-11-01", "2026-11-30");
  assert.equal(round(banks.reduce((sum, row) => sum + row.receipts, 0)), k.collectedThisMonth);

  const intelligence = collectionsIntelligence(book, asOf);
  assert.ok(intelligence.insights.some((item) => item.kind === "broken_promise" && /Global Consulting/.test(item.title)), "missed promise detected from follow-ups and receipts");
  assert.ok(intelligence.insights.some((item) => item.kind === "disputed" && /Delta Retail/.test(item.title)));
  assert.equal(intelligence.priorities[0].tenantName, "Global Consulting LLC");
  assert.ok(intelligence.insights.every((item) => item.amount === undefined || Number.isFinite(item.amount)));
  const expectedTotal = round(intelligence.expected.buckets.reduce((sum, bucket) => sum + bucket.amount, 0) + intelligence.expected.atRisk);
  assert.equal(expectedTotal, total, "expected collections plus at-risk account for every open balance");

  await ar.clearSample(W);
  assert.ok(await ar.isEmpty(W));
});

test("AR records are isolated per workspace", async () => {
  const { integration, ar } = setup();
  await addTenant(ar, "T1");
  const other = await integration.addTenant("Second Group");
  assert.equal((await ar.book(other.id)).tenants.length, 0);
  assert.equal((await ar.book(W)).tenants.length, 1);
});
