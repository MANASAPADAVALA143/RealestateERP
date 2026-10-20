import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { getBook } from "@/lib/drillData";

export function Crumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <p className="text-xs text-navy/50">
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 ? " > " : null}
          {item.to ? (
            <Link to={item.to} className="hover:text-navy">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      ))}
    </p>
  );
}

export function Attention({ items }: { items: { text: string; value?: string }[] }) {
  if (items.length === 0) return <p className="text-sm text-navy/60">Nothing in this list.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.text} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm text-navy">
          <span>{item.text}</span>
          {item.value ? <b className="shrink-0 tabular-nums">{item.value}</b> : null}
        </li>
      ))}
    </ul>
  );
}

export function CompanyFrame({ entityId, page, children }: { entityId: string; page: string; children: ReactNode }) {
  const book = getBook(entityId);
  const navigate = useNavigate();
  const location = useLocation();
  if (!book) return <p className="text-sm text-navy/70">That entity is not on this register.</p>;
  const base = `/companies/${book.entity.id}`;
  const links = [
    { to: base, label: "Company Dashboard", end: true },
    { to: `${base}/snapshot`, label: "Financial Snapshot" },
    { to: `${base}/statements`, label: "Statements" },
    { to: `${base}/loans`, label: "Loans & Notes" },
    { to: `${base}/assets`, label: "Assets" },
    { to: `${base}/insurance`, label: "Insurance" },
    { to: `${base}/ownership`, label: "Ownership" },
    { to: `${base}/capital-calls`, label: "Capital Calls" },
  ];
  return (
    <div className="space-y-5">
      <Crumb
        items={[
          { label: "Group CFO", to: "/" },
          { label: "Companies", to: "/companies" },
          { label: book.entity.code, to: base },
          { label: page },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-navy/45">{book.entity.role}</p>
          <h2 className="font-serif text-2xl text-navy">{book.entity.name}</h2>
        </div>
        <label className="text-sm text-navy/60">
          Entity
          <select
            className="ml-2 rounded-full border border-navy/15 bg-white px-3 py-1.5 font-semibold text-navy"
            value={book.entity.id}
            onChange={(event) => {
              const rest = location.pathname.replace(/^\/companies\/[^/]+/, "");
              navigate(`/companies/${event.target.value}${rest}`);
            }}
          >
            {["ARL", "PCS", "LBH", "AHS", "AFM", "PHC", "RHC", "IDT"].map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Company">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                isActive ? "bg-navy text-ivory" : "bg-white text-navy ring-1 ring-inset ring-navy/10"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}

export function useSort<T>(rows: T[]) {
  const [key, setKey] = useState<keyof T | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const sorted = key
    ? [...rows].sort((a, b) => {
        const left = a[key];
        const right = b[key];
        if (typeof left === "number" && typeof right === "number") return (left - right) * dir;
        return String(left).localeCompare(String(right)) * dir;
      })
    : rows;
  function toggle(next: keyof T) {
    if (next === key) setDir((value) => (value === 1 ? -1 : 1));
    else {
      setKey(next);
      setDir(1);
    }
  }
  return { sorted, toggle };
}

export function moneyClass(value: number): string {
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-red-700";
  return "text-navy";
}
