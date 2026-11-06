import { useSearchParams } from "react-router-dom";
import { categories, isCategoryId } from "@/integrations/engine/categories";
import { IntegrationPage, StorageNotice } from "@/integrations/ui/components";
import { ConnectionsPanel } from "@/integrations/ui/connections";
import { ImportWizard } from "@/integrations/ui/ImportWizard";

const samples = [
  ["property_master_100.xlsx", "Property master, 100 properties, title rows, two worksheets"],
  ["chart_of_accounts.csv", "Chart of accounts"],
  ["gl_transactions_1000.xlsx", "1,000 GL lines with 10 duplicates and 2 unmapped accounts"],
  ["trial_balance_sep2026.csv", "Balanced trial balance for Sep 2026"],
  ["trial_balance_unbalanced.csv", "Trial balance that is out by $500"],
  ["income_statement_2026q3.csv", "Income statement, Q3 2026"],
  ["balance_sheet_sep2026.csv", "Balance sheet, Sep 2026"],
  ["loan_register.csv", "Loan register"],
  ["accounts_payable.csv", "Accounts payable"],
  ["accounts_receivable.csv", "Accounts receivable"],
  ["sap_s4hana_gl_export.csv", "SAP S/4HANA GL export with S/H indicator (use an SAP connection)"],
  ["dynamics365_gl_export.csv", "Dynamics 365 GL export with signed amounts (use a Dynamics connection)"],
  ["invalid_workbook.xlsx", "Not a real workbook (should fail)"],
  ["missing_columns.csv", "Missing required columns"],
];

export function ExcelImportPage() {
  const [params] = useSearchParams();
  const requested = params.get("category") ?? "";
  const initial = isCategoryId(requested) ? requested : "property_master";
  return (
    <IntegrationPage title="Excel / CSV Import" subtitle="Import .xlsx, .xls, or .csv files from any system. Choose the category, map the columns, validate, then confirm.">
      <StorageNotice />
      <ConnectionsPanel family="Excel" title="Excel / CSV sources" />
      <ImportWizard key={initial} initialCategory={initial} family="Excel" categoryOptions={categories.map((category) => category.id)} />
      <details className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
        <summary className="cursor-pointer font-serif text-lg text-navy">Sample test files</summary>
        <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {samples.map(([file, label]) => (
            <li key={file}>
              <a href={`/samples/${file}`} download className="font-semibold underline-offset-2 hover:underline">{file}</a>
              <span className="text-navy/60"> — {label}</span>
            </li>
          ))}
        </ul>
      </details>
    </IntegrationPage>
  );
}
