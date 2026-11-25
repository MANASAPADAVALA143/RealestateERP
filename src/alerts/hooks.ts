import { useState, useEffect, useCallback, useRef } from "react";
import { IndexedDbAdapter } from "../integrations/service/storage.ts";
import { runAlertScan, dismissAlert, resolveAlert, getActiveAlerts } from "./alertEngine.ts";
import type { Alert, AlertModule, AlertSeverity } from "./types.ts";

const WS = "meridian-ventures";
const SCAN_SESSION_KEY = "alertScanDone";

let _adapter: IndexedDbAdapter | null = null;
function db(): IndexedDbAdapter {
  if (!_adapter) _adapter = new IndexedDbAdapter();
  return _adapter;
}

export interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  scanning: boolean;
  criticalCount: number;
  warningCount: number;
  totalActive: number;
  scan: () => Promise<void>;
  dismiss: (id: string, note?: string) => Promise<void>;
  resolve: (id: string) => Promise<void>;
  filterByModule: (module: AlertModule | "All") => Alert[];
  filterBySeverity: (severity: AlertSeverity | "All") => Alert[];
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const scanQueued = useRef(false);

  const load = useCallback(async () => {
    const active = await getActiveAlerts(db(), WS);
    setAlerts(active);
  }, []);

  const scan = useCallback(async () => {
    if (scanQueued.current) return;
    scanQueued.current = true;
    setScanning(true);
    try {
      await runAlertScan(db(), WS);
      await load();
      try { sessionStorage.setItem(SCAN_SESSION_KEY, "1"); } catch { /* private window */ }
    } finally {
      setScanning(false);
      scanQueued.current = false;
    }
  }, [load]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
      // Auto-scan once per session
      let alreadyScanned = false;
      try { alreadyScanned = sessionStorage.getItem(SCAN_SESSION_KEY) === "1"; } catch { /* private window */ }
      if (!alreadyScanned) {
        scan();
      }
    })();
  }, [load, scan]);

  const dismiss = useCallback(async (id: string, note?: string) => {
    await dismissAlert(db(), id, note);
    await load();
  }, [load]);

  const resolve = useCallback(async (id: string) => {
    await resolveAlert(db(), id);
    await load();
  }, [load]);

  const filterByModule = useCallback((module: AlertModule | "All") =>
    module === "All" ? alerts : alerts.filter((a) => a.module === module),
  [alerts]);

  const filterBySeverity = useCallback((severity: AlertSeverity | "All") =>
    severity === "All" ? alerts : alerts.filter((a) => a.severity === severity),
  [alerts]);

  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const warningCount = alerts.filter((a) => a.severity === "Warning").length;

  return {
    alerts,
    loading,
    scanning,
    criticalCount,
    warningCount,
    totalActive: alerts.length,
    scan,
    dismiss,
    resolve,
    filterByModule,
    filterBySeverity,
  };
}
