import { useRevExpTrend } from "../hooks.ts";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

function inr(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function fmtMonth(mo: string) {
  const [yr, m] = mo.split("-");
  return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${yr.slice(2)}`;
}

function downloadCsv(rows: { month: string; revenue: number; expenses: number; net: number }[]) {
  const header = "Month,Revenue,Expenses,Net Income";
  const lines = rows.map((r) => `"${r.month}",${r.revenue},${r.expenses},${r.net}`);
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "revenue_expense_trend.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function RevExpTrendPage() {
  const { data, loading } = useRevExpTrend();
  const chartData = data.map((r) => ({ ...r, month: fmtMonth(r.month) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#0A1628]">Revenue vs Expense Trend</h2>
          <p className="mt-0.5 text-sm text-[#0A1628]/50">Monthly posted journal movements</p>
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
          <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0A1628" strokeOpacity={0.06} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 11 }} width={85} />
                  <Tooltip formatter={(v, name) => [inr(Number(v)), String(name)]} />
                  <Legend />
                  <Bar dataKey="revenue"  name="Revenue"  fill="#22c55e" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} barSize={18} />
                  <Line dataKey="net" name="Net Income" stroke="#C79A2B" strokeWidth={2} dot={{ r: 3 }} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-[#0A1628]/40">No posted journals found. Post journal entries to see trends.</p>
            )}
          </div>

          {chartData.length > 0 && (
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#0A1628]/4 text-xs font-semibold uppercase tracking-wide text-[#0A1628]/50">
                  <tr>
                    <th className="px-5 py-3 text-left">Month</th>
                    <th className="px-5 py-3 text-right">Revenue</th>
                    <th className="px-5 py-3 text-right">Expenses</th>
                    <th className="px-5 py-3 text-right">Net Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.map((r) => (
                    <tr key={r.month} className="hover:bg-[#0A1628]/2">
                      <td className="px-5 py-3 font-medium text-[#0A1628]">{fmtMonth(r.month)}</td>
                      <td className="px-5 py-3 text-right text-emerald-700 font-semibold">{inr(r.revenue)}</td>
                      <td className="px-5 py-3 text-right text-orange-600 font-semibold">{inr(r.expenses)}</td>
                      <td className={`px-5 py-3 text-right font-bold ${r.net >= 0 ? "text-emerald-700" : "text-red-600"}`}>{inr(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
