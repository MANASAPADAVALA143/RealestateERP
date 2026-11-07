import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as fx from "../tests/fixtures.ts";

const out = join(import.meta.dirname, "..", "public", "samples");
mkdirSync(out, { recursive: true });

const files: [string, ArrayBuffer][] = [
  ["property_master_100.xlsx", fx.propertyMaster100()],
  ["chart_of_accounts.csv", fx.chartOfAccounts()],
  ["gl_transactions_1000.xlsx", fx.glWorkbook()],
  ["trial_balance_sep2026.csv", fx.trialBalance()],
  ["trial_balance_unbalanced.csv", fx.trialBalance(500)],
  ["income_statement_2026q3.csv", fx.incomeStatement()],
  ["balance_sheet_sep2026.csv", fx.balanceSheet()],
  ["loan_register.csv", fx.loanRegister()],
  ["accounts_payable.csv", fx.accountsPayable()],
  ["accounts_receivable.csv", fx.accountsReceivable()],
  ["yardi_tenant_master.csv", fx.yardiTenants()],
  ["yardi_lease_register.csv", fx.yardiLeases()],
  ["yardi_rent_charges.csv", fx.yardiRentCharges()],
  ["yardi_receipts.csv", fx.yardiReceipts()],
  ["yardi_credit_notes.csv", fx.yardiCreditNotes()],
  ["yardi_ar_ageing.csv", fx.yardiAgeing()],
  ["sap_s4hana_gl_export.csv", fx.sapGlExport()],
  ["dynamics365_gl_export.csv", fx.dynamicsGlExport()],
  ["invalid_workbook.xlsx", fx.invalidWorkbook()],
  ["missing_columns.csv", fx.missingColumnsCsv()],
];

for (const [name, data] of files) writeFileSync(join(out, name), Buffer.from(data));
console.log(`Wrote ${files.length} sample files to ${out}`);
