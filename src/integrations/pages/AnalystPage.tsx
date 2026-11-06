import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { ask, supportedQuestions, type AnalystAnswer } from "@/integrations/engine/analyst";
import { categoryById } from "@/integrations/engine/categories";
import type { Dataset, Scope } from "@/integrations/engine/metrics";
import { Crumb } from "@/components/drill";
import { Button, Empty, Notice, Pill, Section, inputClass } from "@/integrations/ui/components";
import { integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";

export function AnalystPage() {
  const workspace = useWorkspace();
  const dataset = useAsync(async () => (workspace ? integrationService.dataset(workspace.tenantId) : ({} as Dataset)), [workspace?.tenantId]).data ?? {};
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<Scope>({});
  const [history, setHistory] = useState<{ question: string; answer: AnalystAnswer }[]>([]);
  const published = Object.entries(dataset).filter(([, records]) => (records ?? []).length > 0);
  const options = useMemo(() => {
    const all = Object.values(dataset).flat().filter(Boolean);
    const uniq = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
    return { entities: uniq(all.map((record) => record?.entityId)), properties: uniq(all.map((record) => record?.propertyId)), periods: uniq(all.map((record) => record?.period)) };
  }, [dataset]);

  function submit(text: string) {
    if (!text.trim()) return;
    setHistory((current) => [{ question: text.trim(), answer: ask(text, dataset, scope) }, ...current]);
    setQuestion("");
  }

  return (
    <div className="space-y-5">
      <Crumb items={[{ label: "Group CFO", to: "/" }, { label: "AI Advisor" }, { label: "AI Financial Analyst" }]} />
      <div>
        <h2 className="font-serif text-3xl text-navy">AI Financial Analyst</h2>
        <p className="mt-1 max-w-3xl text-sm text-navy/60">Answers come from validated, published import records. Every figure is calculated deterministically and cites its entity, property, period, and source import.</p>
      </div>
      <Notice tone="sky">A language model is not connected. Questions are matched to supported analyses; anything else is declined rather than guessed. Nothing leaves this browser.</Notice>

      {published.length === 0 ? (
        <Empty>
          No validated data is published yet. <Link to="/data-integrations" className="font-semibold underline">Import and publish data</Link> — for example a Chart of Accounts and General Ledger — to ask questions.
        </Empty>
      ) : (
        <p className="text-xs text-navy/60">Published data: {published.map(([category, records]) => `${categoryById(category as never).label} (${records?.length})`).join(" · ")}</p>
      )}

      <Section title="Ask a question">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit(question);
          }}
        >
          <input aria-label="Question" className={`${inputClass} min-w-[20rem] flex-1`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. Which property generated the highest NOI?" />
          <Button primary type="submit" disabled={!question.trim()}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Ask
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["entity", "property", "period"] as const).map((key) => (
            <select key={key} aria-label={`Scope by ${key}`} className={inputClass} value={scope[key] ?? ""} onChange={(event) => setScope({ ...scope, [key]: event.target.value || undefined })}>
              <option value="">All {key === "entity" ? "entities" : key === "property" ? "properties" : "periods"}</option>
              {(key === "entity" ? options.entities : key === "property" ? options.properties : options.periods).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {supportedQuestions.map((item) => (
            <button key={item} type="button" onClick={() => submit(item)} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-navy ring-1 ring-inset ring-sky-200 hover:bg-sky-100">
              {item}
            </button>
          ))}
        </div>
      </Section>

      {history.map(({ question: asked, answer }, index) => (
        <Section key={`${asked}-${index}`} title={answer.title} subtitle={`“${asked}”`} actions={<Pill tone={answer.supported ? (answer.sources.jobs.length ? "valid" : "warning") : "unmatched"}>{answer.supported ? (answer.sources.jobs.length ? "Calculated" : "Needs data") : "Not supported"}</Pill>}>
          <p className="text-sm leading-relaxed text-navy">{answer.answer}</p>
          {answer.table && answer.table.rows.length ? (
            <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-navy/10">
              <table className="data-table min-w-[640px] text-xs">
                <thead className="sticky top-0">
                  <tr>
                    {answer.table.columns.map((column, columnIndex) => (
                      <th key={`${column}-${columnIndex}`}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {answer.table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="tabular-nums">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <dl className="mt-3 grid gap-2 text-xs text-navy/70 md:grid-cols-2">
            <div><dt className="font-semibold text-navy/50">Calculation</dt><dd>{answer.basis}</dd></div>
            <div>
              <dt className="font-semibold text-navy/50">Sources</dt>
              <dd>
                {answer.sources.jobs.length === 0 ? "None" : (
                  <>
                    Imports{" "}
                    {answer.sources.jobs.map((job) => (
                      <Link key={job} to={`/data-integrations/history/${job}`} className="mr-1 underline">{job}</Link>
                    ))}
                    · Entities {answer.sources.entities.join(", ") || "—"} · Properties {answer.sources.properties.length > 6 ? `${answer.sources.properties.slice(0, 6).join(", ")} +${answer.sources.properties.length - 6}` : answer.sources.properties.join(", ") || "—"} · Periods {answer.sources.periods.join(", ") || "—"}
                  </>
                )}
              </dd>
            </div>
          </dl>
        </Section>
      ))}
    </div>
  );
}
