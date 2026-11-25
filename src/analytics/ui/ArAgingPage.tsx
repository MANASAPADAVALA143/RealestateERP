import { useArAging } from "../hooks.ts";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function inr(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

const COLORS = ["#22c55e", "#f59e0b", "#f97316", "#ef4444"];

function downloadCsv(rows: { bucket: string; count: number; amount: number }[]) {
  const header = "Aging Bucket,Invoice Count,Amount (INR)";
  const lines = rows.map((r) => `"${r.bucket}",${r.count},${r.amount}`);
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "ar_aging.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function ArAgingPage() {
  const { data, loading } = useArAging();
  const total = data.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#0A1628]">AR Aging Report</h2>
          <p className="mt-0.5 text-sm text-[#0A1628]/50">Outstanding receivables by age bucket</p>
        </div>
        <button
          onClick={() => downloadCsv(data)}
          className="rounded-xl border border-[#0A1628]/20 bg-white px-4 py-2 text-sm font-medium text-[#0A1628] hover:border-[#C79A2B] hover:text-[#C79A2B] transition-colors"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C79A2B]/30 border-t-[#C79A2B]" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {data.map((r, i) => (
              <div key={r.bucket} className="rounded-2xl bg-white border border-black/5 shadow-sm p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0A1628]/40">{r.bucket}</p>
                <p className="mt-1 text-xl font-bold text-[#0A1628]">{inr(r.amount)}</p>
                <p className="text-xs text-[#0A1628]/50">{r.count} invoice{r.count !== 1 ? "s" : ""}</p>
                <div className="mt-2 h-1 rounded-full bg-gray-100">
                  <div className="h-1 rounded-full" style={{ width: total ? `${(r.amount / total) * 100}%` : "0%", backgroundColor: COLORS[i] }} />
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6">
            <h3 className="mb-4 text-sm font-semibold text-[#0A1628]">Amount by Aging Bucket</h3>
            {data.some((r) => r.amount > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} barSize={48}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-[#0A1628]/40">No outstanding AR invoices found.</p>
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0A1628]/4 text-xs font-semibold uppercase tracking-wide text-[#0A1628]/50">
                <tr>
                  <th className="px-5 py-3 text-left">Aging Bucket</th>
                  <th className="px-5 py-3 text-right">Invoice Count</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data.map((r) => (
                  <tr key={r.bucket} className="hover:bg-[#0A1628]/2">
                    <td className="px-5 py-3 font-medium text-[#0A1628]">{r.bucket}</td>
                    <td className="px-5 py-3 text-right text-[#0A1628]/70">{r.count}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#0A1628]">{inr(r.amount)}</td>
                    <td className="px-5 py-3 text-right text-[#0A1628]/50">{total ? `${((r.amount / total) * 100).toFixed(1)}%` : "—"}</td>
                  </tr>
                ))}
                <tr className="bg-[#0A1628]/4 font-semibold">
                  <td className="px-5 py-3 text-[#0A1628]">Total</td>
                  <td className="px-5 py-3 text-right text-[#0A1628]">{data.reduce((s, r) => s + r.count, 0)}</td>
                  <td className="px-5 py-3 text-right text-[#0A1628]">{inr(total)}</td>
                  <td className="px-5 py-3 text-right text-[#0A1628]">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
