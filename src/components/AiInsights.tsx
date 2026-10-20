import { TrendingUp, Zap } from "lucide-react";
import type { Insight } from "@/lib/demoData";

export function AiInsights({ page, insights }: { page: string; insights: Insight[] }) {
  return (
    <section className="rounded-2xl border-2 border-gold/30 bg-white p-5 shadow-card md:p-6">
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15">
          <Zap className="h-4 w-4 text-gold" aria-hidden="true" />
        </span>
        <h2 className="font-serif text-lg leading-tight text-navy">Gnanova AI — {page} Intelligence</h2>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((item) => (
          <article key={item.title} className="rounded-xl border border-gold/20 bg-gold/5 p-4">
            <div className="mb-1.5 flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-navy">{item.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-navy/70">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
