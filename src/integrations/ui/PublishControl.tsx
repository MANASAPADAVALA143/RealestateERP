import { useState } from "react";
import { integrationService, useAsync } from "@/integrations/ui/hooks";
import { Button, ErrorNote, Notice } from "@/integrations/ui/components";
import type { ImportJob } from "@/integrations/engine/types";
import type { PublishOutcome } from "@/integrations/service/service";

export function PublishControl({ job: initial }: { job: ImportJob }) {
  const job = useAsync(async () => (await integrationService.job(initial.id)) ?? initial, [initial.id]).data ?? initial;
  const [outcome, setOutcome] = useState<PublishOutcome | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(confirm: boolean) {
    setBusy(true);
    setError(null);
    try {
      setOutcome(await integrationService.publish(job.id, confirm));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Publishing failed.");
    } finally {
      setBusy(false);
    }
  }

  if (job.status === "Published") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Notice tone="green">Live in EstateCFO modules. Unpublishing removes it from dashboards but keeps the import history.</Notice>
        <Button onClick={() => integrationService.unpublish(job.id)}>Unpublish</Button>
      </div>
    );
  }
  if (job.status === "Failed" || job.status === "Withdrawn") return null;

  return (
    <div className="space-y-3">
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {outcome?.status === "blocked" ? <ErrorNote>{outcome.message}</ErrorNote> : null}
      {outcome?.status === "published" ? <Notice tone="green">{outcome.message}</Notice> : null}
      {outcome?.status === "confirm" ? (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-navy" role="alertdialog" aria-label="Confirm overwrite">
          <p className="font-semibold">Confirm overwrite</p>
          <p>{outcome.message}</p>
          <ul className="list-disc pl-5">
            {outcome.overlaps?.map((item) => (
              <li key={item.jobId}>
                {item.records} record(s) from {item.jobId}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            I confirm these EstateCFO records should be replaced. This is recorded in the audit trail.
          </label>
          <div className="flex gap-2">
            <Button primary disabled={!confirmed || busy} onClick={() => run(true)}>
              Replace and publish
            </Button>
            <Button onClick={() => setOutcome(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button primary disabled={busy} onClick={() => run(false)}>
          Publish to EstateCFO modules
        </Button>
      )}
    </div>
  );
}
