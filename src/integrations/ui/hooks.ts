import { useEffect, useState, useSyncExternalStore } from "react";
import { IntegrationService, type Tenant, type TenantSettings } from "../service/service.ts";
import { IndexedDbAdapter, MemoryAdapter } from "../service/storage.ts";

function createService(): IntegrationService {
  if (typeof indexedDB === "undefined") return new IntegrationService(new MemoryAdapter());
  return new IntegrationService(new IndexedDbAdapter());
}

export const integrationService = createService();

export function useVersion(): number {
  return useSyncExternalStore(
    (listener) => integrationService.subscribe(listener),
    () => integrationService.getVersion(),
    () => integrationService.getVersion(),
  );
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; error: string | null; loading: boolean } {
  const version = useVersion();
  const [state, setState] = useState<{ data: T | undefined; error: string | null; loading: boolean }>({ data: undefined, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true }));
    load()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error: unknown) => alive && setState({ data: undefined, error: error instanceof Error ? error.message : "Something went wrong.", loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);
  return state;
}

export interface WorkspaceState {
  tenantId: string;
  tenants: Tenant[];
  settings: TenantSettings;
}

export function useWorkspace(): WorkspaceState | undefined {
  return useAsync(async () => {
    const app = await integrationService.app();
    const settings = await integrationService.settings(app.currentTenant);
    return { tenantId: app.currentTenant, tenants: app.tenants, settings };
  }).data;
}

export function download(name: string, data: ArrayBuffer | string, type: string): void {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
