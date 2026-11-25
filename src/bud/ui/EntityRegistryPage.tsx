import { useState } from "react";
import { Building2, Plus, Edit2, CheckCircle, XCircle } from "lucide-react";
import { useEntities, budService } from "../hooks.ts";
import type { LegalEntity, EntityType } from "../types.ts";

const ENTITY_TYPES: EntityType[] = [
  "Private Limited", "LLP", "Public Limited", "Partnership",
  "Sole Proprietorship", "Trust", "Other",
];

function EntityForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<LegalEntity>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    type: (initial?.type ?? "Private Limited") as EntityType,
    currency: initial?.currency ?? "INR",
    country: initial?.country ?? "India",
    registrationNumber: initial?.registrationNumber ?? "",
    taxId: initial?.taxId ?? "",
    fiscalYearStartMonth: initial?.fiscalYearStartMonth ?? 4,
    isHoldingCompany: initial?.isHoldingCompany ?? false,
    consolidationGroup: initial?.consolidationGroup ?? "",
    status: (initial?.status ?? "Active") as LegalEntity["status"],
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) { setError("Code is required."); return; }
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      await budService().upsertEntity({
        ...form,
        fiscalYearStartMonth: Number(form.fiscalYearStartMonth),
      });
      onSave();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full rounded-xl border border-navy/15 bg-[#F8F6F0] px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30";
  const lbl = "block text-xs font-semibold uppercase tracking-widest text-navy/50 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Code *</label>
          <input className={inp} value={form.code} onChange={f("code")} placeholder="GNV-RE" disabled={!!initial?.id} />
        </div>
        <div>
          <label className={lbl}>Entity Type</label>
          <select className={inp} value={form.type} onChange={f("type")}>
            {ENTITY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Legal Name *</label>
        <input className={inp} value={form.name} onChange={f("name")} placeholder="Gnanova Real Estate Pvt Ltd" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={lbl}>Currency</label>
          <input className={inp} value={form.currency} onChange={f("currency")} placeholder="INR" maxLength={3} />
        </div>
        <div>
          <label className={lbl}>Country</label>
          <input className={inp} value={form.country} onChange={f("country")} placeholder="India" />
        </div>
        <div>
          <label className={lbl}>Fiscal Year Start</label>
          <select className={inp} value={form.fiscalYearStartMonth} onChange={f("fiscalYearStartMonth")}>
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Registration No.</label>
          <input className={inp} value={form.registrationNumber} onChange={f("registrationNumber")} placeholder="U70100TG2015PTC099001" />
        </div>
        <div>
          <label className={lbl}>Tax ID (GSTIN / PAN)</label>
          <input className={inp} value={form.taxId} onChange={f("taxId")} placeholder="36AABCG1234F1Z5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Consolidation Group</label>
          <input className={inp} value={form.consolidationGroup} onChange={f("consolidationGroup")} placeholder="Gnanova Group" />
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select className={inp} value={form.status} onChange={f("status")}>
            {["Active","Inactive","Dissolved"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="holding" checked={form.isHoldingCompany}
          onChange={(e) => setForm((s) => ({ ...s, isHoldingCompany: e.target.checked }))}
          className="h-4 w-4 rounded border-navy/20 accent-[#C79A2B]" />
        <label htmlFor="holding" className="text-sm text-navy">This is the holding / group company</label>
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea className={inp} value={form.notes} onChange={f("notes")} rows={2} placeholder="Optional notes" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-[#C79A2B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#b8891e] disabled:opacity-50">
          {saving ? "Saving…" : initial?.id ? "Update Entity" : "Create Entity"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-navy/15 px-5 py-2 text-sm font-semibold text-navy/60 hover:border-navy/30">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function EntityRegistryPage() {
  const { data: entities, loading, refresh } = useEntities();
  const [mode, setMode] = useState<"list" | "new" | "edit">("list");
  const [editing, setEditing] = useState<LegalEntity | undefined>();

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C79A2B] border-t-transparent" />
    </div>
  );

  if (mode === "new" || mode === "edit") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">{mode === "new" ? "New Legal Entity" : "Edit Entity"}</h1>
          <p className="mt-1 text-sm text-navy/60">Legal entities are the top-level financial reporting units in your portfolio.</p>
        </div>
        <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm">
          <EntityForm
            initial={editing}
            onSave={() => { refresh(); setMode("list"); setEditing(undefined); }}
            onCancel={() => { setMode("list"); setEditing(undefined); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-[#0A1628]">Entity Registry</h1>
          <p className="mt-1 text-sm text-navy/60">
            {entities?.length ?? 0} legal entit{(entities?.length ?? 0) !== 1 ? "ies" : "y"} in this portfolio
          </p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setMode("new"); }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e]">
          <Plus className="h-4 w-4" /> Add Entity
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(entities ?? []).map((entity) => (
          <div key={entity.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C79A2B]/10">
                  <Building2 className="h-5 w-5 text-[#C79A2B]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#C79A2B]">{entity.code}</p>
                  <p className="font-semibold text-navy">{entity.name}</p>
                </div>
              </div>
              <button
                onClick={() => { setEditing(entity); setMode("edit"); }}
                className="text-navy/40 hover:text-[#C79A2B] transition-colors">
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-navy/5 pt-4 text-xs">
              <div>
                <p className="text-navy/40 uppercase tracking-widest">Type</p>
                <p className="mt-0.5 font-medium text-navy">{entity.type}</p>
              </div>
              <div>
                <p className="text-navy/40 uppercase tracking-widest">Currency</p>
                <p className="mt-0.5 font-medium text-navy">{entity.currency}</p>
              </div>
              <div>
                <p className="text-navy/40 uppercase tracking-widest">Fiscal Year</p>
                <p className="mt-0.5 font-medium text-navy">
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][entity.fiscalYearStartMonth - 1]} start
                </p>
              </div>
              <div>
                <p className="text-navy/40 uppercase tracking-widest">Status</p>
                <span className={`inline-flex items-center gap-1 font-medium ${entity.status === "Active" ? "text-emerald-600" : "text-red-500"}`}>
                  {entity.status === "Active" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {entity.status}
                </span>
              </div>
            </div>

            {(entity.registrationNumber || entity.taxId) && (
              <div className="mt-3 border-t border-navy/5 pt-3 text-xs text-navy/50 space-y-0.5">
                {entity.registrationNumber && <p>Reg: {entity.registrationNumber}</p>}
                {entity.taxId && <p>Tax ID: {entity.taxId}</p>}
              </div>
            )}

            {entity.isHoldingCompany && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#C79A2B]/10 px-2 py-0.5 text-xs font-semibold text-[#C79A2B]">
                Holding Company
              </div>
            )}
          </div>
        ))}
      </div>

      {(entities?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-navy/10 bg-white py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-navy/20" />
          <p className="mt-3 text-sm font-semibold text-navy">No entities yet</p>
          <p className="mt-1 text-sm text-navy/50">Add your legal entities to begin multi-entity financial management.</p>
          <button onClick={() => setMode("new")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e]">
            <Plus className="h-4 w-4" /> Add First Entity
          </button>
        </div>
      )}
    </div>
  );
}
