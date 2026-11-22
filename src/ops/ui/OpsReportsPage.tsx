import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useCosts, useRequests, useWorkOrders } from "../hooks.ts";
import { StatCard, LoadingSpinner, inr } from "./shared.tsx";
import { DollarSign, Wrench, ClipboardCheck, TrendingUp } from "lucide-react";

const COLORS = ["#C79A2B", "#0A1628", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function OpsReportsPage() {
  const { data: costs, loading: costsLoading } = useCosts();
  const { data: requests, loading: reqLoading } = useRequests();
  const { data: workOrders, loading: woLoading } = useWorkOrders();

  const loading = costsLoading || reqLoading || woLoading;

  const totalCost = useMemo(() => costs.reduce((s, c) => s + c.amount, 0), [costs]);
  const totalWoCost = useMemo(() => workOrders.reduce((s, w) => s + w.actualCost, 0), [workOrders]);

  const costByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of costs) map.set(c.costType, (map.get(c.costType) ?? 0) + c.amount);
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [costs]);

  const costByProperty = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of costs) map.set(c.propertyName, (map.get(c.propertyName) ?? 0) + c.amount);
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [costs]);

  const reqByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) map.set(r.category, (map.get(r.category) ?? 0) + 1);
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [requests]);

  const reqByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [requests]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-[#0A1628]">Operations Reports</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Ops Cost" value={inr(totalCost)} icon={DollarSign} color="gold" />
        <StatCard label="Work Order Spend" value={inr(totalWoCost)} icon={ClipboardCheck} color="navy" />
        <StatCard label="Total Requests" value={requests.length} icon={Wrench} color="green" />
        <StatCard label="Total Work Orders" value={workOrders.length} icon={TrendingUp} color="navy" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cost by Type */}
        {costByType.length > 0 && (
          <div className="shadow-card rounded-2xl bg-white p-5">
            <h3 className="mb-4 font-semibold text-navy">Cost by Type</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={costByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {costByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => inr(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost by Property */}
        {costByProperty.length > 0 && (
          <div className="shadow-card rounded-2xl bg-white p-5">
            <h3 className="mb-4 font-semibold text-navy">Cost by Property</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costByProperty} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tickFormatter={(v) => inr(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v) => inr(v as number)} />
                <Bar dataKey="value" fill="#C79A2B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Requests by Category */}
        {reqByCategory.length > 0 && (
          <div className="shadow-card rounded-2xl bg-white p-5">
            <h3 className="mb-4 font-semibold text-navy">Requests by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reqByCategory}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0A1628" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Requests by Status */}
        {reqByStatus.length > 0 && (
          <div className="shadow-card rounded-2xl bg-white p-5">
            <h3 className="mb-4 font-semibold text-navy">Requests by Status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={reqByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {reqByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Cost detail table */}
      {costs.length > 0 && (
        <div className="shadow-card rounded-2xl bg-white p-5">
          <h3 className="mb-4 font-semibold text-navy">Recent Cost Entries</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["Date", "Property", "Cost Type", "Description", "Vendor", "Amount"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {[...costs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8F6F0]/40">
                    <td className="px-4 py-2 text-navy/60">{c.date}</td>
                    <td className="px-4 py-2 text-navy">{c.propertyName}</td>
                    <td className="px-4 py-2 text-navy/70">{c.costType}</td>
                    <td className="px-4 py-2 text-navy/70 max-w-xs truncate">{c.description}</td>
                    <td className="px-4 py-2 text-navy/60">{c.vendorId ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-[#C79A2B]">{inr(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {costs.length === 0 && requests.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-navy/15 py-16 text-center">
          <TrendingUp className="mx-auto mb-3 h-8 w-8 text-navy/20" />
          <p className="text-sm text-navy/40">No operational data yet. Create maintenance requests and record costs to see reports.</p>
        </div>
      )}
    </div>
  );
}
