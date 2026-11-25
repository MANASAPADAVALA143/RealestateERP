import { useMaintCost } from "../hooks.ts";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

function inr(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

const PALETTE = ["#C79A2B", "#0A1628", "#22c55e", "#f97316", "#3b82f6", "#a855f7", "#ef4444", "#06b6d4"];

function downloadCsv(rows: { category: string; amount: number }[], total: number) {
  const header = "Category,Amount (INR),% of Total";
  const lines = rows.map((r) => `"${r.category}",${r.amount},${total ? ((r.amount / total) * 100).toFixed(1) : 0}`);
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "maintenance_costs.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function MaintCostPage() {
  const { data, total, loading } = useMaintCost();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#0A1628]">Maintenance Cost Analysis</h2>
          <p className="mt-0.5 text-sm text-[#0A1628]/50">Ops cost breakdown by category</p>
        </div>
        <button
          onClick={() => downloadCsv(data, total)}
          className="rounded-xl border border-[#0A1628]/20 bg-white px-4 py-2 text-sm font-medium text-[#0A1628] hover:border-[#C79A2B] hover:text-[#C79A2B] transition-colors"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C79A2B]/30 border-t-[#C79A2B]" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0A1628]/10 py-16 text-center">
          <p className="text-sm text-[#0A1628]/40">No cost records found. Record costs on work orders to see analysis.</p>
        </div>
      ) : (
        <>
          {/* Total banner */}
          <div className="rounded-2xl bg-[#0A1628] p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Total Maintenance Spend</p>
            <p className="mt-1 text-3xl font-bold">{inr(total)}</p>
            <p className="mt-0.5 text-sm text-white/60">{data.length} categor{data.length === 1 ? "y" : "ies"}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pie chart */}
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
              <p className="mb-2 text-sm font-semibold text-[#0A1628]">Spend by Category</p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden self-start">
              <table className="w-full text-sm">
                <thead className="bg-[#0A1628]/4 text-xs font-semibold uppercase tracking-wide text-[#0A1628]/50">
                  <tr>
                    <th className="px-5 py-3 text-left">Category</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.map((r, i) => (
                    <tr key={r.category} className="hover:bg-[#0A1628]/2">
                      <td className="px-5 py-3 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        <span className="font-medium text-[#0A1628]">{r.category}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[#0A1628]">{inr(r.amount)}</td>
                      <td className="px-5 py-3 text-right text-[#0A1628]/50">{total ? `${((r.amount / total) * 100).toFixed(1)}%` : "—"}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#0A1628]/4 font-semibold">
                    <td className="px-5 py-3 text-[#0A1628]">Total</td>
                    <td className="px-5 py-3 text-right text-[#0A1628]">{inr(total)}</td>
                    <td className="px-5 py-3 text-right text-[#0A1628]">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
