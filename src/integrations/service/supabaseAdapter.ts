import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { StorageAdapter, StoreName, IndexName } from "./storage";

// Maps IndexedDB store names to Supabase schema.table and workspace index field.
const STORE_MAP: Partial<Record<StoreName, { schema: string; table: string; wsCol: string }>> = {
  ar_tenants:      { schema: "ar", table: "tenants",             wsCol: "workspace_id" },
  ar_leases:       { schema: "ar", table: "leases",              wsCol: "workspace_id" },
  ar_invoices:     { schema: "ar", table: "invoices",            wsCol: "workspace_id" },
  ar_payments:     { schema: "ar", table: "payments",            wsCol: "workspace_id" },
  ar_credit_notes: { schema: "ar", table: "credit_notes",        wsCol: "workspace_id" },
  ar_deposits:     { schema: "ar", table: "deposits",            wsCol: "workspace_id" },
  ar_journals:     { schema: "ar", table: "journals",            wsCol: "workspace_id" },
  ar_followups:    { schema: "ar", table: "followups",           wsCol: "workspace_id" },
  ar_disputes:     { schema: "ar", table: "disputes",            wsCol: "workspace_id" },
  ar_settings:     { schema: "ar", table: "settings",            wsCol: "workspace_id" },
};

// IndexName → Supabase column name
const INDEX_COL: Record<IndexName, string> = {
  workspaceId: "workspace_id",
  tenantId:    "tenant_id",
  jobId:       "job_id",
};

function mapping(store: StoreName) {
  const m = STORE_MAP[store];
  if (!m) throw new Error(`SupabaseAdapter: store "${store}" is not mapped to a Supabase table`);
  return m;
}

export class SupabaseAdapter implements StorageAdapter {
  readonly kind = "server" as const;
  readonly label = "Supabase (cloud database — data shared across all sessions)";

  private client: SupabaseClient;

  constructor(url?: string, anonKey?: string) {
    const u = url     ?? import.meta.env.VITE_SUPABASE_URL;
    const k = anonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!u || !k) throw new Error("SupabaseAdapter: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
    this.client = createClient(u, k);
  }

  async put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
    const { schema, table } = mapping(store);
    const { error } = await this.client.schema(schema).from(table).upsert(value);
    if (error) throw new Error(`SupabaseAdapter.put(${store}): ${error.message}`);
  }

  async putMany<T extends { id: string }>(store: StoreName, values: T[]): Promise<void> {
    if (values.length === 0) return;
    const { schema, table } = mapping(store);
    const { error } = await this.client.schema(schema).from(table).upsert(values);
    if (error) throw new Error(`SupabaseAdapter.putMany(${store}): ${error.message}`);
  }

  async get<T>(store: StoreName, id: string): Promise<T | undefined> {
    const { schema, table } = mapping(store);
    const { data, error } = await this.client
      .schema(schema)
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`SupabaseAdapter.get(${store}): ${error.message}`);
    return (data ?? undefined) as T | undefined;
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    const { schema, table } = mapping(store);
    const { data, error } = await this.client.schema(schema).from(table).select("*");
    if (error) throw new Error(`SupabaseAdapter.getAll(${store}): ${error.message}`);
    return (data ?? []) as T[];
  }

  async getByIndex<T>(store: StoreName, index: IndexName, value: string): Promise<T[]> {
    const { schema, table } = mapping(store);
    const col = INDEX_COL[index];
    const { data, error } = await this.client
      .schema(schema)
      .from(table)
      .select("*")
      .eq(col, value);
    if (error) throw new Error(`SupabaseAdapter.getByIndex(${store}, ${index}): ${error.message}`);
    return (data ?? []) as T[];
  }

  async delete(store: StoreName, id: string): Promise<void> {
    const { schema, table } = mapping(store);
    const { error } = await this.client.schema(schema).from(table).delete().eq("id", id);
    if (error) throw new Error(`SupabaseAdapter.delete(${store}): ${error.message}`);
  }

  /** Expose the raw Supabase client for RPC calls (Phase 5.5 transactional RPCs). */
  get supabase(): SupabaseClient {
    return this.client;
  }
}
