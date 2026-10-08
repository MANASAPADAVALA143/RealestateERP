import { useState } from 'react';
import { Plus, FileDown, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectDrawer } from '@/components/ProjectDrawer';
import { projects, projectSummaryCards, type ProjectData } from '@/lib/demoData';

type StatusFilter = 'All' | 'Active' | 'On Schedule' | 'Delayed' | 'Critical' | 'Completed';
type TypeFilter = 'All' | 'Residential' | 'Commercial' | 'Mixed Use';
type EntityFilter = 'All Entities' | 'Dubai Holdings' | 'Marina Heights LLC' | 'Palm View Residences' | 'Desert Oasis Fund I';
type SortBy = '% Completion' | 'Revenue' | 'Value' | 'Name';

const statusOptions: StatusFilter[] = ['All', 'Active', 'On Schedule', 'Delayed', 'Critical', 'Completed'];
const typeOptions: TypeFilter[] = ['All', 'Residential', 'Commercial', 'Mixed Use'];
const entityOptions: EntityFilter[] = ['All Entities', 'Dubai Holdings', 'Marina Heights LLC', 'Palm View Residences', 'Desert Oasis Fund I'];
const sortOptions: SortBy[] = ['% Completion', 'Revenue', 'Value', 'Name'];

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-navy outline-none transition focus:border-gold"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

export function ProjectsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('All Entities');
  const [sortBy, setSortBy] = useState<SortBy>('% Completion');

  const filtered = projects.filter((p) => {
    if (statusFilter !== 'All' && statusFilter !== 'Active') {
      if (statusFilter === 'Completed' && p.status !== 'Completed') return false;
      if (statusFilter !== 'Completed' && p.status !== statusFilter) return false;
    }
    if (statusFilter === 'Active' && p.status === 'Completed') return false;
    if (typeFilter !== 'All' && p.type !== typeFilter) return false;
    if (entityFilter !== 'All Entities' && p.entity !== entityFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case '% Completion': return b.ifrsPct - a.ifrsPct;
      case 'Revenue': return b.ifrsRecognised - a.ifrsRecognised;
      case 'Value': return b.value - a.value;
      case 'Name': return a.name.localeCompare(b.name);
    }
  });

  const featured = sorted.find((p) => p.featured);
  const rest = sorted.filter((p) => !p.featured);

  const handleCardClick = (_p: ProjectData) => setDrawerOpen(true);

  return (
    <AppShell>
      <div className="px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-deep">Projects</h1>
            <p className="mt-1 text-sm text-slate-label">
              Track construction progress, revenue recognition, and IFRS 15 compliance across all active developments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-navy transition hover:bg-ivory">
              <FileDown size={15} /> Export
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition hover:bg-goldLight">
              <Plus size={16} /> Add Project
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          {projectSummaryCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-label">{c.label}</p>
              <p className="mt-1.5 text-2xl font-bold text-navy-deep">{c.value}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-indigo-metric">
                {c.subtitle.includes('↑') && <TrendingUp size={12} />}
                {c.subtitle}
              </p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="mt-6 flex items-center gap-6 rounded-xl border border-border bg-white px-5 py-3">
          <FilterSelect label="Status" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
          <FilterSelect label="Type" value={typeFilter} options={typeOptions} onChange={setTypeFilter} />
          <FilterSelect label="Entity" value={entityFilter} options={entityOptions} onChange={setEntityFilter} />
          <FilterSelect label="Sort by" value={sortBy} options={sortOptions} onChange={setSortBy} />
        </div>

        {/* Project cards */}
        <div className="mt-6 space-y-5">
          {featured && <ProjectCard project={featured} onClick={() => handleCardClick(featured)} />}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-5">
              {rest.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => handleCardClick(p)} />
              ))}
            </div>
          )}
          {sorted.length === 0 && (
            <div className="rounded-xl border border-border bg-white py-20 text-center text-slate-label">
              No projects match your filters.
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <ProjectDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </AppShell>
  );
}
