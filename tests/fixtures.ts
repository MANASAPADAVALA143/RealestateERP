import * as XLSX from "xlsx";

type Row = Record<string, string | number | Date>;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function book(sheets: { name: string; aoa: (string | number | Date | null)[][] }[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.aoa, { cellDates: true }), sheet.name);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer;
}

function csv(headers: string[], rows: Row[]): ArrayBuffer {
  const lines = [headers.join(","), ...rows.map((row) => headers.map((header) => {
    const value = row[header];
    const text = value === undefined || value === null ? "" : String(value);
    return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(","))];
  return new TextEncoder().encode(lines.join("\r\n")).buffer as ArrayBuffer;
}

export const ENTITIES = ["MHLP", "BRL", "CCL", "SLH"];

export function propertyCodes(): string[] {
  return ["MER-1790", "AUS-BLVD", ...Array.from({ length: 98 }, (_, index) => `P${String(index + 1).padStart(3, "0")}`)];
}

export function propertyMaster100(): ArrayBuffer {
  const random = seeded(7);
  const cities = ["Dallas", "Austin", "Houston", "Plano", "Irving", "Frisco", "San Antonio"];
  const types = ["Office", "Retail", "Multifamily", "Industrial", "Land"];
  const header = ["Property Code", "Property Name", "Entity", "Address", "City", "State", "Type", "Units", "Sq Ft", "Acquired", "Purchase Price", "Market Value", "Status"];
  const rows = propertyCodes().map((code, index) => {
    if (code === "MER-1790") return [code, "1790 Meridian Blvd, Suite-130, Carrollton TX", "MHLP", "1790 Meridian Blvd", "Carrollton", "TX", "Office", 12, 18400, new Date(Date.UTC(2019, 4, 14)), 188833, 850000, "Active"];
    if (code === "AUS-BLVD") return [code, "AUSTIN BLVD (Commercial Lot)", "MHLP", "Austin Blvd", "Austin", "TX", "Land", 0, 0, new Date(Date.UTC(2021, 2, 1)), 19696356, 40000000, "Active"];
    const cost = Math.round(500000 + random() * 9500000);
    return [
      code,
      `${100 + index} ${["Oak", "Elm", "Cedar", "Pecan", "Maple"][index % 5]} ${["Plaza", "Court", "Center", "Commons", "Tower"][index % 5]}`,
      ENTITIES[index % ENTITIES.length],
      `${1000 + index * 7} Main St`,
      cities[index % cities.length],
      "TX",
      types[index % types.length],
      Math.round(random() * 200),
      Math.round(5000 + random() * 120000),
      new Date(Date.UTC(2015 + (index % 10), index % 12, 1 + (index % 27))),
      cost,
      Math.round(cost * (1.05 + random() * 0.6)),
      "Active",
    ];
  });
  return book([
    { name: "Notes", aoa: [["Yardi Voyager export"], ["Report: Property Directory"]] },
    { name: "Properties", aoa: [["Meridian Ventures Group"], ["Property Directory"], ["As of 09/30/2026"], [], header, ...rows] },
  ]);
}

export const COA: { code: string; description: string; type: string; subtype: string; normal: string }[] = [
  { code: "1010", description: "Operating Cash", type: "Asset", subtype: "Cash", normal: "Debit" },
  { code: "1200", description: "Tenant Receivables", type: "Asset", subtype: "Receivable", normal: "Debit" },
  { code: "1500", description: "Buildings", type: "Asset", subtype: "Fixed Asset", normal: "Debit" },
  { code: "2010", description: "Accounts Payable", type: "Liability", subtype: "Payable", normal: "Credit" },
  { code: "2500", description: "Mortgage Notes", type: "Liability", subtype: "Debt", normal: "Credit" },
  { code: "3000", description: "Partners Capital", type: "Equity", subtype: "Equity", normal: "Credit" },
  { code: "4010", description: "Base Rent", type: "Revenue", subtype: "Rental Revenue", normal: "Credit" },
  { code: "4100", description: "CAM Recoveries", type: "Revenue", subtype: "Other Revenue", normal: "Credit" },
  { code: "6110", description: "Repairs & Maintenance", type: "Expense", subtype: "Operating Expense", normal: "Debit" },
  { code: "6200", description: "Utilities", type: "Expense", subtype: "Operating Expense", normal: "Debit" },
  { code: "6300", description: "Property Management Fees", type: "Expense", subtype: "Operating Expense", normal: "Debit" },
  { code: "6400", description: "Property Taxes", type: "Expense", subtype: "Operating Expense", normal: "Debit" },
  { code: "7100", description: "Mortgage Interest", type: "Expense", subtype: "Interest Expense", normal: "Debit" },
];

export function chartOfAccounts(): ArrayBuffer {
  return csv(
    ["GL Account", "Account Description", "Account Type", "Sub Type", "Normal Balance"],
    COA.map((account) => ({ "GL Account": account.code, "Account Description": account.description, "Account Type": account.type, "Sub Type": account.subtype, "Normal Balance": account.normal })),
  );
}

export interface GlLine {
  id: string;
  entity: string;
  property: string;
  account: string;
  date: string;
  period: string;
  reference: string;
  memo: string;
  debit: number;
  credit: number;
}

export function glLines(): { lines: GlLine[]; duplicates: number; unmapped: string[] } {
  const random = seeded(11);
  const properties = ["MER-1790", "AUS-BLVD", "P001", "P002", "P003", "P004", "P005"];
  const entityFor: Record<string, string> = { "MER-1790": "MHLP", "AUS-BLVD": "MHLP", P001: "BRL", P002: "CCL", P003: "SLH", P004: "MHLP", P005: "BRL" };
  const months = [7, 8, 9];
  const lines: GlLine[] = [];
  let journal = 1000;
  const push = (property: string, month: number, day: number, debitAccount: string, creditAccount: string, amount: number, memo: string) => {
    journal += 1;
    const date = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const base = { entity: entityFor[property], property, date, period: date.slice(0, 7), reference: `REF-${journal}`, memo };
    lines.push({ ...base, id: `JE-${journal}-1`, account: debitAccount, debit: amount, credit: 0 });
    lines.push({ ...base, id: `JE-${journal}-2`, account: creditAccount, debit: 0, credit: amount });
  };
  let count = 0;
  outer: for (const month of months) {
    for (const property of properties) {
      const rentBase = property === "AUS-BLVD" ? 0 : 42000 + properties.indexOf(property) * 6500;
      const rent = Math.round(rentBase * (month === 9 && property === "P003" ? 0.7 : 1));
      if (rent > 0) push(property, month, 1, "1200", "4010", rent, "Monthly base rent");
      for (let item = 0; item < 24; item += 1) {
        if (lines.length >= 990 - 4) break outer;
        const account = ["6110", "6200", "6300", "6400"][item % 4];
        const amount = Math.round((120 + random() * 1400) * (month === 9 && account === "6110" ? 1.6 : 1) * 100) / 100;
        const day = 2 + ((item * 3 + count) % 26);
        push(property, month, day, account, item % 2 === 0 ? "2010" : "1010", amount, `${account} service`);
        count += 1;
      }
    }
  }
  push("P004", 9, 14, "6999", "1010", 875.5, "Miscellaneous charge");
  push("P005", 9, 18, "1010", "4999", 1200, "Late fee income");
  const unique = lines.slice(0, 990);
  const duplicates = unique.slice(100, 110).map((line) => ({ ...line }));
  return { lines: [...unique, ...duplicates], duplicates: duplicates.length, unmapped: ["6999", "4999"] };
}

function usDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

export function glWorkbook(): ArrayBuffer {
  const { lines } = glLines();
  const header = ["Trans ID", "Entity Code", "Property Code", "GL Account", "Account Description", "Post Date", "Post Month", "Reference", "Memo", "Debit", "Credit"];
  const describe = new Map(COA.map((account) => [account.code, account.description]));
  return book([
    {
      name: "GL Detail",
      aoa: [
        ["General Ledger Detail"],
        ["Period = Jul 2026-Sep 2026"],
        header,
        ...lines.map((line) => [line.id, line.entity, line.property, line.account, describe.get(line.account) ?? "Unknown", usDate(line.date), line.period, line.reference, line.memo, line.debit || "", line.credit || ""]),
      ],
    },
  ]);
}

export function trialBalanceRows(adjust = 0): Row[] {
  const { lines } = glLines();
  const unique = lines.slice(0, 990);
  const key = (line: GlLine) => `${line.entity}|${line.account}`;
  const opening = new Map<string, number>();
  const debit = new Map<string, number>();
  const credit = new Map<string, number>();
  for (const line of unique) {
    const k = key(line);
    if (line.period < "2026-09") opening.set(k, (opening.get(k) ?? 0) + line.debit - line.credit);
    else {
      debit.set(k, (debit.get(k) ?? 0) + line.debit);
      credit.set(k, (credit.get(k) ?? 0) + line.credit);
    }
  }
  const keys = [...new Set([...opening.keys(), ...debit.keys(), ...credit.keys()])].sort();
  const r = (value: number) => Math.round(value * 100) / 100;
  return keys.map((k, index) => {
    const [entity, account] = k.split("|");
    const open = r(opening.get(k) ?? 0);
    const pd = r(debit.get(k) ?? 0);
    const pc = r(credit.get(k) ?? 0) + (index === 0 ? adjust : 0);
    const close = r(open + pd - pc);
    return {
      Entity: entity,
      Account: account,
      "Account Name": COA.find((item) => item.code === account)?.description ?? "Unknown",
      Period: "Sep 2026",
      "Beginning Debit": open > 0 ? open : 0,
      "Beginning Credit": open < 0 ? -open : 0,
      "Debit Activity": pd,
      "Credit Activity": r(pc),
      "Ending Debit": close > 0 ? close : 0,
      "Ending Credit": close < 0 ? -close : 0,
    };
  });
}

export function trialBalance(adjust = 0): ArrayBuffer {
  const headers = ["Entity", "Account", "Account Name", "Period", "Beginning Debit", "Beginning Credit", "Debit Activity", "Credit Activity", "Ending Debit", "Ending Credit"];
  return csv(headers, trialBalanceRows(adjust));
}

export function incomeStatement(): ArrayBuffer {
  const { lines } = glLines();
  const unique = lines.slice(0, 990).filter((line) => line.entity === "MHLP");
  const total = (codes: string[], side: "credit" | "debit") => Math.round(unique.filter((line) => codes.includes(line.account)).reduce((sum, line) => sum + (side === "credit" ? line.credit - line.debit : line.debit - line.credit), 0) * 100) / 100;
  const rent = total(["4010"], "credit");
  const other = total(["4100", "4999"], "credit");
  const opex = total(["6110", "6200", "6300", "6400", "6999"], "debit");
  const interest = 16200;
  return csv(["Entity", "Period", "Line Item", "Classification", "Amount"], [
    { Entity: "MHLP", Period: "2026-Q3", "Line Item": "Rental income", Classification: "Revenue", Amount: rent },
    { Entity: "MHLP", Period: "2026-Q3", "Line Item": "Other property income", Classification: "Revenue", Amount: other },
    { Entity: "MHLP", Period: "2026-Q3", "Line Item": "Operating expenses", Classification: "Operating Expense", Amount: opex },
    { Entity: "MHLP", Period: "2026-Q3", "Line Item": "Mortgage interest", Classification: "Non-operating Expense", Amount: interest },
    { Entity: "MHLP", Period: "2026-Q3", "Line Item": "Net income", Classification: "Revenue", Amount: Math.round((rent + other - opex - interest) * 100) / 100 },
  ]);
}

export function balanceSheet(difference = 0): ArrayBuffer {
  return csv(["Entity", "Period", "Line Item", "Section", "Amount"], [
    { Entity: "MHLP", Period: "2026-09", "Line Item": "Operating cash", Section: "Asset", Amount: 14100 },
    { Entity: "MHLP", Period: "2026-09", "Line Item": "Tenant receivables", Section: "Asset", Amount: 22500 },
    { Entity: "MHLP", Period: "2026-09", "Line Item": "Real estate", Section: "Asset", Amount: 4755500 },
    { Entity: "MHLP", Period: "2026-09", "Line Item": "Mortgage loans", Section: "Liability", Amount: 1593171 },
    { Entity: "MHLP", Period: "2026-09", "Line Item": "Accounts payable", Section: "Liability", Amount: 0 },
    { Entity: "MHLP", Period: "2026-09", "Line Item": "Partners equity", Section: "Equity", Amount: 3198929 + difference },
  ]);
}

export function loanRegister(): ArrayBuffer {
  return csv(["Loan Number", "Lender", "Entity", "Property", "Original Principal", "Principal Balance", "Rate", "Payment", "Interest YTD", "Principal YTD", "Maturity", "Collateral Value"], [
    { "Loan Number": "OSB-2947", Lender: "Oakwood Savings Bank", Entity: "MHLP", Property: "MER-1790", "Original Principal": 800000, "Principal Balance": 773112, Rate: "6.5%", Payment: 5764, "Interest YTD": 37689, "Principal YTD": 14187, Maturity: "04/25/2046", "Collateral Value": 850000 },
    { "Loan Number": "SFG-0920", Lender: "Summit Financial Group", Entity: "MHLP", Property: "AUS-BLVD", "Original Principal": 850000, "Principal Balance": 820059, Rate: "7.7%", Payment: 7696, "Interest YTD": 47358, "Principal YTD": 21906, Maturity: "11/23/2041", "Collateral Value": 40000000 },
    { "Loan Number": "FTB-1102", Lender: "First Texas Bank", Entity: "BRL", Property: "P001", "Original Principal": 1200000, "Principal Balance": 1104000, Rate: "6.9%", Payment: 9200, "Interest YTD": 57400, "Principal YTD": 25800, Maturity: "06/01/2039", "Collateral Value": "" },
  ]);
}

export function accountsPayable(): ArrayBuffer {
  return csv(["Invoice Number", "Vendor Code", "Vendor", "Entity", "Property", "Invoice Date", "Due Date", "Amount", "Paid", "Balance"], [
    { "Invoice Number": "INV-4410", "Vendor Code": "V-HVAC", Vendor: "North Texas HVAC", Entity: "MHLP", Property: "MER-1790", "Invoice Date": "09/05/2026", "Due Date": "10/05/2026", Amount: 1250, Paid: 0, Balance: 1250 },
    { "Invoice Number": "INV-4411", "Vendor Code": "V-UTIL", Vendor: "Oncor Electric", Entity: "MHLP", Property: "MER-1790", "Invoice Date": "08/01/2026", "Due Date": "08/31/2026", Amount: 2200, Paid: 1000, Balance: 1200 },
    { "Invoice Number": "INV-4412", "Vendor Code": "V-TAX", Vendor: "Dallas County", Entity: "BRL", Property: "P001", "Invoice Date": "06/15/2026", "Due Date": "07/15/2026", Amount: 18400, Paid: 0, Balance: 18400 },
  ]);
}

export function accountsReceivable(): ArrayBuffer {
  return csv(["Charge ID", "Tenant Code", "Tenant", "Entity", "Property", "Charge Date", "Due Date", "Amount", "Received", "Balance"], [
    { "Charge ID": "AR-9001", "Tenant Code": "T-130", Tenant: "Carrollton Dental", Entity: "MHLP", Property: "MER-1790", "Charge Date": "09/01/2026", "Due Date": "09/01/2026", Amount: 4550, Received: 0, Balance: 4550 },
    { "Charge ID": "AR-9002", "Tenant Code": "T-210", Tenant: "Plaza Coffee", Entity: "BRL", Property: "P001", "Charge Date": "07/01/2026", "Due Date": "07/01/2026", Amount: 3200, Received: 1200, Balance: 2000 },
  ]);
}

export function sapGlExport(): ArrayBuffer {
  return csv(["Company Code", "Journal Entry", "G/L Account", "Posting Date", "Profit Center", "Amount in Company Code Currency", "Debit/Credit Ind.", "Item Text"], [
    { "Company Code": "MHLP", "Journal Entry": "100000101", "G/L Account": "6110", "Posting Date": "10/02/2026", "Profit Center": "P004", "Amount in Company Code Currency": "1,480.00", "Debit/Credit Ind.": "S", "Item Text": "Elevator service" },
    { "Company Code": "MHLP", "Journal Entry": "100000101", "G/L Account": "2010", "Posting Date": "10/02/2026", "Profit Center": "P004", "Amount in Company Code Currency": "1,480.00", "Debit/Credit Ind.": "H", "Item Text": "Elevator service" },
    { "Company Code": "BRL", "Journal Entry": "100000102", "G/L Account": "1200", "Posting Date": "10/01/2026", "Profit Center": "P001", "Amount in Company Code Currency": "48,500.00", "Debit/Credit Ind.": "S", "Item Text": "October base rent" },
    { "Company Code": "BRL", "Journal Entry": "100000102", "G/L Account": "4010", "Posting Date": "10/01/2026", "Profit Center": "P001", "Amount in Company Code Currency": "48,500.00", "Debit/Credit Ind.": "H", "Item Text": "October base rent" },
  ]);
}

export function dynamicsGlExport(): ArrayBuffer {
  return csv(["Legal entity", "Voucher", "Main account", "Date", "Business unit", "Amount in accounting currency", "Description"], [
    { "Legal entity": "CCL", Voucher: "GJ-000451", "Main account": "6200", Date: "10/14/2026", "Business unit": "P002", "Amount in accounting currency": 910.25, Description: "Electricity" },
    { "Legal entity": "CCL", Voucher: "GJ-000451", "Main account": "1010", Date: "10/14/2026", "Business unit": "P002", "Amount in accounting currency": -910.25, Description: "Electricity" },
  ]);
}

export function invalidWorkbook(): ArrayBuffer {
  return new TextEncoder().encode("This is not a spreadsheet. It was renamed to .xlsx.").buffer as ArrayBuffer;
}

export function missingColumnsCsv(): ArrayBuffer {
  return csv(["Memo", "Amount"], [{ Memo: "No account, date, or property columns", Amount: 10 }]);
}
