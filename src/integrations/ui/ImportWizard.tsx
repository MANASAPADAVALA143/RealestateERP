import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download } from "lucide-react";
import { categories, categoryById } from "@/integrations/engine/categories";
import { errorReportCsv, templateWorkbook } from "@/integrations/engine/files";
import { CONFIDENT, checkMapping, mappingFromTemplate, mappingToHeaders, suggestMapping, templateMatchScore } from "@/integrations/engine/mapping";
import { FileFormatError, cellText, dataRows, detectHeaderRow, headersFor, parseWorkbook, profileColumns } from "@/integrations/engine/parse";
import type { CategoryId, DateOrder, FieldMapping, ImportJob, MappingTemplate, ParsedWorkbook, SyncMode } from "@/integrations/engine/types";
import { adapterAliases, applyAdapter, connectorById, type ConnectorFamily } from "@/integrations/engine/connectors";
import type { Analysis } from "@/integrations/service/service";
import { Button, Dropzone, ErrorNote, Notice, Pill, Section, SeverityPill, Stat, inputClass } from "@/integrations/ui/components";
import { download, integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";
import { PublishControl } from "@/integrations/ui/PublishControl";

type Step = "upload" | "configure" | "map" | "validate" | "done";
const steps: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "configure", label: "Worksheet & preview" },
  { id: "map", label: "Map fields" },
  { id: "validate", label: "Validate" },
  { id: "done", label: "Import" },
];

interface Origin {
  column: number;
  how: "auto" | "suggested" | "template" | "manual";
  confidence: number;
}

export function ImportWizard({ initialCategory, lockCategory, family, initialConnectionId, categoryOptions }: { initialCategory: CategoryId; lockCategory?: boolean; family?: ConnectorFamily; initialConnectionId?: string; categoryOptions?: CategoryId[] }) {
  const workspace = useWorkspace();
  const tenantId = workspace?.tenantId;
  const [categoryId, setCategoryId] = useState<CategoryId>(initialCategory);
  const category = categoryById(categoryId);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<{ name: string; size: number; bytes: ArrayBuffer } | null>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [parseError, setParseError] = useState<{ message: string; jobId: string } | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [origins, setOrigins] = useState<Record<string, Origin>>({});
  const [dateOrders, setDateOrders] = useState<Record<string, DateOrder>>({});
  const [profile, setProfile] = useState("Default");
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [templateName, setTemplateName] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [issueFilter, setIssueFilter] = useState<"all" | "error" | "warning" | "duplicate">("all");
  const [syncMode, setSyncMode] = useState<SyncMode>("incremental");
  const allConnections = useAsync(async () => (tenantId ? integrationService.connections(tenantId) : []), [tenantId]).data ?? [];
  const connections = allConnections.filter((item) => item.active && (!family || connectorById(item.connectorId).family === family));
  const [chosenConnection, setChosenConnection] = useState<string | undefined>(initialConnectionId);
  const connectionId = connections.some((item) => item.id === chosenConnection) ? (chosenConnection as string) : connections[0]?.id ?? "";
  const connection = connections.find((item) => item.id === connectionId);
  const connectorId = connection?.connectorId ?? "excel";

  useEffect(() => setCategoryId(initialCategory), [initialCategory]);
  useEffect(() => {
    if (connection && profile === "Default") setProfile(connection.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection?.id]);

  const sheet = workbook?.sheets.find((item) => item.name === sheetName) ?? workbook?.sheets[0];
  const adapted = useMemo(() => (sheet ? applyAdapter(connectorId, categoryId, headersFor(sheet.rows, headerRow), dataRows(sheet.rows, headerRow)) : { headers: [], rows: [], notes: [] }), [sheet, headerRow, connectorId, categoryId]);
  const headers = adapted.headers;
  const rows = adapted.rows;
  const profiles = useMemo(() => profileColumns(headers, rows), [headers, rows]);
  const check = useMemo(() => checkMapping(category, mapping, profiles), [category, mapping, profiles]);
  const templates = useAsync(async () => (tenantId ? integrationService.templates(tenantId, categoryId) : ([] as MappingTemplate[])), [tenantId, categoryId]).data ?? [];
  const profiles_ = useMemo(() => [...new Set(["Default", ...templates.map((template) => template.profile)])], [templates]);
  const master = useAsync(async () => (tenantId ? integrationService.master(tenantId) : null), [tenantId]).data;

  function reset() {
    setStep("upload");
    setFile(null);
    setWorkbook(null);
    setParseError(null);
    setAnalysis(null);
    setJob(null);
    setReviewed(false);
    setError(null);
    setTemplateId(undefined);
  }

  async function onFile(selected: File) {
    if (!tenantId) return;
    reset();
    const bytes = await selected.arrayBuffer();
    setFile({ name: selected.name, size: selected.size, bytes });
    try {
      const parsed = parseWorkbook(selected.name, bytes);
      const best = [...parsed.sheets].sort((a, b) => b.rows.length - a.rows.length)[0];
      setWorkbook(parsed);
      setSheetName(best.name);
      setHeaderRow(detectHeaderRow(best.rows, category));
      setStep("configure");
    } catch (failure) {
      const message = failure instanceof FileFormatError ? failure.message : `The file could not be read. ${failure instanceof Error ? failure.message : ""}`;
      const failed = await integrationService.recordFailure({ tenantId, connectionId, category: categoryId, fileName: selected.name, fileSize: selected.size, bytes, error: message });
      setParseError({ message, jobId: failed.id });
    }
  }

  async function autoMap(chosenProfile = profile) {
    if (!tenantId) return;
    const scored = templates.map((template) => ({ template, score: templateMatchScore(template, headers) })).sort((a, b) => b.score - a.score);
    const bestTemplate = scored.find((item) => item.score >= 0.8 && (chosenProfile === "Default" || item.template.profile === chosenProfile));
    const next: FieldMapping = {};
    const nextOrigins: Record<string, Origin> = {};
    if (bestTemplate) {
      Object.assign(next, mappingFromTemplate(category, bestTemplate.template, headers));
      for (const [key, column] of Object.entries(next)) if (column !== null) nextOrigins[key] = { column, how: "template", confidence: 1 };
      setTemplateId(bestTemplate.template.id);
      setTemplateName(bestTemplate.template.name);
    } else {
      const profileAliases = chosenProfile === "Default" ? {} : await integrationService.profileAliases(tenantId, categoryId, chosenProfile);
      const adapter = adapterAliases(connectorId, categoryId);
      const aliases: Record<string, string[]> = { ...adapter };
      for (const [key, values] of Object.entries(profileAliases)) aliases[key] = [...(aliases[key] ?? []), ...values];
      for (const field of category.fields) next[field.key] = null;
      for (const suggestion of suggestMapping(category, headers, aliases)) {
        if (!suggestion.target) continue;
        next[suggestion.target] = suggestion.column;
        nextOrigins[suggestion.target] = { column: suggestion.column, how: suggestion.confidence >= CONFIDENT ? "auto" : "suggested", confidence: suggestion.confidence };
      }
      setTemplateId(undefined);
    }
    const orders: Record<string, DateOrder> = {};
    for (const profileColumn of profiles) if (profileColumn.dateOrder === "ambiguous") orders[profileColumn.header] = workspace?.settings.defaultDateOrder ?? "MDY";
    setDateOrders((current) => ({ ...orders, ...(bestTemplate?.template.dateOrder && bestTemplate.template.dateOrder !== "auto" ? Object.fromEntries(Object.keys(orders).map((key) => [key, bestTemplate.template.dateOrder])) : {}), ...current }));
    setMapping(next);
    setOrigins(nextOrigins);
  }

  function assign(fieldKey: string, column: number | null) {
    setMapping((current) => ({ ...current, [fieldKey]: column }));
    setOrigins((current) => {
      const next = { ...current };
      if (column === null) delete next[fieldKey];
      else next[fieldKey] = { column, how: "manual", confidence: 1 };
      return next;
    });
  }

  async function saveTemplate() {
    if (!tenantId || !templateName.trim()) return;
    const named = mappingToHeaders(mapping, headers);
    const aliases: Record<string, string[]> = {};
    for (const [key, header] of Object.entries(named)) {
      const field = category.fields.find((item) => item.key === key);
      if (field && !field.synonyms.some((synonym) => synonym.toLowerCase() === header.toLowerCase())) aliases[key] = [header];
    }
    const order = Object.values(dateOrders)[0] ?? "auto";
    const saved = await integrationService.saveTemplate({ id: templateId, tenantId, name: templateName.trim(), profile, category: categoryId, headers, mapping: named, dateOrder: order, aliases });
    setTemplateId(saved.id);
  }

  async function validate() {
    if (!tenantId || !file) return;
    setBusy(true);
    setError(null);
    try {
      setAnalysis(await integrationService.analyse({ tenantId, connectionId, syncMode, category: categoryId, fileName: file.name, bytes: file.bytes, sheetName: sheet?.name ?? "", headerRow, mapping: mappingToHeaders(mapping, headers), dateOrders }));
      setStep("validate");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Validation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!tenantId || !file) return;
    setBusy(true);
    setError(null);
    try {
      setJob(await integrationService.commit({ tenantId, connectionId, syncMode, category: categoryId, fileName: file.name, fileSize: file.size, bytes: file.bytes, sheetName: sheet?.name ?? "", headerRow, mapping: mappingToHeaders(mapping, headers), dateOrders, templateId }));
      setStep("done");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function link(kind: "property" | "entity", sourceId: string, masterId: string) {
    if (!tenantId || !masterId) return;
    await integrationService.link(tenantId, kind, sourceId, masterId, masterId === "__new__" ? "Confirmed during import validation." : "Linked during import validation.");
    await validate();
  }

  const issueRows = analysis ? analysis.report.rows.filter((row) => row.issues.length > 0 && (issueFilter === "all" || row.status === issueFilter || (issueFilter === "warning" && row.status === "warning"))) : [];
  const attention = analysis ? analysis.report.matches.filter((match) => match.status === "unmatched" || match.status === "possible") : [];
  const stepIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="space-y-4" data-wizard>
      <ol className="flex flex-wrap gap-2" aria-label="Import steps">
        {steps.map((item, index) => (
          <li key={item.id} className={`rounded-full px-3 py-1 text-xs font-semibold ${index === stepIndex ? "bg-navy text-ivory" : index < stepIndex ? "bg-gold/20 text-navy" : "bg-white text-navy/50 ring-1 ring-inset ring-navy/10"}`}>
            {index + 1}. {item.label}
          </li>
        ))}
      </ol>

      <Section
        title={`${category.label} import`}
        subtitle={category.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!lockCategory ? (
              <select aria-label="Import category" className={inputClass} value={categoryId} onChange={(event) => { setCategoryId(event.target.value as CategoryId); reset(); }}>
                {(categoryOptions ?? categories.map((item) => item.id)).map((id) => (
                  <option key={id} value={id}>{categoryById(id).group} · {categoryById(id).label}</option>
                ))}
              </select>
            ) : null}
            <Button onClick={() => download(`${categoryId}_template.xlsx`, templateWorkbook(category), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download sample template
            </Button>
            {step !== "upload" ? <Button onClick={reset}>Start over</Button> : null}
          </div>
        }
      >
        {error ? <ErrorNote>{error}</ErrorNote> : null}

        {step === "upload" ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
              Source connection
              <select aria-label="Source connection" className={`${inputClass} mt-1 block min-w-[22rem]`} value={connectionId} onChange={(event) => setChosenConnection(event.target.value)}>
                {connections.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {connectorById(item.connectorId).name} · {item.environment}</option>
                ))}
              </select>
            </label>
            {connection ? <p className="text-xs text-navy/60">{connectorById(connection.connectorId).fileNote}</p> : <ErrorNote>No active connection for this source. Add one first.</ErrorNote>}
            {connection ? <Dropzone onFile={onFile} label={`Drop a ${category.label} export here`} /> : null}
            {parseError ? (
              <ErrorNote>
                {parseError.message} The attempt was recorded as failed import <Link className="font-semibold underline" to={`/data-integrations/history/${parseError.jobId}`}>{parseError.jobId}</Link>. No records were saved.
              </ErrorNote>
            ) : null}
            <p className="text-xs text-navy/50">
              Yardi report layouts differ between customers. Columns are matched by name, and you confirm the mapping before anything is imported. Required fields:{" "}
              {category.fields.filter((field) => field.required).map((field) => field.label).join(", ")}.
            </p>
          </div>
        ) : null}

        {step === "configure" && workbook && sheet ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
                Worksheet
                <select className={`${inputClass} mt-1 block`} value={sheet.name} onChange={(event) => { const next = workbook.sheets.find((item) => item.name === event.target.value); setSheetName(event.target.value); if (next) setHeaderRow(detectHeaderRow(next.rows, category)); }}>
                  {workbook.sheets.map((item) => (
                    <option key={item.name} value={item.name}>{item.name} ({item.rows.length} rows)</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
                Header row
                <input type="number" min={1} max={sheet.rows.length} className={`${inputClass} mt-1 block w-28`} value={headerRow + 1} onChange={(event) => setHeaderRow(Math.max(0, Math.min(sheet.rows.length - 1, Number(event.target.value) - 1)))} />
              </label>
              <p className="pb-2 text-sm text-navy/60">{file?.name} · {rows.length} data rows · {headers.length} columns</p>
            </div>
            {adapted.notes.length ? <Notice tone="amber">{adapted.notes.join(" ")}</Notice> : null}
            {headerRow > 0 ? (
              <Notice tone="sky">
                Rows above the header were skipped as report titles:{" "}
                {sheet.rows.slice(0, headerRow).map((row) => row.filter((cell) => cell !== null).map(cellText).join(" ")).filter(Boolean).join(" · ") || "blank rows"}.
              </Notice>
            ) : null}
            <div className="overflow-x-auto rounded-xl border border-navy/10">
              <table className="data-table min-w-[720px] text-xs">
                <thead>
                  <tr>
                    <th>Row</th>
                    {headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row) => (
                    <tr key={row.row}>
                      <td className="text-navy/50">{row.row}</td>
                      {headers.map((header, index) => (
                        <td key={header} className="whitespace-nowrap">{cellText(row.cells[index] ?? null)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-navy/50">Preview shows the first {Math.min(20, rows.length)} of {rows.length} records.</p>
            <Button primary disabled={rows.length === 0} onClick={async () => { await autoMap(); setStep("map"); }}>Continue to field mapping</Button>
          </div>
        ) : null}

        {step === "map" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
                Customer mapping profile
                <select className={`${inputClass} mt-1 block`} value={profile} onChange={async (event) => { setProfile(event.target.value); await autoMap(event.target.value); }}>
                  {profiles_.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
                Saved template
                <select
                  className={`${inputClass} mt-1 block`}
                  value={templateId ?? ""}
                  onChange={(event) => {
                    const template = templates.find((item) => item.id === event.target.value);
                    if (!template) return;
                    const next = mappingFromTemplate(category, template, headers);
                    setMapping(next);
                    setOrigins(Object.fromEntries(Object.entries(next).filter(([, column]) => column !== null).map(([key, column]) => [key, { column: column as number, how: "template" as const, confidence: 1 }])));
                    setTemplateId(template.id);
                    setTemplateName(template.name);
                    setProfile(template.profile);
                  }}
                >
                  <option value="">{templates.length ? "Choose a template" : "No saved templates yet"}</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name} · {template.profile} · {Math.round(templateMatchScore(template, headers) * 100)}% header match</option>
                  ))}
                </select>
              </label>
              <Button onClick={() => autoMap()}>Re-suggest from column names</Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-navy/10">
              <table className="data-table min-w-[900px]">
                <thead>
                  <tr>
                    <th>EstateCFO field</th>
                    <th>Source column</th>
                    <th>Match</th>
                    <th>Detected type</th>
                    <th>Sample values</th>
                  </tr>
                </thead>
                <tbody>
                  {category.fields.map((field) => {
                    const column = mapping[field.key];
                    const origin = origins[field.key];
                    const columnProfile = column === null || column === undefined ? undefined : profiles[column];
                    const typeWarning = check.typeWarnings.find((item) => item.field.key === field.key);
                    return (
                      <tr key={field.key} className={field.required && (column === null || column === undefined) ? "bg-red-50/60" : ""}>
                        <td>
                          <span className="font-semibold">{field.label}</span>
                          {field.required ? <span className="ml-1 text-red-700" title="Required">*</span> : null}
                          <p className="text-[11px] text-navy/50">{field.key} · {field.type}{field.options ? ` (${field.options.join(" / ")})` : ""}</p>
                        </td>
                        <td>
                          <select aria-label={`Source column for ${field.label}`} className={inputClass} value={column ?? ""} onChange={(event) => assign(field.key, event.target.value === "" ? null : Number(event.target.value))}>
                            <option value="">Not mapped</option>
                            {headers.map((header, index) => (
                              <option key={header} value={index}>{header}</option>
                            ))}
                          </select>
                          {columnProfile?.detected === "date" ? (
                            <select aria-label={`Date format for ${columnProfile.header}`} className={`${inputClass} ml-2`} value={dateOrders[columnProfile.header] ?? "auto"} onChange={(event) => setDateOrders((current) => ({ ...current, [columnProfile.header]: event.target.value as DateOrder }))}>
                              <option value="auto">Date format: auto{columnProfile.dateOrder && columnProfile.dateOrder !== "ambiguous" ? ` (${columnProfile.dateOrder})` : ""}</option>
                              <option value="MDY">MM/DD/YYYY</option>
                              <option value="DMY">DD/MM/YYYY</option>
                              <option value="YMD">YYYY-MM-DD</option>
                            </select>
                          ) : null}
                        </td>
                        <td>
                          {origin ? <Pill tone={origin.how === "suggested" ? "warning" : origin.how === "manual" ? "new" : "valid"}>{origin.how === "auto" ? `Auto ${Math.round(origin.confidence * 100)}%` : origin.how === "suggested" ? `Suggested ${Math.round(origin.confidence * 100)}% — confirm` : origin.how === "template" ? "Template" : "Manual"}</Pill> : null}
                        </td>
                        <td>
                          {columnProfile ? columnProfile.detected : "—"}
                          {columnProfile?.dateOrder === "ambiguous" ? <p className="text-[11px] text-amber-800">Month/day order ambiguous — choose a format</p> : null}
                          {typeWarning ? <p className="text-[11px] text-amber-800">Expected {field.type}, column looks like {typeWarning.detected}</p> : null}
                        </td>
                        <td className="max-w-[16rem] truncate text-xs text-navy/60">{columnProfile?.sample.join(" · ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {check.missingRequired.length ? <ErrorNote>Map the required field(s): {check.missingRequired.map((field) => field.label).join(", ")}.</ErrorNote> : null}
            {check.duplicateColumns.length ? <ErrorNote>One column is mapped to more than one field: {check.duplicateColumns.map((item) => `${headers[item.column]} → ${item.targets.join(", ")}`).join("; ")}.</ErrorNote> : null}
            {check.unmappedColumns.length ? <Notice>Columns not mapped and not imported: {check.unmappedColumns.map((index) => headers[index]).join(", ")}.</Notice> : null}

            <div className="flex flex-wrap items-end gap-2 rounded-xl bg-ivory p-3">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
                Template name
                <input className={`${inputClass} mt-1 block`} value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="e.g. Yardi GL detail — Meridian" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
                Profile
                <input className={`${inputClass} mt-1 block`} value={profile} onChange={(event) => setProfile(event.target.value || "Default")} />
              </label>
              <Button disabled={!templateName.trim()} onClick={saveTemplate}>{templateId ? "Update mapping template" : "Save mapping template"}</Button>
            </div>

            <Button primary disabled={busy || check.missingRequired.length > 0 || check.duplicateColumns.length > 0} onClick={validate}>
              {busy ? "Validating…" : "Confirm mapping and validate"}
            </Button>
          </div>
        ) : null}

        {step === "validate" && analysis ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat label="Records" value={analysis.report.counts.total} />
              <Stat label="Valid" value={analysis.report.counts.valid} tone="green" />
              <Stat label="Warnings" value={analysis.report.counts.warning} tone="amber" hint="Imported, flagged for review" />
              <Stat label="Errors" value={analysis.report.counts.error} tone="red" hint="Not imported" />
              <Stat label="Duplicates" value={analysis.report.counts.duplicate} tone="red" hint="Not imported" />
            </div>

            {analysis.report.fileChecks.map((fileCheck) => (
              <div key={fileCheck.id} className={`rounded-xl border p-4 ${fileCheck.passed ? "border-emerald-200 bg-emerald-50/60" : fileCheck.material ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60"}`}>
                <p className="flex items-center gap-2 font-semibold text-navy">
                  {fileCheck.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : null}
                  {fileCheck.label} — {fileCheck.passed ? "passed" : fileCheck.material ? "exception" : "review"}
                </p>
                <p className="mt-1 text-sm text-navy/80">{fileCheck.message}</p>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {fileCheck.details.map((detail) => (
                    <div key={detail.label} className="flex justify-between gap-3 border-b border-navy/5 py-1">
                      <dt className="text-navy/60">{detail.label}</dt>
                      <dd className="tabular-nums font-semibold">{typeof detail.value === "number" ? detail.value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : detail.value}</dd>
                    </div>
                  ))}
                </dl>
                {!fileCheck.passed && fileCheck.material ? <p className="mt-2 text-xs text-navy/60">Values are not adjusted. You can import, but publishing is blocked until the exception is reviewed on the Data Validation page.</p> : null}
              </div>
            ))}

            {analysis.report.matches.length ? (
              <div className="space-y-2">
                <h4 className="font-serif text-lg text-navy">Property and entity matching</h4>
                <p className="text-sm text-navy/60">
                  {analysis.report.matches.filter((match) => match.status === "matched" || match.status === "alias").length} matched on stable codes ·{" "}
                  {analysis.report.matches.filter((match) => match.status === "new").length} new · {attention.length} need a decision. Names alone are never used to merge records.
                </p>
                {attention.length ? (
                  <div className="overflow-x-auto rounded-xl border border-navy/10">
                    <table className="data-table min-w-[820px]">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Source code</th>
                          <th>Status</th>
                          <th>Detail</th>
                          <th>Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attention.map((match) => (
                          <tr key={`${match.kind}-${match.sourceId}`}>
                            <td className="capitalize">{match.kind}</td>
                            <td className="font-semibold">{match.sourceId}</td>
                            <td><Pill tone={match.status}>{match.status === "possible" ? "Possible duplicate" : "Unmatched"}</Pill></td>
                            <td className="max-w-md text-xs">{match.note}</td>
                            <td>
                              <div className="flex flex-wrap items-center gap-2">
                                <select aria-label={`Link ${match.sourceId}`} className={inputClass} defaultValue="" onChange={(event) => link(match.kind, match.sourceId, event.target.value)}>
                                  <option value="">Link to existing…</option>
                                  {(match.kind === "property" ? master?.data.properties : master?.data.entities)?.map((record) => (
                                    <option key={record.id} value={record.id}>{record.id} · {record.name}</option>
                                  ))}
                                </select>
                                {match.status === "possible" ? <Button onClick={() => link(match.kind, match.sourceId, "__new__")}>It is a separate {match.kind}</Button> : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-serif text-lg text-navy">Row issues</h4>
                <div className="flex flex-wrap gap-2">
                  {(["all", "error", "warning", "duplicate"] as const).map((item) => (
                    <button key={item} type="button" onClick={() => setIssueFilter(item)} className={`rounded-full px-3 py-1 text-xs font-semibold ${issueFilter === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>{item}</button>
                  ))}
                  <Button onClick={() => download(`${file?.name ?? "import"}_validation_errors.csv`, errorReportCsv(analysis.report.rows.filter((row) => row.issues.length)), "text/csv")}>
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download error report
                  </Button>
                </div>
              </div>
              {issueRows.length === 0 ? (
                <p className="text-sm text-navy/60">No issues in this view.</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-xl border border-navy/10">
                  <table className="data-table min-w-[900px] text-xs">
                    <thead className="sticky top-0">
                      <tr>
                        <th>Row</th>
                        <th>Status</th>
                        <th>Severity</th>
                        <th>Field</th>
                        <th>Value</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issueRows.slice(0, 300).flatMap((row) =>
                        row.issues.map((issue, index) => (
                          <tr key={`${row.row}-${index}`}>
                            <td>{row.row}</td>
                            <td><Pill tone={row.status}>{row.status}</Pill></td>
                            <td><SeverityPill severity={issue.severity} /></td>
                            <td>{issue.field ?? "—"}</td>
                            <td className="max-w-[10rem] truncate">{issue.value ?? ""}</td>
                            <td>{issue.message}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {issueRows.length > 300 ? <p className="text-xs text-navy/50">Showing 300 of {issueRows.length} rows with issues. The error report has all of them.</p> : null}
            </div>

            <div className="space-y-3 rounded-xl border border-navy/10 bg-ivory p-4">
              <p className="text-sm text-navy">
                Import will save <b>{analysis.report.counts.valid + analysis.report.counts.warning}</b> record(s), including {analysis.report.counts.warning} with warnings. <b>{analysis.report.counts.error + analysis.report.counts.duplicate}</b> record(s) with errors or duplicates are kept with the job and can be retried after you fix the cause. Nothing is published to EstateCFO modules until you choose to publish.
              </p>
              <fieldset className="space-y-1 text-sm">
                <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">Synchronisation mode</legend>
                <label className="flex items-start gap-2">
                  <input type="radio" name="sync-mode" checked={syncMode === "incremental"} onChange={() => { setSyncMode("incremental"); setAnalysis(null); setStep("map"); }} />
                  <span><b>Incremental</b> — records already imported from {connection?.name ?? "this connection"} are skipped as duplicates.</span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" name="sync-mode" checked={syncMode === "full_refresh"} onChange={() => { setSyncMode("full_refresh"); setAnalysis(null); setStep("map"); }} />
                  <span><b>Full refresh</b> — re-import everything from this connection. Publishing then replaces this connection’s earlier records for the same codes or entity-periods, and only with approval.</span>
                </label>
                <p className="text-xs text-navy/50">Changing the mode returns to mapping so validation can be re-run.</p>
              </fieldset>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
                I have reviewed the validation results.
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setStep("map")}>Back to mapping</Button>
                <Button onClick={validate} disabled={busy}>Re-run validation</Button>
                <Button primary disabled={!reviewed || busy || analysis.report.counts.valid + analysis.report.counts.warning === 0} onClick={commit}>
                  {busy ? "Importing…" : "Confirm import"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "done" && job ? (
          <div className="space-y-4">
            <Notice tone={job.status === "Failed" ? "amber" : "green"}>
              Import <Link className="font-semibold underline" to={`/data-integrations/history/${job.id}`}>{job.id}</Link> saved with status <b>{job.status}</b>.
            </Notice>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat label="Total records" value={job.totalRecords} />
              <Stat label="Imported" value={job.successfulRecords} tone="green" />
              <Stat label="Failed" value={job.failedRecords} tone="red" />
              <Stat label="Duplicates" value={job.duplicateRecords} tone="red" />
              <Stat label="With warnings" value={job.warningRecords} tone="amber" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/data-integrations/history/${job.id}`} className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">View import</Link>
              <Link to={`/data-integrations/validation?job=${job.id}`} className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">Validation results</Link>
              <Button onClick={reset}>Import another file</Button>
            </div>
            <PublishControl job={job} />
          </div>
        ) : null}
      </Section>
    </div>
  );
}
