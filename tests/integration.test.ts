import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryById } from "../src/integrations/engine/categories.ts";
import { checkMapping, templateMatchScore } from "../src/integrations/engine/mapping.ts";
import { ask } from "../src/integrations/engine/analyst.ts";
import { FileFormatError, dataRows, detectHeaderRow, headersFor, parseDate, parseNumber, parsePeriod, parseWorkbook, profileColumns } from "../src/integrations/engine/parse.ts";
import { incomeStatement as incomeSummary, portfolioKpis, propertyPnl } from "../src/integrations/engine/metrics.ts";
import { ifrs16Payload, ifrs16InputFields } from "../src/integrations/engine/ifrs16.ts";
import { IntegrationService, autoMapping, reconDisplayStatus } from "../src/integrations/service/service.ts";
import { MemoryAdapter } from "../src/integrations/service/storage.ts";
import { DEFAULT_TENANT } from "../src/integrations/service/master.ts";
import type { CategoryId, DateOrder, SyncMode } from "../src/integrations/engine/types.ts";
import { adapterAliases, applyAdapter, connectionState, connectors } from "../src/integrations/engine/connectors.ts";
import { freshness } from "../src/integrations/engine/sync.ts";
import * as fx from "./fixtures.ts";

const T = DEFAULT_TENANT;

function prepare(category: CategoryId, fileName: string, bytes: ArrayBuffer, connectorId: string = "excel") {
  const workbook = parseWorkbook(fileName, bytes);
  const sheet = [...workbook.sheets].sort((a, b) => b.rows.length - a.rows.length)[0];
  const headerRow = detectHeaderRow(sheet.rows, categoryById(category));
  const adapted = applyAdapter(connectorId, category, headersFor(sheet.rows, headerRow), dataRows(sheet.rows, headerRow));
  const headers = adapted.headers;
  const profiles = profileColumns(headers, adapted.rows);
  const { mapping, check } = autoMapping(category, headers, profiles, adapterAliases(connectorId, category));
  const named: Record<string, string> = {};
  for (const [key, column] of Object.entries(mapping)) if (column !== null) named[key] = headers[column];
  const dateOrders: Record<string, DateOrder> = {};
  for (const profile of profiles) if (profile.dateOrder === "ambiguous") dateOrders[profile.header] = "MDY";
  return { workbook, sheet, headerRow, headers, profiles, mapping: named, check, dateOrders, notes: adapted.notes };
}

function connectionFor(via: string): string {
  if (via === "yardi") return IntegrationService.defaultConnectionId(T, "yardi_voyager_8");
  if (via === "CSV" || via === "Excel" || via === "excel") return IntegrationService.defaultConnectionId(T, "excel");
  return via;
}

async function load(service: IntegrationService, category: CategoryId, fileName: string, bytes: ArrayBuffer, via = "yardi", syncMode: SyncMode = "incremental") {
  await service.connections(T);
  const connectionId = connectionFor(via);
  const connection = await service.connection(connectionId);
  const prepared = prepare(category, fileName, bytes, connection?.connectorId);
  const job = await service.commit({ tenantId: T, connectionId, syncMode, category, fileName, bytes, fileSize: bytes.byteLength, sheetName: prepared.sheet.name, headerRow: prepared.headerRow, mapping: prepared.mapping, dateOrders: prepared.dateOrders });
  return { job, prepared };
}

async function publish(service: IntegrationService, jobId: string) {
  const first = await service.publish(jobId, false);
  if (first.status === "confirm") return service.publish(jobId, true);
  return first;
}

test("parsers handle Yardi-style values without altering them", () => {
  assert.equal(parseNumber("(1,250.50)"), -1250.5);
  assert.equal(parseNumber("$4,792,100"), 4792100);
  assert.equal(parseNumber("6.5%"), 6.5);
  assert.equal(parseNumber("1.234,56"), 1234.56);
  assert.equal(parseNumber("abc"), null);
  assert.equal(parseDate("09/30/2026").iso, "2026-09-30");
  assert.equal(parseDate("30/09/2026").iso, "2026-09-30");
  assert.equal(parseDate("03/04/2026").ambiguous, true);
  assert.equal(parseDate("03/04/2026", "DMY").iso, "2026-04-03");
  assert.equal(parseDate("Sep 29, 2026").iso, "2026-09-29");
  assert.equal(parseDate("02/30/2026").iso, null);
  assert.equal(parsePeriod("Sep 2026"), "2026-09");
  assert.equal(parsePeriod("FY2026"), "2026");
  assert.equal(parsePeriod("2026 Q3"), "2026-Q3");
});

test("acceptance workflow 1–15", async () => {
  const service = new IntegrationService(new MemoryAdapter());

  // 1. Upload a Yardi-style property master Excel file (title rows, two sheets).
  const pm = prepare("property_master", "property_master_100.xlsx", fx.propertyMaster100());
  assert.equal(pm.workbook.sheets.length, 2);
  assert.equal(pm.sheet.name, "Properties");
  assert.equal(pm.headerRow, 4, "header row detected under the report title lines");

  // 2. Map property identifiers.
  assert.equal(pm.mapping.property_id, "Property Code");
  assert.equal(pm.mapping.property_name, "Property Name");
  assert.equal(pm.mapping.market_value, "Market Value");
  assert.equal(pm.check.missingRequired.length, 0);

  // Save and reuse a customer mapping profile.
  const template = await service.saveTemplate({ tenantId: T, name: "Meridian property directory", profile: "Meridian Ventures", category: "property_master", headers: pm.headers, mapping: pm.mapping, dateOrder: "auto", aliases: { property_id: ["Bldg Ref"] } });
  assert.equal(templateMatchScore(template, pm.headers), 1);
  const aliases = await service.profileAliases(T, "property_master", "Meridian Ventures");
  assert.ok(aliases.property_id.includes("Bldg Ref"));
  const aliasMapped = autoMapping("property_master", ["Bldg Ref", "Property Name"], [], aliases);
  assert.equal(aliasMapped.mapping.property_id, 0, "customer alias maps a non-standard header");

  // 3. Import 100 properties.
  const { job: pmJob } = await load(service, "property_master", "property_master_100.xlsx", fx.propertyMaster100());
  assert.equal(pmJob.totalRecords, 100);
  assert.equal(pmJob.successfulRecords, 100);
  assert.equal(pmJob.warningRecords, 2, "two codes already exist in EstateCFO and are flagged for overwrite confirmation");
  const firstPublish = await service.publish(pmJob.id, false);
  assert.equal(firstPublish.status, "confirm", "overwriting existing EstateCFO properties needs explicit confirmation");
  assert.equal((await service.publish(pmJob.id, true)).status, "published");
  const master = await service.master(T);
  assert.equal(master.data.properties.length, 100);

  // Same name, different code is never merged automatically.
  const dupeCsv = new TextEncoder().encode("Property Code,Property Name,Market Value\r\nMERIDIAN-1790,\"1790 Meridian Blvd, Suite-130, Carrollton TX\",850000").buffer as ArrayBuffer;
  const { job: dupeJob } = await load(service, "property_master", "possible_duplicate.csv", dupeCsv, "CSV");
  const dupeRecords = await service.records(dupeJob.id);
  assert.equal(dupeRecords[0].status, "error");
  assert.ok(dupeRecords[0].issues.some((issue) => issue.rule === "property_possible_duplicate"));
  await service.link(T, "property", "MERIDIAN-1790", "MER-1790", "Same building, old code");
  const retriedDupe = await service.retryFailed(dupeJob.id);
  assert.equal(retriedDupe.recovered, 1);

  // Chart of accounts and entity context.
  const { job: coaJob } = await load(service, "chart_of_accounts", "chart_of_accounts.csv", fx.chartOfAccounts(), "CSV");
  assert.equal(coaJob.successfulRecords, fx.COA.length);
  await publish(service, coaJob.id);

  // 4. Upload a GL transaction file containing 1,000 records.
  const gl = prepare("gl_transactions", "gl_1000.xlsx", fx.glWorkbook());
  assert.equal(gl.headerRow, 2);
  assert.equal(gl.mapping.transaction_date, "Post Date");
  assert.equal(gl.mapping.debit, "Debit");
  const { job: glJob } = await load(service, "gl_transactions", "gl_1000.xlsx", fx.glWorkbook());
  assert.equal(glJob.totalRecords, 1000);

  // 5. Identify duplicate transactions.
  assert.equal(glJob.duplicateRecords, 10);
  assert.equal(glJob.successfulRecords, 990);

  // 6. Validate debit and credit balances.
  const dc = glJob.fileChecks.find((check) => check.id === "gl_debit_credit");
  assert.ok(dc?.passed, dc?.message);
  const { lines } = fx.glLines();
  const sourceDebits = Math.round(lines.slice(0, 990).reduce((total, line) => total + line.debit, 0) * 100) / 100;
  assert.equal(dc?.details.find((item) => item.label === "Total debits")?.value, sourceDebits, "imported debits equal the source file");

  // 7. Identify unmapped GL accounts.
  const glRecords = await service.records(glJob.id);
  const unmapped = new Set(glRecords.flatMap((record) => record.issues.filter((issue) => issue.rule === "account_unmapped").map((issue) => issue.value)));
  assert.deepEqual([...unmapped].sort(), ["4999", "6999"]);
  assert.equal((await publish(service, glJob.id)).status, "published");

  // 8. Import a Trial Balance.
  const { job: tbJob } = await load(service, "trial_balance", "trial_balance_sep2026.csv", fx.trialBalance(), "CSV");
  const tbCheck = tbJob.fileChecks.find((check) => check.id === "tb_balance");
  assert.ok(tbCheck?.passed, tbCheck?.message);
  assert.ok(tbCheck?.details.some((item) => item.label === "Opening debit balance"));

  // 9. Reconcile Trial Balance.
  const run = await service.reconcile(T, "tb_vs_gl", tbJob.id, {});
  assert.equal(run.result.status, "Reconciled", JSON.stringify(run.result.lines.filter((line) => line.status !== "matched").slice(0, 3)));
  assert.ok(run.result.summary.matched > 10);
  const { job: dupeTb } = await load(service, "trial_balance", "trial_balance_again.csv", fx.trialBalance(), "CSV");
  assert.equal(dupeTb.duplicateRecords, dupeTb.totalRecords, "re-importing the same period is caught as duplicates");
  await service.withdraw(tbJob.id, "Superseded by a corrected export.");
  const { job: badTb } = await load(service, "trial_balance", "trial_balance_unbalanced.csv", fx.trialBalance(500), "CSV");
  assert.equal(badTb.fileChecks.find((check) => check.id === "tb_balance")?.material, true);
  assert.equal(badTb.status, "Imported - exceptions open");
  assert.equal((await service.publish(badTb.id, true)).status, "blocked", "material exceptions block publishing");
  const badRun = await service.reconcile(T, "tb_vs_gl", badTb.id, {});
  assert.equal(badRun.result.status, "Differences found");
  const exception = badRun.result.lines.find((line) => line.status !== "matched");
  assert.ok(exception);
  const reviewed = await service.acknowledgeException(badRun.id, exception.key, "Known timing difference");
  assert.notEqual(reconDisplayStatus(reviewed), "Reconciled", "reviewing an exception never marks the run reconciled");

  // 10. Populate the CFO dashboard.
  for (const [category, name, bytes] of [
    ["income_statement", "income_statement_q3.csv", fx.incomeStatement()],
    ["balance_sheet", "balance_sheet_sep.csv", fx.balanceSheet()],
    ["loan_register", "loan_register.csv", fx.loanRegister()],
    ["accounts_payable", "ap.csv", fx.accountsPayable()],
    ["accounts_receivable", "ar.csv", fx.accountsReceivable()],
  ] as [CategoryId, string, ArrayBuffer][]) {
    const { job } = await load(service, category, name, bytes, "CSV");
    assert.ok(job.successfulRecords > 0, `${category}: ${JSON.stringify((await service.records(job.id)).flatMap((record) => record.issues).slice(0, 3))}`);
    assert.equal((await service.records(job.id)).flatMap((record) => record.issues).filter((issue) => issue.rule === "date_ambiguous").length, 0, `${category}: a column with an unambiguous month-first date applies that order to every row`);
    assert.equal((await publish(service, job.id)).status, "published", category);
  }
  const dataset = await service.dataset(T);
  const kpis = Object.fromEntries(portfolioKpis(dataset).map((kpi) => [kpi.key, kpi.value]));
  assert.equal(kpis.assets, 4792100);
  assert.equal(kpis.liabilities, 1593171);
  assert.equal(kpis.net_worth, 3198929);
  assert.equal(kpis.cash, 14100);
  const is = incomeSummary(dataset);
  assert.ok(is && is.months === 3);
  assert.equal(kpis.dscr, Math.round((is.noi / ((5764 + 7696 + 9200) * 3)) * 100) / 100);
  assert.ok(is.noi > 0, "sample portfolio has positive NOI");
  assert.ok(typeof kpis.ltv === "number" && kpis.ltv > 0);

  // 11. Generate property-wise P&L.
  const pnl = propertyPnl(dataset);
  assert.ok(pnl);
  const mer = pnl.properties.find((row) => row.property === "MER-1790");
  const expectedRent = lines.slice(0, 990).filter((line) => line.property === "MER-1790" && line.account === "4010").reduce((total, line) => total + line.credit, 0);
  assert.equal(mer?.rentalRevenue, Math.round(expectedRent * 100) / 100);
  assert.deepEqual(pnl.unclassified.map((item) => item.account).sort(), ["4999", "6999"]);

  // 12. Verify multi-entity reporting.
  assert.deepEqual(glJob.entityIds, ["BRL", "CCL", "MHLP", "SLH"]);
  const brl = propertyPnl(dataset, { entity: "BRL" });
  assert.ok(brl && brl.properties.every((row) => ["P001", "P005"].includes(row.property)));

  // 13. Upload invalid Excel files.
  assert.throws(() => parseWorkbook("broken.xlsx", fx.invalidWorkbook()), FileFormatError);
  const failed = await service.recordFailure({ tenantId: T, connectionId: connectionFor("excel"), category: "gl_transactions", fileName: "broken.xlsx", fileSize: 51, bytes: fx.invalidWorkbook(), error: "Not a valid workbook" });
  assert.equal(failed.status, "Failed");
  const missing = prepare("gl_transactions", "missing.csv", fx.missingColumnsCsv());
  assert.ok(checkMapping(categoryById("gl_transactions"), Object.fromEntries(Object.entries(missing.mapping).map(([key, header]) => [key, missing.headers.indexOf(header)])), missing.profiles).missingRequired.length >= 4);

  // 14. Failed imports and retry.
  const retryCsv = new TextEncoder().encode(
    "Trans ID,Entity Code,Property Code,GL Account,Post Date,Debit,Credit,Memo\r\nJE-9001-1,MHLP,BLDG-77,6110,09/20/2026,500,,Repair\r\nJE-9001-2,MHLP,BLDG-77,2010,09/20/2026,,500,Repair",
  ).buffer as ArrayBuffer;
  const { job: retryJob } = await load(service, "gl_transactions", "gl_unknown_property.csv", retryCsv, "CSV");
  assert.equal(retryJob.failedRecords, 2);
  await service.link(T, "property", "BLDG-77", "P004", "Yardi building code for P004");
  const retried = await service.retryFailed(retryJob.id);
  assert.equal(retried.recovered, 2);
  assert.equal(retried.job.failedRecords, 0);
  assert.equal((await service.records(retryJob.id))[0].propertyId, "P004", "stable master ID stored, source ID retained in values");
  assert.equal((await service.records(retryJob.id))[0].values.property_id, "BLDG-77");

  // 15. Verify audit history.
  const audit = (await service.auditLog(T)).map((entry) => entry.action);
  for (const action of ["Mapping template saved", "Import completed", "Import published (overwrite confirmed)", "Property linked", "Failed records retried", "Reconciliation run", "Reconciliation exception reviewed", "Import failed"]) {
    assert.ok(audit.includes(action), `audit contains ${action}`);
  }

  // Every stored record keeps its lineage.
  const sample = glRecords[0];
  assert.equal(sample.sourceSystem, "Yardi Voyager 8 (XLSX export)");
  assert.equal(sample.connectionId, IntegrationService.defaultConnectionId(T, "yardi_voyager_8"));
  assert.ok(sample.sourceRecordId.startsWith("transaction_id="));
  assert.equal(sample.jobId, glJob.id);
  assert.ok(sample.entityId && sample.propertyId && sample.period);

  // AI analyst answers only from validated, published data and cites its sources.
  const top = ask("Which property generated the highest NOI?", dataset);
  assert.equal(top.supported, true);
  assert.ok(top.sources.jobs.includes(glJob.id));
  const rent = ask("Which properties have declining rental income?", dataset);
  assert.match(rent.answer, /1 property\(ies\) have declining rental income: .*\(2026-08 → 2026-09\)/, rent.answer);
  const opexBy = (period: string) => Math.round(lines.slice(0, 990).filter((line) => line.period === period && ["6110", "6200", "6300", "6400"].includes(line.account)).reduce((total, line) => total + line.debit - line.credit, 0));
  const opexAnswer = ask("Why did operating expenses increase?", dataset).answer;
  assert.ok(opexAnswer.includes(`$${opexBy("2026-08").toLocaleString("en-US")}`) && opexAnswer.includes(`$${opexBy("2026-09").toLocaleString("en-US")}`), opexAnswer);
  assert.match(opexAnswer, opexBy("2026-09") > opexBy("2026-08") ? /rose/ : /did not increase/, "the analyst reports the real direction instead of assuming the question is right");
  assert.match(ask("What is the portfolio DSCR?", dataset).answer, /x/);
  assert.equal(ask("What is the weather?", dataset).supported, false);

  // IFRS 16 exchange carries the input fields only; no balances are calculated here.
  const payload = ifrs16Payload([], T);
  assert.equal(payload.leases.length, 0);
  assert.equal(ifrs16InputFields.length, 9);
});

function csvBytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

async function seedMasters(service: IntegrationService) {
  await service.connections(T);
  for (const [category, name, bytes] of [
    ["property_master", "pm.xlsx", fx.propertyMaster100()],
    ["chart_of_accounts", "coa.csv", fx.chartOfAccounts()],
  ] as [CategoryId, string, ArrayBuffer][]) {
    const { job } = await load(service, category, name, bytes, "CSV");
    await publish(service, job.id);
  }
}

test("ERP adapters transform exports into the common data model", async () => {
  const service = new IntegrationService(new MemoryAdapter());
  await seedMasters(service);
  const sap = await service.saveConnection({ tenantId: T, connectorId: "sap_s4hana", name: "SAP S/4HANA — Group", environment: "Production", mode: "file", schedule: "monthly", freshnessDays: 31, verification: {}, active: true });
  const sapCsv = csvBytes(
    "Company Code,Journal Entry,G/L Account,Posting Date,Profit Center,Amount in Company Code Currency,Debit/Credit Ind.,Item Text\r\nMHLP,100000001,6110,09/22/2026,P004,750.00,S,Roof repair\r\nMHLP,100000001,2010,09/22/2026,P004,750.00,H,Roof repair",
  );
  const prepared = prepare("gl_transactions", "sap_gl.csv", sapCsv, "sap_s4hana");
  assert.ok(prepared.headers.includes("Debit (derived)") && prepared.headers.includes("Credit (derived)"));
  assert.match(prepared.notes[0], /S = debit, H = credit/);
  assert.equal(prepared.mapping.entity_id, "Company Code");
  assert.equal(prepared.mapping.account_code, "G/L Account");
  assert.equal(prepared.mapping.property_id, "Profit Center");
  assert.equal(prepared.mapping.debit, "Debit (derived)");
  assert.equal(prepared.mapping.credit, "Credit (derived)");
  const { job } = await load(service, "gl_transactions", "sap_gl.csv", sapCsv, sap.id);
  assert.equal(job.successfulRecords, 2, JSON.stringify((await service.records(job.id)).flatMap((record) => record.issues)));
  assert.equal(job.source, "SAP S/4HANA (CSV export)");
  assert.ok(job.fileChecks.find((check) => check.id === "gl_debit_credit")?.passed);
  const records = await service.records(job.id);
  assert.equal(records[0].values.debit, 750);
  assert.equal(records[1].values.credit, 750);
  assert.equal(records[0].raw["Amount in Company Code Currency"], "750.00", "the original source value is kept unchanged");

  const d365Csv = csvBytes("Legal entity,Voucher,Main account,Date,Business unit,Amount in accounting currency,Description\r\nBRL,GJ-0001,6200,09/23/2026,P001,410,Water\r\nBRL,GJ-0001,1010,09/23/2026,P001,-410,Water");
  const d365 = prepare("gl_transactions", "d365.csv", d365Csv, "dynamics_365");
  assert.equal(d365.mapping.debit, "Debit (derived)");
  assert.match(d365.notes[0], /positive = debit, negative = credit/);

  for (const connector of connectors) {
    assert.equal(connectionState("api", Object.fromEntries(["product", "interface", "authorization", "auth", "permissions", "endpoints", "limits", "tested"].map((key) => [key, true])), false).label, "Not connected", `${connector.name} never shows connected without a server connector`);
  }
  assert.equal(connectionState("file", {}, false).state, "ready");
});

test("multi-source governance: conflicts, overwrite policy, period locks, sync modes", async () => {
  const service = new IntegrationService(new MemoryAdapter());
  await seedMasters(service);
  const apInvoice = "Invoice Number,Vendor Code,Vendor,Entity,Property,Invoice Date,Due Date,Amount,Balance\r\nINV-7001,V-HVAC,North Texas HVAC,MHLP,MER-1790,09/05/2026,10/05/2026,1250,1250";
  const { job: yardiAp } = await load(service, "accounts_payable", "ap_yardi.csv", csvBytes(apInvoice), "yardi");
  assert.equal(yardiAp.successfulRecords, 1);
  assert.equal((await publish(service, yardiAp.id)).status, "published");

  // Same identifiers from a different source are not assumed to be the same record.
  const netsuite = await service.saveConnection({ tenantId: T, connectorId: "oracle_netsuite", name: "NetSuite — Holdco", environment: "Production", mode: "file", schedule: "weekly", freshnessDays: 7, verification: {}, active: true });
  const { job: nsAp } = await load(service, "accounts_payable", "ap_netsuite.csv", csvBytes(apInvoice), netsuite.id);
  assert.equal(nsAp.duplicateRecords, 0);
  assert.equal(nsAp.successfulRecords, 1);
  assert.ok((await service.records(nsAp.id))[0].issues.some((issue) => issue.rule === "cross_source_conflict"));
  const confirm = await service.publish(nsAp.id, false);
  assert.equal(confirm.status, "confirm");
  assert.match(confirm.message, /different source/);
  assert.equal(confirm.overlaps?.[0].sameConnection, false);

  // Never-overwrite policy blocks replacement even with approval.
  const settings = await service.settings(T);
  await service.saveSettings({ ...settings, overwritePolicy: "never" }, "policy never");
  assert.equal((await service.publish(nsAp.id, true)).status, "blocked");
  await service.saveSettings({ ...settings, overwritePolicy: "approval" }, "policy approval");

  // Incremental re-import from the same source is caught as duplicates; full refresh is not.
  const { job: again } = await load(service, "accounts_payable", "ap_yardi_again.csv", csvBytes(apInvoice), "yardi");
  assert.equal(again.duplicateRecords, 1);
  const { job: refresh } = await load(service, "accounts_payable", "ap_yardi_refresh.csv", csvBytes(apInvoice), "yardi", "full_refresh");
  assert.equal(refresh.successfulRecords, 1);
  assert.equal(refresh.syncMode, "full_refresh");
  const refreshPublish = await service.publish(refresh.id, false);
  assert.equal(refreshPublish.status, "confirm", "full refresh replaces earlier records only with approval");
  assert.ok(refreshPublish.overlaps?.some((item) => item.sameConnection));

  // Locked periods reject rows and block publishing of imports that cover them.
  const septemberGl = csvBytes("Trans ID,Entity Code,Property Code,GL Account,Post Date,Debit,Credit,Memo\r\nJE-8001-1,MHLP,P004,6200,09/21/2026,300,,Water\r\nJE-8001-2,MHLP,P004,2010,09/21/2026,,300,Water");
  const { job: beforeLock } = await load(service, "gl_transactions", "gl_sep.csv", septemberGl, "yardi");
  assert.deepEqual(beforeLock.periods, ["2026-09"]);
  await service.saveSettings({ ...(await service.settings(T)), lockedPeriods: ["2026-09"] }, "lock");
  const tbJob = (await load(service, "trial_balance", "tb.csv", fx.trialBalance(), "yardi")).job;
  assert.equal(tbJob.successfulRecords, 0);
  assert.ok((await service.records(tbJob.id))[0].issues.some((issue) => issue.rule === "period_locked"));
  const blocked = await service.publish(beforeLock.id, true);
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.message, /2026-09 are locked/);

  // Freshness reflects the connection's expected refresh.
  assert.equal(freshness(new Date().toISOString(), "monthly", 31).state, "fresh");
  assert.equal(freshness(new Date(Date.now() - 40 * 86_400_000).toISOString(), "monthly", 31).state, "due");
  assert.equal(freshness(new Date(Date.now() - 90 * 86_400_000).toISOString(), "weekly", 7).state, "stale");
  assert.equal(freshness(null, "manual", 31).state, "never");
});

test("tenant isolation keeps workspaces apart", async () => {
  const service = new IntegrationService(new MemoryAdapter());
  const other = await service.addTenant("Bluestone Client");
  const { job } = await load(service, "chart_of_accounts", "coa.csv", fx.chartOfAccounts(), "CSV");
  assert.equal(job.tenantId, T);
  assert.equal((await service.jobs(other.id)).length, 0);
  assert.equal((await service.master(other.id)).data.properties.length, 0);
});
