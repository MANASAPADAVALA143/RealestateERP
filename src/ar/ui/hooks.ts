import { useState } from "react";
import { integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";
import { ArService } from "@/ar/service/arService";
import type { ArBook } from "@/ar/engine/types";

export const arService = new ArService(integrationService);

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useArBook(): { book: ArBook | undefined; workspaceId: string | undefined; loading: boolean; error: string | null } {
  const workspace = useWorkspace();
  const state = useAsync(async () => (workspace ? arService.book(workspace.tenantId) : undefined), [workspace?.tenantId]);
  return { book: state.data, workspaceId: workspace?.tenantId, loading: state.loading || !workspace, error: state.error };
}

/** Runs a service action and keeps its error or confirmation message for display. */
export function useAction(): { run: (action: () => Promise<unknown>, success?: string) => Promise<boolean>; busy: boolean; error: string | null; message: string | null; clear: () => void } {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  return {
    busy,
    error,
    message,
    clear: () => {
      setError(null);
      setMessage(null);
    },
    run: async (action, success) => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        await action();
        if (success) setMessage(success);
        return true;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}
