import { categoryById } from "../engine/categories.ts";
import { checkMapping, mappingFromSuggestions, suggestMapping } from "../engine/mapping.ts";
import { normalizeId } from "../engine/matching.ts";
import { applyAdapter, connectionState, connectorById, type ConnectionMode, type ConnectorId } from "../engine/connectors.ts";
import { dataRows, fileKind, headersFor, parseWorkbook, profileColumns } from "../engine/parse.ts";
import { masterAsRecords, reconcile, type ReconFilters, type ReconKind, type ReconResult } from "../engine/reconcile.ts";
import type { Schedule } from "../engine/sync.ts";
import { fileChecks, recordKey, validateRows, type ExistingKey, type ValidationContext } from "../engine/validate.ts";
import type { Dataset } from "../engine/metrics.ts";
import type {
  AuditEntry,
  CategoryId,
  ColumnProfile,
  DateOrder,
  FieldMapping,
  ImportJob,
  MappingTemplate,
  MasterData,
  MasterRecord,
  NormalizedRow,
  StoredRecord,
  SyncMode,
  ValidationReport,
} from "../engine/types.ts";
import { baseEntities, baseProperties, DEFAULT_TENANT } from "./master.ts";
import type { StorageAdapter } from "./storage.ts";

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export interface TenantSettings {
  id: string;
  tenantId: string;
  userName: string;
  materiality: number;
  defaultDateOrder: Exclude<DateOrder, "auto">;
  verification: Record<string, boolean>;
  ifrs16Endpoint: string;
  overwritePolicy: "approval" | "never";
  lockedPeriods: string[];
}

export interface Connection {
  id: string;
  tenantId: string;
  connectorId: ConnectorId;
  name: string;
  environment: string;
  mode: ConnectionMode;
  schedule: Schedule;
  freshnessDays: number;
  verification: Record<string, boolean>;
  createdAt: string;
  createdBy: string;
  active: boolean;
}

/** No server-side connector is deployed with this build, so API connections cannot be verified. */
export const SERVER_CONNECTOR_CONFIGURED = false;

interface AppSettings {
  id: "app";
  currentTenant: string;
  tenants: Tenant[];
}

export interface LinkRecord {
  id: string;
  tenantId: string;
  kind: "property" | "entity";
  sourceId: string;
  masterId: string;
  note: string;
  by: string;
  at: string;
}

export interface Publication {
  id: string;
  tenantId: string;
  category: CategoryId;
  jobId: string;
  entityIds: string[];
  periods: string[];
  publishedAt: string;
  by: string;
  active: boolean;
}

export interface StoredFile {
  id: string;
  tenantId: string;
  jobId: string;
  name: string;
  size: number;
  data: ArrayBuffer;
}

export interface ReconRun {
  id: string;
  tenantId: string;
  kind: ReconKind;
  sourceJobId: string;
  filters: ReconFilters;
  materiality: number;
  at: string;
  by: string;
  result: ReconResult;
  acknowledgements: Record<string, { note: string; by: string; at: string }>;
}

export interface AnalyseParams {
  tenantId: string;
  connectionId: string;
  syncMode?: SyncMode;
  category: CategoryId;
  fileName: string;
  bytes: ArrayBuffer;
  sheetName: string;
  headerRow: number;
  mapping: Record<string, string>;
  dateOrders: Record<string, DateOrder>;
}

export interface Analysis {
  headers: string[];
  profiles: ColumnProfile[];
  mapping: FieldMapping;
  report: ValidationReport;
  adapterNotes: string[];
}

export interface CommitParams extends AnalyseParams {
  fileSize: number;
  templateId?: string;
}

export interface Overlap {
  jobId: string;
  records: number;
  source: string;
  sameConnection: boolean;
}

export interface PublishOutcome {
  status: "published" | "confirm" | "blocked";
  message: string;
  overlaps?: Overlap[];
}

export function sourceLabel(connectorId: string, fileName: string): string {
  const kind = fileKind(fileName)?.toUpperCase() ?? "FILE";
  const connector = connectorById(connectorId);
  return connector.id === "excel" ? (kind === "CSV" ? "CSV" : `Excel (${kind})`) : `${connector.name} (${kind} export)`;
}

const MASTER_CATEGORIES: CategoryId[] = ["property_master", "entity_master", "chart_of_accounts", "property_classification", "tenant_master", "vendor_master"];

function now(): string {
  return new Date().toISOString();
}

function shortId(prefix: string): string {
  const stamp = now().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

const PERIOD_DATE_FIELDS = ["transaction_date", "receipt_date", "credit_date", "as_of_date"];

const SOURCE_ID_FIELDS = ["transaction_id", "receipt_id", "credit_note_id", "invoice_id", "lease_id", "loan_id", "policy_number", "project_id", "property_id", "entity_id", "account_code", "tenant_id", "vendor_id", "unit_id"];

export class IntegrationService {
  private listeners = new Set<() => void>();
  private version = 0;
  private datasetCache = new Map<string, { version: number; data: Dataset }>();

  readonly storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getVersion(): number {
    return this.version;
  }

  private changed(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  /** Lets modules that share this storage (Real Estate AR) refresh subscribed screens. */
  notify(): void {
    this.changed();
  }

  async app(): Promise<AppSettings> {
    const existing = await this.storage.get<AppSettings>("settings", "app");
    if (existing) return existing;
    const created: AppSettings = { id: "app", currentTenant: DEFAULT_TENANT, tenants: [{ id: DEFAULT_TENANT, name: "Meridian Ventures Group", createdAt: now() }] };
    await this.storage.put("settings", created);
    return created;
  }

  async setTenant(tenantId: string): Promise<void> {
    const app = await this.app();
    if (!app.tenants.some((tenant) => tenant.id === tenantId)) throw new Error("Unknown workspace.");
    await this.storage.put("settings", { ...app, currentTenant: tenantId });
    this.changed();
  }

  async addTenant(name: string): Promise<Tenant> {
    const app = await this.app();
    const tenant: Tenant = { id: `${normalizeId(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 4)}`, name: name.trim(), createdAt: now() };
    await this.storage.put("settings", { ...app, tenants: [...app.tenants, tenant] });
    await this.audit(tenant.id, "Workspace created", tenant.id, `Workspace "${tenant.name}" created.`);
    this.changed();
    return tenant;
  }

  async settings(tenantId: string): Promise<TenantSettings> {
    const existing = await this.storage.get<TenantSettings>("settings", `tenant:${tenantId}`);
    const defaults: TenantSettings = { id: `tenant:${tenantId}`, tenantId, userName: "CFO Office", materiality: 1, defaultDateOrder: "MDY", verification: {}, ifrs16Endpoint: "", overwritePolicy: "approval", lockedPeriods: [] };
    return existing ? { ...defaults, ...existing } : defaults;
  }

  async saveSettings(settings: TenantSettings, detail: string): Promise<void> {
    await this.storage.put("settings", settings);
    await this.audit(settings.tenantId, "Settings changed", "Integration settings", detail);
    this.changed();
  }

  async audit(tenantId: string, action: string, target: string, detail: string): Promise<void> {
    const settings = await this.settings(tenantId);
    const entry: AuditEntry = { id: crypto.randomUUID(), tenantId, at: now(), by: settings.userName, action, target, detail };
    await this.storage.put("audit", entry);
  }

  async auditLog(tenantId: string): Promise<AuditEntry[]> {
    return (await this.storage.getByIndex<AuditEntry>("audit", "tenantId", tenantId)).sort((a, b) => b.at.localeCompare(a.at));
  }

  static defaultConnectionId(tenantId: string, connectorId: "excel" | "yardi_voyager_8"): string {
    return connectorId === "excel" ? `${tenantId}:excel` : `${tenantId}:yardi-production`;
  }

  private legacy(job: ImportJob): ImportJob {
    if (job.connectionId) return job;
    const connectorId = job.source?.startsWith("Yardi") ? "yardi_voyager_8" : "excel";
    return { ...job, connectionId: IntegrationService.defaultConnectionId(job.tenantId, connectorId), syncMode: job.syncMode ?? "incremental" };
  }

  async connections(tenantId: string): Promise<Connection[]> {
    const existing = await this.storage.getByIndex<Connection>("connections", "tenantId", tenantId);
    const defaults: Connection[] = [];
    if (!existing.some((item) => item.id === IntegrationService.defaultConnectionId(tenantId, "excel"))) {
      defaults.push({ id: IntegrationService.defaultConnectionId(tenantId, "excel"), tenantId, connectorId: "excel", name: "Excel / CSV uploads", environment: "Manual files", mode: "file", schedule: "manual", freshnessDays: 31, verification: {}, createdAt: now(), createdBy: "System", active: true });
    }
    if (!existing.some((item) => item.id === IntegrationService.defaultConnectionId(tenantId, "yardi_voyager_8"))) {
      defaults.push({ id: IntegrationService.defaultConnectionId(tenantId, "yardi_voyager_8"), tenantId, connectorId: "yardi_voyager_8", name: "Yardi Voyager 8 — Production", environment: "Production", mode: "file", schedule: "monthly", freshnessDays: 31, verification: {}, createdAt: now(), createdBy: "System", active: true });
    }
    if (defaults.length) await this.storage.putMany("connections", defaults);
    return [...existing, ...defaults].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async connection(id: string): Promise<Connection | undefined> {
    return this.storage.get<Connection>("connections", id);
  }

  async saveConnection(input: Omit<Connection, "id" | "createdAt" | "createdBy"> & { id?: string }): Promise<Connection> {
    const settings = await this.settings(input.tenantId);
    const existing = input.id ? await this.connection(input.id) : undefined;
    const saved: Connection = {
      ...input,
      id: input.id ?? `${input.tenantId}:${input.connectorId}-${crypto.randomUUID().slice(0, 6)}`,
      createdAt: existing?.createdAt ?? now(),
      createdBy: existing?.createdBy ?? settings.userName,
    };
    await this.storage.put("connections", saved);
    const state = connectionState(saved.mode, saved.verification, SERVER_CONNECTOR_CONFIGURED);
    await this.audit(
      saved.tenantId,
      existing ? "Connection changed" : "Connection added",
      saved.name,
      `${connectorById(saved.connectorId).name} · ${saved.environment} · ${saved.mode === "file" ? "file import" : "API"} · schedule ${saved.schedule} · state: ${state.label}.`,
    );
    this.changed();
    return saved;
  }

  async jobs(tenantId: string): Promise<ImportJob[]> {
    return (await this.storage.getByIndex<ImportJob>("jobs", "tenantId", tenantId)).map((job) => this.legacy(job)).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  async job(jobId: string): Promise<ImportJob | undefined> {
    const job = await this.storage.get<ImportJob>("jobs", jobId);
    return job ? this.legacy(job) : undefined;
  }

  async records(jobId: string): Promise<StoredRecord[]> {
    return (await this.storage.getByIndex<StoredRecord>("records", "jobId", jobId)).sort((a, b) => a.row - b.row);
  }

  async file(jobId: string): Promise<StoredFile | undefined> {
    return this.storage.get<StoredFile>("files", jobId);
  }

  async links(tenantId: string): Promise<LinkRecord[]> {
    return this.storage.getByIndex<LinkRecord>("links", "tenantId", tenantId);
  }

  async link(tenantId: string, kind: "property" | "entity", sourceId: string, masterId: string, note: string): Promise<void> {
    const settings = await this.settings(tenantId);
    const id = `${tenantId}|${kind}|${normalizeId(sourceId)}`;
    await this.storage.put<LinkRecord>("links", { id, tenantId, kind, sourceId, masterId, note, by: settings.userName, at: now() });
    await this.audit(
      tenantId,
      masterId === "__new__" ? `${kind === "property" ? "Property" : "Entity"} confirmed as separate` : `${kind === "property" ? "Property" : "Entity"} linked`,
      sourceId,
      masterId === "__new__" ? `${sourceId} confirmed as a separate ${kind}, not a duplicate. ${note}` : `${sourceId} linked to EstateCFO ${kind} ${masterId}. ${note}`,
    );
    this.changed();
  }

  async unlink(tenantId: string, linkId: string): Promise<void> {
    const existing = await this.storage.get<LinkRecord>("links", linkId);
    await this.storage.delete("links", linkId);
    if (existing) await this.audit(tenantId, "Link removed", existing.sourceId, `Removed link from ${existing.sourceId} to ${existing.masterId}.`);
    this.changed();
  }

  async publications(tenantId: string): Promise<Publication[]> {
    return (await this.storage.getByIndex<Publication>("publications", "tenantId", tenantId)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  async dataset(tenantId: string): Promise<Dataset> {
    const cached = this.datasetCache.get(tenantId);
    if (cached && cached.version === this.version) return cached.data;
    const publications = (await this.publications(tenantId)).filter((publication) => publication.active);
    const data: Dataset = {};
    const covered = new Map<CategoryId, Set<string>>();
    for (const publication of publications) {
      const category = categoryById(publication.category);
      const seen = covered.get(publication.category) ?? new Set<string>();
      const isMaster = MASTER_CATEGORIES.includes(publication.category);
      const records = (await this.records(publication.jobId)).filter((record) => record.status === "imported");
      const added: Set<string> = new Set();
      const kept: StoredRecord[] = [];
      for (const record of records) {
        const slice = isMaster ? recordKey(category, record.values) ?? record.id : `${normalizeId(record.entityId ?? "")}|${record.period ?? ""}`;
        if (seen.has(slice)) continue;
        added.add(slice);
        kept.push(record);
      }
      added.forEach((slice) => seen.add(slice));
      covered.set(publication.category, seen);
      data[publication.category] = [...(data[publication.category] ?? []), ...kept];
    }
    this.datasetCache.set(tenantId, { version: this.version, data });
    return data;
  }

  async master(tenantId: string): Promise<{ data: MasterData; propertyAliases: Record<string, string[]>; entityAliases: Record<string, string[]>; confirmedNew: string[]; propertyValues: Record<string, Record<string, string | number | null>> }> {
    const dataset = await this.dataset(tenantId);
    const links = await this.links(tenantId);
    const properties = new Map<string, MasterRecord>();
    const propertyValues: Record<string, Record<string, string | number | null>> = {};
    if (tenantId === DEFAULT_TENANT) {
      for (const property of baseProperties) {
        properties.set(normalizeId(property.id), { id: property.id, name: property.name, aliases: [], source: "EstateCFO" });
        propertyValues[property.id] = { market_value: property.marketValue, entity_id: property.entityId };
      }
    }
    for (const record of dataset.property_master ?? []) {
      const id = text(record.values.property_id);
      properties.set(normalizeId(id), { id, name: text(record.values.property_name), aliases: [], source: record.jobId });
      propertyValues[id] = { ...record.values };
    }
    const entities = new Map<string, MasterRecord>();
    if (tenantId === DEFAULT_TENANT) for (const entity of baseEntities) entities.set(normalizeId(entity.id), { ...entity });
    for (const record of dataset.entity_master ?? []) {
      const id = text(record.values.entity_id);
      entities.set(normalizeId(id), { id, name: text(record.values.entity_name), aliases: [], source: record.jobId });
    }
    const propertyAliases: Record<string, string[]> = {};
    const entityAliases: Record<string, string[]> = {};
    const confirmedNew: string[] = [];
    for (const link of links) {
      if (link.masterId === "__new__") {
        confirmedNew.push(link.sourceId);
        continue;
      }
      const target = link.kind === "property" ? propertyAliases : entityAliases;
      target[link.masterId] = [...(target[link.masterId] ?? []), link.sourceId];
    }
    const accounts = (dataset.chart_of_accounts ?? []).map((record) => ({
      code: text(record.values.account_code),
      type: text(record.values.account_type),
      subtype: text(record.values.account_subtype),
      description: text(record.values.account_description),
    }));
    return { data: { properties: [...properties.values()], entities: [...entities.values()], accounts }, propertyAliases, entityAliases, confirmedNew, propertyValues };
  }

  private async existingKeys(tenantId: string, category: CategoryId, connectionId: string, syncMode: SyncMode, excludeJobId?: string): Promise<Map<string, ExistingKey>> {
    const definition = categoryById(category);
    const records = await this.storage.getByIndex<StoredRecord>("records", "tenantId", tenantId);
    const jobs = await this.jobs(tenantId);
    const withdrawn = new Set(jobs.filter((job) => job.status === "Withdrawn").map((job) => job.id));
    const jobConnection = new Map(jobs.map((job) => [job.id, job.connectionId]));
    const connections = new Map((await this.connections(tenantId)).map((item) => [item.id, item.name]));
    const map = new Map<string, ExistingKey>();
    for (const record of records) {
      if (record.category !== category || record.status !== "imported" || withdrawn.has(record.jobId) || record.jobId === excludeJobId) continue;
      const recordConnection = record.connectionId ?? jobConnection.get(record.jobId) ?? "";
      if (syncMode === "full_refresh" && recordConnection === connectionId) continue;
      const key = recordKey(definition, record.values);
      if (key && !map.has(key)) map.set(key, { jobId: record.jobId, connectionId: recordConnection, source: connections.get(recordConnection) ?? record.sourceSystem });
    }
    return map;
  }

  async context(tenantId: string, category: CategoryId, headers: string[], dateOrders: Record<string, DateOrder>, connectionId = IntegrationService.defaultConnectionId(tenantId, "excel"), syncMode: SyncMode = "incremental", excludeJobId?: string): Promise<ValidationContext> {
    const master = await this.master(tenantId);
    const settings = await this.settings(tenantId);
    const orders: Record<number, DateOrder> = {};
    headers.forEach((header, index) => {
      orders[index] = dateOrders[header] ?? "auto";
    });
    return {
      master: master.data,
      propertyAliases: master.propertyAliases,
      entityAliases: master.entityAliases,
      confirmedNew: master.confirmedNew,
      existingKeys: await this.existingKeys(tenantId, category, connectionId, syncMode, excludeJobId),
      materiality: settings.materiality,
      dateOrders: orders,
      connectionId,
      lockedPeriods: settings.lockedPeriods,
    };
  }

  async analyse(params: AnalyseParams & { excludeJobId?: string }): Promise<Analysis> {
    const category = categoryById(params.category);
    const connection = await this.connection(params.connectionId);
    if (!connection) throw new Error("Choose a source connection before importing.");
    const workbook = parseWorkbook(params.fileName, params.bytes);
    const sheet = workbook.sheets.find((item) => item.name === params.sheetName) ?? workbook.sheets[0];
    const adapted = applyAdapter(connection.connectorId, params.category, headersFor(sheet.rows, params.headerRow), dataRows(sheet.rows, params.headerRow));
    const headers = adapted.headers;
    const rows = adapted.rows;
    const profiles = profileColumns(headers, rows);
    const mapping: FieldMapping = {};
    for (const field of category.fields) {
      const header = params.mapping[field.key];
      const index = header === undefined ? -1 : headers.indexOf(header);
      mapping[field.key] = index >= 0 ? index : null;
    }
    const resolvedOrders: Record<string, DateOrder> = { ...params.dateOrders };
    for (const profile of profiles) {
      const chosen = resolvedOrders[profile.header];
      if ((!chosen || chosen === "auto") && (profile.dateOrder === "MDY" || profile.dateOrder === "DMY")) resolvedOrders[profile.header] = profile.dateOrder;
    }
    const context = await this.context(params.tenantId, params.category, headers, resolvedOrders, params.connectionId, params.syncMode ?? "incremental", params.excludeJobId);
    const report = validateRows(category, headers, rows, mapping, context);
    return { headers, profiles, mapping, report, adapterNotes: adapted.notes };
  }

  private resolvedIds(report: ValidationReport): { properties: Map<string, string>; entities: Map<string, string> } {
    const properties = new Map<string, string>();
    const entities = new Map<string, string>();
    for (const match of report.matches) {
      const target = match.kind === "property" ? properties : entities;
      target.set(normalizeId(match.sourceId), match.masterId ?? match.sourceId);
    }
    return { properties, entities };
  }

  private toRecord(job: ImportJob, row: NormalizedRow, ids: { properties: Map<string, string>; entities: Map<string, string> }, status: StoredRecord["status"]): StoredRecord {
    const sourceField = SOURCE_ID_FIELDS.find((field) => typeof row.values[field] === "string" && row.values[field]);
    const property = text(row.values.property_id);
    const entity = text(row.values.entity_id);
    return {
      id: `${job.id}:${row.row}`,
      tenantId: job.tenantId,
      jobId: job.id,
      connectionId: job.connectionId,
      category: job.category,
      row: row.row,
      status,
      sourceSystem: job.source,
      sourceRecordId: sourceField ? `${sourceField}=${row.values[sourceField]}` : `${job.fileName}#row${row.row}`,
      entityId: entity ? ids.entities.get(normalizeId(entity)) ?? entity : null,
      propertyId: property ? ids.properties.get(normalizeId(property)) ?? property : null,
      period: text(row.values.period) || (PERIOD_DATE_FIELDS.map((field) => text(row.values[field])).find(Boolean)?.slice(0, 7) ?? null),
      values: row.values,
      raw: row.raw,
      issues: row.issues,
    };
  }

  private statusFor(job: ImportJob, published: boolean): ImportJob["status"] {
    if (published) return "Published";
    if (job.successfulRecords === 0) return "Failed";
    const open = job.fileChecks.filter((check) => check.material && !job.acknowledgements.some((item) => item.checkId === check.id));
    if (open.length > 0 || job.failedRecords > 0) return "Imported - exceptions open";
    return "Imported";
  }

  async commit(params: CommitParams): Promise<ImportJob> {
    const settings = await this.settings(params.tenantId);
    const analysis = await this.analyse(params);
    const { report } = analysis;
    const category = categoryById(params.category);
    const imported = report.rows.filter((row) => row.status === "valid" || row.status === "warning");
    const ids = this.resolvedIds(report);
    const connection = (await this.connection(params.connectionId)) as Connection;
    const job: ImportJob = {
      id: shortId("IMP"),
      tenantId: params.tenantId,
      source: sourceLabel(connection.connectorId, params.fileName),
      connectionId: connection.id,
      syncMode: params.syncMode ?? "incremental",
      category: params.category,
      fileName: params.fileName,
      fileSize: params.fileSize,
      sheetName: params.sheetName,
      headerRow: params.headerRow,
      entityIds: [],
      propertyIds: [],
      periods: [],
      uploadedBy: settings.userName,
      uploadedAt: now(),
      totalRecords: report.counts.total,
      successfulRecords: imported.length,
      failedRecords: report.counts.error,
      duplicateRecords: report.counts.duplicate,
      warningRecords: report.counts.warning,
      status: "Imported",
      templateId: params.templateId,
      mapping: params.mapping,
      dateOrders: params.dateOrders,
      fileChecks: fileChecks(category, imported, settings.materiality),
      acknowledgements: [],
    };
    const records = report.rows.map((row) => this.toRecord(job, row, ids, row.status === "valid" || row.status === "warning" ? "imported" : row.status));
    const importedRecords = records.filter((record) => record.status === "imported");
    job.entityIds = [...new Set(importedRecords.map((record) => record.entityId).filter((value): value is string => Boolean(value)))].sort();
    job.propertyIds = [...new Set(importedRecords.map((record) => record.propertyId).filter((value): value is string => Boolean(value)))].sort();
    job.periods = [...new Set(importedRecords.map((record) => record.period).filter((value): value is string => Boolean(value)))].sort();
    job.status = this.statusFor(job, false);
    await this.storage.put<StoredFile>("files", { id: job.id, tenantId: job.tenantId, jobId: job.id, name: params.fileName, size: params.fileSize, data: params.bytes.slice(0) });
    await this.storage.putMany("records", records);
    await this.storage.put("jobs", job);
    await this.audit(
      job.tenantId,
      job.status === "Failed" ? "Import failed" : "Import completed",
      job.id,
      `${category.label} from ${params.fileName} via ${connection.name} (${job.syncMode === "full_refresh" ? "full refresh" : "incremental"}): ${job.successfulRecords} imported, ${job.failedRecords} failed, ${job.duplicateRecords} duplicate, ${job.warningRecords} with warnings.`,
    );
    this.changed();
    return job;
  }

  async recordFailure(params: { tenantId: string; connectionId: string; category: CategoryId; fileName: string; fileSize: number; bytes: ArrayBuffer; error: string }): Promise<ImportJob> {
    const settings = await this.settings(params.tenantId);
    const connection = await this.connection(params.connectionId);
    const job: ImportJob = {
      id: shortId("IMP"),
      tenantId: params.tenantId,
      source: sourceLabel(connection?.connectorId ?? "excel", params.fileName),
      connectionId: params.connectionId,
      syncMode: "incremental",
      category: params.category,
      fileName: params.fileName,
      fileSize: params.fileSize,
      sheetName: "",
      headerRow: 0,
      entityIds: [],
      propertyIds: [],
      periods: [],
      uploadedBy: settings.userName,
      uploadedAt: now(),
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      duplicateRecords: 0,
      warningRecords: 0,
      status: "Failed",
      mapping: {},
      dateOrders: {},
      fileChecks: [],
      acknowledgements: [],
      error: params.error,
    };
    await this.storage.put<StoredFile>("files", { id: job.id, tenantId: job.tenantId, jobId: job.id, name: params.fileName, size: params.fileSize, data: params.bytes.slice(0) });
    await this.storage.put("jobs", job);
    await this.audit(job.tenantId, "Import failed", job.id, `${params.fileName}: ${params.error}`);
    this.changed();
    return job;
  }

  async retryFailed(jobId: string, options: { mapping?: Record<string, string>; dateOrders?: Record<string, DateOrder> } = {}): Promise<{ job: ImportJob; recovered: number; stillFailing: number }> {
    const job = await this.job(jobId);
    if (!job) throw new Error("Import job not found.");
    if (job.status === "Published") throw new Error("Unpublish this import before retrying failed records.");
    if (job.status === "Withdrawn") throw new Error("This import was withdrawn.");
    const file = await this.file(jobId);
    if (!file || !job.sheetName) throw new Error("The original file for this job could not be parsed, so there are no records to retry. Upload a corrected file.");
    const mapping = options.mapping ?? job.mapping;
    const dateOrders = options.dateOrders ?? job.dateOrders ?? {};
    const analysis = await this.analyse({ tenantId: job.tenantId, connectionId: job.connectionId, syncMode: job.syncMode, category: job.category, fileName: job.fileName, bytes: file.data, sheetName: job.sheetName, headerRow: job.headerRow, mapping, dateOrders });
    const stored = await this.records(jobId);
    const byRow = new Map(analysis.report.rows.map((row) => [row.row, row]));
    const ids = this.resolvedIds(analysis.report);
    let recovered = 0;
    const updated: StoredRecord[] = [];
    for (const record of stored) {
      if (record.status !== "error") continue;
      const row = byRow.get(record.row);
      if (!row) continue;
      if (row.status === "valid" || row.status === "warning") recovered += 1;
      updated.push(this.toRecord(job, row, ids, row.status === "valid" || row.status === "warning" ? "imported" : row.status));
    }
    await this.storage.putMany("records", updated);
    const all = await this.records(jobId);
    const imported = all.filter((record) => record.status === "imported");
    const category = categoryById(job.category);
    const settings = await this.settings(job.tenantId);
    const normalized: NormalizedRow[] = imported.map((record) => ({ row: record.row, values: record.values, raw: record.raw, status: "valid", issues: record.issues }));
    const next: ImportJob = {
      ...job,
      mapping,
      dateOrders,
      successfulRecords: imported.length,
      failedRecords: all.filter((record) => record.status === "error").length,
      duplicateRecords: all.filter((record) => record.status === "duplicate").length,
      warningRecords: imported.filter((record) => record.issues.length > 0).length,
      fileChecks: fileChecks(category, normalized, settings.materiality),
      entityIds: [...new Set(imported.map((record) => record.entityId).filter((value): value is string => Boolean(value)))].sort(),
      propertyIds: [...new Set(imported.map((record) => record.propertyId).filter((value): value is string => Boolean(value)))].sort(),
      periods: [...new Set(imported.map((record) => record.period).filter((value): value is string => Boolean(value)))].sort(),
    };
    next.status = this.statusFor(next, false);
    await this.storage.put("jobs", next);
    await this.audit(job.tenantId, "Failed records retried", job.id, `${recovered} of ${updated.length} failed records now pass validation and were imported. ${next.failedRecords} still failing.`);
    this.changed();
    return { job: next, recovered, stillFailing: next.failedRecords };
  }

  async acknowledge(jobId: string, checkId: string, note: string): Promise<ImportJob> {
    const job = await this.job(jobId);
    if (!job) throw new Error("Import job not found.");
    if (!note.trim()) throw new Error("Add a review note before acknowledging an exception.");
    const settings = await this.settings(job.tenantId);
    const next: ImportJob = { ...job, acknowledgements: [...job.acknowledgements.filter((item) => item.checkId !== checkId), { checkId, note: note.trim(), by: settings.userName, at: now() }] };
    next.status = this.statusFor(next, job.status === "Published");
    await this.storage.put("jobs", next);
    const check = job.fileChecks.find((item) => item.id === checkId);
    await this.audit(job.tenantId, "Validation exception reviewed", job.id, `${check?.label ?? checkId}: ${note.trim()} (values were not changed).`);
    this.changed();
    return next;
  }

  async overlaps(job: ImportJob): Promise<Overlap[]> {
    const category = categoryById(job.category);
    const isMaster = MASTER_CATEGORIES.includes(job.category);
    const mine = (await this.records(job.id)).filter((record) => record.status === "imported");
    const slices = new Set(mine.map((record) => (isMaster ? recordKey(category, record.values) ?? record.id : `${normalizeId(record.entityId ?? "")}|${record.period ?? ""}`)));
    const names = new Map((await this.connections(job.tenantId)).map((item) => [item.id, item.name]));
    const out: Overlap[] = [];
    for (const publication of (await this.publications(job.tenantId)).filter((item) => item.active && item.category === job.category && item.jobId !== job.id)) {
      const theirs = (await this.records(publication.jobId)).filter((record) => record.status === "imported");
      const count = theirs.filter((record) => slices.has(isMaster ? recordKey(category, record.values) ?? record.id : `${normalizeId(record.entityId ?? "")}|${record.period ?? ""}`)).length;
      const other = await this.job(publication.jobId);
      if (count > 0) out.push({ jobId: publication.jobId, records: count, source: names.get(other?.connectionId ?? "") ?? other?.source ?? "unknown source", sameConnection: other?.connectionId === job.connectionId });
    }
    if (job.category === "property_master" && job.tenantId === DEFAULT_TENANT) {
      const baseIds = new Set(baseProperties.map((property) => normalizeId(property.id)));
      const count = mine.filter((record) => baseIds.has(normalizeId(text(record.values.property_id)))).length;
      if (count > 0) out.push({ jobId: "EstateCFO property master", records: count, source: "EstateCFO", sameConnection: false });
    }
    return out;
  }

  async publish(jobId: string, confirmOverwrite: boolean): Promise<PublishOutcome> {
    const job = await this.job(jobId);
    if (!job) throw new Error("Import job not found.");
    if (job.status === "Failed") return { status: "blocked", message: "A failed import cannot be published." };
    if (job.status === "Withdrawn") return { status: "blocked", message: "A withdrawn import cannot be published." };
    if (job.status === "Published") return { status: "blocked", message: "This import is already published." };
    const open = job.fileChecks.filter((check) => check.material && !job.acknowledgements.some((item) => item.checkId === check.id));
    if (open.length > 0) return { status: "blocked", message: `Review the open validation exception(s) first: ${open.map((check) => check.label).join("; ")}.` };
    const settings = await this.settings(job.tenantId);
    const locked = job.periods.filter((period) => settings.lockedPeriods.some((item) => period === item || period.startsWith(`${item}-`) || item.startsWith(`${period}-`)));
    if (locked.length) return { status: "blocked", message: `Reporting period(s) ${locked.join(", ")} are locked. Unlock them in Integration Settings to publish.` };
    const overlaps = await this.overlaps(job);
    const crossSource = overlaps.filter((item) => !item.sameConnection);
    if (overlaps.length > 0 && settings.overwritePolicy === "never") {
      return {
        status: "blocked",
        message: `The overwrite policy is “Never overwrite published records”. This import overlaps ${overlaps.reduce((total, item) => total + item.records, 0)} published record(s) from ${[...new Set(overlaps.map((item) => item.source))].join(", ")}. Unpublish those first or change the policy in Integration Settings.`,
        overlaps,
      };
    }
    if (overlaps.length > 0 && !confirmOverwrite) {
      return {
        status: "confirm",
        message: `Publishing replaces ${overlaps.reduce((total, item) => total + item.records, 0)} existing EstateCFO record(s) for the same ${MASTER_CATEGORIES.includes(job.category) ? "codes" : "entity and period"}.${crossSource.length ? ` ${crossSource.reduce((total, item) => total + item.records, 0)} of them come from a different source (${[...new Set(crossSource.map((item) => item.source))].join(", ")}); they are not assumed to be the same records, so confirm which source EstateCFO should use.` : ""} Earlier records stay in history and can be restored by unpublishing.`,
        overlaps,
      };
    }
    const publication: Publication = { id: shortId("PUB"), tenantId: job.tenantId, category: job.category, jobId: job.id, entityIds: job.entityIds, periods: job.periods, publishedAt: now(), by: settings.userName, active: true };
    await this.storage.put("publications", publication);
    await this.storage.put("jobs", { ...job, status: "Published" as const });
    await this.audit(
      job.tenantId,
      overlaps.length ? "Import published (overwrite confirmed)" : "Import published",
      job.id,
      `${categoryById(job.category).label}: ${job.successfulRecords} records published to EstateCFO modules${overlaps.length ? `, replacing ${overlaps.map((item) => `${item.records} from ${item.jobId} (${item.source})`).join(", ")} under the “approval each time” policy` : ""}.`,
    );
    this.changed();
    return { status: "published", message: `${job.successfulRecords} records are now live in EstateCFO.` };
  }

  async unpublish(jobId: string): Promise<void> {
    const job = await this.job(jobId);
    if (!job) throw new Error("Import job not found.");
    for (const publication of (await this.publications(job.tenantId)).filter((item) => item.jobId === jobId && item.active)) {
      await this.storage.put("publications", { ...publication, active: false });
    }
    const next = { ...job, status: "Imported" as ImportJob["status"] };
    next.status = this.statusFor(next, false);
    await this.storage.put("jobs", next);
    await this.audit(job.tenantId, "Import unpublished", job.id, `${categoryById(job.category).label} removed from EstateCFO modules. Records remain in import history.`);
    this.changed();
  }

  async unmappedRecords(tenantId: string): Promise<{ total: number; byRule: Record<string, number> }> {
    const withdrawn = new Set((await this.jobs(tenantId)).filter((job) => job.status === "Withdrawn").map((job) => job.id));
    const rules = ["property_unmatched", "entity_unmatched", "property_possible_duplicate", "entity_possible_duplicate", "account_unmapped"];
    const byRule: Record<string, number> = {};
    let total = 0;
    for (const record of await this.storage.getByIndex<StoredRecord>("records", "tenantId", tenantId)) {
      if (withdrawn.has(record.jobId)) continue;
      const hits = record.issues.filter((issue) => rules.includes(issue.rule));
      if (hits.length === 0) continue;
      total += 1;
      for (const rule of new Set(hits.map((issue) => issue.rule))) byRule[rule] = (byRule[rule] ?? 0) + 1;
    }
    return { total, byRule };
  }

  async withdraw(jobId: string, reason: string): Promise<ImportJob> {
    const job = await this.job(jobId);
    if (!job) throw new Error("Import job not found.");
    if (!reason.trim()) throw new Error("Give a reason for withdrawing this import.");
    if (job.status === "Published") await this.unpublish(jobId);
    const next: ImportJob = { ...((await this.job(jobId)) as ImportJob), status: "Withdrawn" };
    await this.storage.put("jobs", next);
    await this.audit(job.tenantId, "Import withdrawn", job.id, `${reason.trim()} Records stay in history and no longer count for duplicate checks or publishing.`);
    this.changed();
    return next;
  }

  async templates(tenantId: string, category?: CategoryId): Promise<MappingTemplate[]> {
    return (await this.storage.getByIndex<MappingTemplate>("templates", "tenantId", tenantId)).filter((template) => !category || template.category === category).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveTemplate(template: Omit<MappingTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<MappingTemplate> {
    const existing = template.id ? await this.storage.get<MappingTemplate>("templates", template.id) : undefined;
    const saved: MappingTemplate = { ...template, id: template.id ?? shortId("MAP"), createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    await this.storage.put("templates", saved);
    const changes = existing
      ? Object.keys({ ...existing.mapping, ...saved.mapping })
          .filter((key) => existing.mapping[key] !== saved.mapping[key])
          .map((key) => `${key}: "${existing.mapping[key] ?? "unmapped"}" → "${saved.mapping[key] ?? "unmapped"}"`)
      : [];
    await this.audit(
      saved.tenantId,
      existing ? "Mapping template changed" : "Mapping template saved",
      saved.name,
      existing ? (changes.length ? changes.join("; ") : "No field changes.") : `${categoryById(saved.category).label} template for profile "${saved.profile}" with ${Object.keys(saved.mapping).length} mapped fields.`,
    );
    this.changed();
    return saved;
  }

  async deleteTemplate(tenantId: string, id: string): Promise<void> {
    const existing = await this.storage.get<MappingTemplate>("templates", id);
    await this.storage.delete("templates", id);
    await this.audit(tenantId, "Mapping template deleted", existing?.name ?? id, `Template deleted.`);
    this.changed();
  }

  async profileAliases(tenantId: string, category: CategoryId, profile: string): Promise<Record<string, string[]>> {
    const out: Record<string, string[]> = {};
    for (const template of await this.templates(tenantId, category)) {
      if (template.profile !== profile) continue;
      for (const [key, header] of Object.entries(template.mapping)) out[key] = [...new Set([...(out[key] ?? []), header, ...(template.aliases[key] ?? [])])];
    }
    return out;
  }

  async reconcile(tenantId: string, kind: ReconKind, sourceJobId: string, filters: ReconFilters): Promise<ReconRun> {
    const source = (await this.records(sourceJobId)).filter((record) => record.status === "imported" || record.status === "duplicate");
    const dataset = await this.dataset(tenantId);
    let destination: StoredRecord[];
    if (kind === "tb_vs_gl") {
      const periods = new Set(source.map((record) => record.period).filter(Boolean));
      destination = (dataset.gl_transactions ?? []).filter((record) => filters.period || periods.has(record.period));
    }
    else if (kind === "gl_vs_gl") destination = (dataset.gl_transactions ?? []).filter((record) => record.jobId !== sourceJobId);
    else if (kind === "property_master") {
      const master = await this.master(tenantId);
      destination = masterAsRecords(master.data.properties, master.propertyValues).filter((record) => record.jobId !== sourceJobId);
    } else {
      const category: CategoryId = kind === "lease_register" ? "lease_register" : kind === "ap" ? "accounts_payable" : "accounts_receivable";
      destination = (dataset[category] ?? []).filter((record) => record.jobId !== sourceJobId);
    }
    const settings = await this.settings(tenantId);
    const result = reconcile(kind, source, destination, filters, settings.materiality);
    const run: ReconRun = { id: shortId("REC"), tenantId, kind, sourceJobId, filters, materiality: settings.materiality, at: now(), by: settings.userName, result, acknowledgements: {} };
    await this.storage.put("recon", run);
    await this.audit(tenantId, "Reconciliation run", run.id, `${kind} for ${sourceJobId}: ${result.status}. ${result.summary.matched} matched, ${result.summary.exceptions} exception(s), difference ${result.summary.difference.toFixed(2)}.`);
    this.changed();
    return run;
  }

  async reconRuns(tenantId: string): Promise<ReconRun[]> {
    return (await this.storage.getByIndex<ReconRun>("recon", "tenantId", tenantId)).sort((a, b) => b.at.localeCompare(a.at));
  }

  async acknowledgeException(runId: string, key: string, note: string): Promise<ReconRun> {
    const run = await this.storage.get<ReconRun>("recon", runId);
    if (!run) throw new Error("Reconciliation run not found.");
    if (!note.trim()) throw new Error("Add a review note.");
    const settings = await this.settings(run.tenantId);
    const next: ReconRun = { ...run, acknowledgements: { ...run.acknowledgements, [key]: { note: note.trim(), by: settings.userName, at: now() } } };
    await this.storage.put("recon", next);
    await this.audit(run.tenantId, "Reconciliation exception reviewed", run.id, `${key}: ${note.trim()} (difference left unchanged).`);
    this.changed();
    return next;
  }
}

export function reconDisplayStatus(run: ReconRun): string {
  if (run.result.status === "Reconciled") return "Reconciled";
  const open = run.result.lines.filter((line) => line.status !== "matched" && !run.acknowledgements[line.key]).length;
  return open === 0 ? "Exceptions reviewed — not reconciled" : "Differences found";
}

export function autoMapping(categoryId: CategoryId, headers: string[], profiles: ColumnProfile[], aliases: Record<string, string[]> = {}) {
  const category = categoryById(categoryId);
  const suggestions = suggestMapping(category, headers, aliases);
  const mapping = mappingFromSuggestions(category, suggestions);
  return { suggestions, mapping, check: checkMapping(category, mapping, profiles) };
}
