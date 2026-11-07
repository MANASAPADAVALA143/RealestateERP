export type ArStoreName = "ar_tenants" | "ar_leases" | "ar_invoices" | "ar_payments" | "ar_credit_notes" | "ar_deposits" | "ar_journals" | "ar_followups" | "ar_disputes" | "ar_settings";

export type StoreName = "jobs" | "files" | "records" | "templates" | "links" | "recon" | "audit" | "publications" | "settings" | "connections" | ArStoreName;

export type IndexName = "jobId" | "tenantId" | "workspaceId";

export const AR_STORES: ArStoreName[] = ["ar_tenants", "ar_leases", "ar_invoices", "ar_payments", "ar_credit_notes", "ar_deposits", "ar_journals", "ar_followups", "ar_disputes", "ar_settings"];

export interface StorageAdapter {
  readonly kind: "indexeddb" | "memory" | "server";
  readonly label: string;
  put<T extends { id: string }>(store: StoreName, value: T): Promise<void>;
  putMany<T extends { id: string }>(store: StoreName, values: T[]): Promise<void>;
  get<T>(store: StoreName, id: string): Promise<T | undefined>;
  getAll<T>(store: StoreName): Promise<T[]>;
  getByIndex<T>(store: StoreName, index: IndexName, value: string): Promise<T[]>;
  delete(store: StoreName, id: string): Promise<void>;
}

export class MemoryAdapter implements StorageAdapter {
  readonly kind = "memory" as const;
  readonly label = "In-memory store (tests only — not persisted)";
  private data = new Map<StoreName, Map<string, unknown>>();

  private table(store: StoreName): Map<string, unknown> {
    let table = this.data.get(store);
    if (!table) {
      table = new Map();
      this.data.set(store, table);
    }
    return table;
  }

  async put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
    this.table(store).set(value.id, structuredClone(value));
  }

  async putMany<T extends { id: string }>(store: StoreName, values: T[]): Promise<void> {
    for (const value of values) this.table(store).set(value.id, structuredClone(value));
  }

  async get<T>(store: StoreName, id: string): Promise<T | undefined> {
    const value = this.table(store).get(id);
    return value === undefined ? undefined : (structuredClone(value) as T);
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    return [...this.table(store).values()].map((value) => structuredClone(value) as T);
  }

  async getByIndex<T>(store: StoreName, index: IndexName, value: string): Promise<T[]> {
    return (await this.getAll<Record<string, unknown>>(store)).filter((item) => item[index] === value) as T[];
  }

  async delete(store: StoreName, id: string): Promise<void> {
    this.table(store).delete(id);
  }
}

const STORES: StoreName[] = ["jobs", "files", "records", "templates", "links", "recon", "audit", "publications", "settings", "connections", ...AR_STORES];

export class IndexedDbAdapter implements StorageAdapter {
  readonly kind = "indexeddb" as const;
  readonly label = "This browser (IndexedDB). Data stays on this device; a server database is not configured.";
  private db: Promise<IDBDatabase>;

  constructor(name = "estatecfo-integrations") {
    this.db = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of STORES) {
          if (db.objectStoreNames.contains(store)) continue;
          const os = db.createObjectStore(store, { keyPath: "id" });
          if ((AR_STORES as StoreName[]).includes(store)) {
            os.createIndex("workspaceId", "workspaceId", { unique: false });
            continue;
          }
          if (store !== "settings") os.createIndex("tenantId", "tenantId", { unique: false });
          if (store === "records" || store === "files") os.createIndex("jobId", "jobId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async tx(store: StoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await this.db).transaction(store, mode).objectStore(store);
  }

  private wrap<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
    await this.wrap((await this.tx(store, "readwrite")).put(value));
  }

  async putMany<T extends { id: string }>(store: StoreName, values: T[]): Promise<void> {
    if (values.length === 0) return;
    const db = await this.db;
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(store, "readwrite");
      const os = transaction.objectStore(store);
      for (const value of values) os.put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async get<T>(store: StoreName, id: string): Promise<T | undefined> {
    return (await this.wrap((await this.tx(store, "readonly")).get(id))) as T | undefined;
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    return (await this.wrap((await this.tx(store, "readonly")).getAll())) as T[];
  }

  async getByIndex<T>(store: StoreName, index: IndexName, value: string): Promise<T[]> {
    const os = await this.tx(store, "readonly");
    return (await this.wrap(os.index(index).getAll(value))) as T[];
  }

  async delete(store: StoreName, id: string): Promise<void> {
    await this.wrap((await this.tx(store, "readwrite")).delete(id));
  }
}
