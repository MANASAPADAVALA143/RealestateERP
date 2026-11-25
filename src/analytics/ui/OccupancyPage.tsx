import { useOccupancy } from "../hooks.ts";


const STATUS_TEXT: Record<string, string> = {
  Occupied: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Notice:   "text-amber-700 bg-amber-50 border-amber-200",
  Vacant:   "text-red-700 bg-red-50 border-red-200",
};

export function OccupancyPage() {
  const { data, rate, loading } = useOccupancy();

  const occupied = data.filter((r) => r.status === "Occupied").length;
  const notice   = data.filter((r) => r.status === "Notice").length;
  const vacant   = data.filter((r) => r.status === "Vacant").length;

  // Group by property
  const byProp: Record<string, typeof data> = {};
  data.forEach((r) => {
    if (!byProp[r.property]) byProp[r.property] = [];
    byProp[r.property].push(r);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-[#0A1628]">Occupancy Heatmap</h2>
        <p className="mt-0.5 text-sm text-[#0A1628]/50">Unit-level occupancy status across all properties</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C79A2B]/30 border-t-[#C79A2B]" />
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Occupancy Rate",  value: `${rate}%`,         color: rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-red-600" },
              { label: "Occupied Units",  value: String(occupied),    color: "text-emerald-600" },
              { label: "Notice Period",   value: String(notice),      color: "text-amber-600" },
              { label: "Vacant Units",    value: String(vacant),      color: "text-red-600" },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-white border border-black/5 shadow-sm p-4">
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="mt-0.5 text-sm text-[#0A1628]/50">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Occupancy bar */}
          {data.length > 0 && (
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
              <p className="mb-2 text-sm font-semibold text-[#0A1628]">Portfolio Breakdown</p>
              <div className="flex h-5 w-full overflow-hidden rounded-full">
                {[
                  { pct: occupied / data.length, color: "bg-emerald-500" },
                  { pct: notice   / data.length, color: "bg-amber-400" },
                  { pct: vacant   / data.length, color: "bg-red-400" },
                ].filter((s) => s.pct > 0).map((s, i) => (
                  <div key={i} className={`${s.color} transition-all`} style={{ width: `${s.pct * 100}%` }} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#0A1628]/60">
                {[{ label: "Occupied", color: "bg-emerald-500" }, { label: "Notice Period", color: "bg-amber-400" }, { label: "Vacant", color: "bg-red-400" }].map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${l.color}`} />{l.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Heatmap by property */}
          {Object.keys(byProp).length > 0 ? (
            Object.entries(byProp).map(([prop, units]) => (
              <div key={prop} className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
                <p className="mb-3 text-sm font-semibold text-[#0A1628]">{prop}</p>
                <div className="flex flex-wrap gap-2">
                  {units.map((u) => (
                    <div
                      key={u.unit}
                      title={`${u.unit} — ${u.status}`}
                      className={`flex h-10 w-20 items-center justify-center rounded-lg border text-xs font-medium ${STATUS_TEXT[u.status]}`}
                    >
                      {u.unit}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#0A1628]/40">
                  {units.filter((u) => u.status !== "Vacant").length}/{units.length} occupied
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0A1628]/10 py-16 text-center">
              <p className="text-sm text-[#0A1628]/40">No unit data found. Units registered in the AR module will appear here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
