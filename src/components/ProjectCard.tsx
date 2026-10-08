import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Circle,
  Building2,
  MapPin,
  TrendingUp,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react';
import type { ProjectData, Milestone, CostBar } from '@/lib/demoData';
import { formatAED } from '@/lib/format';

const badgeColors: Record<string, string> = {
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
};

const leakageStyles: Record<string, string> = {
  none: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-300',
  red: 'bg-red-50 text-red-700 border-red-300',
};

const leakageIcons: Record<string, typeof ShieldCheck> = {
  none: ShieldCheck,
  amber: AlertTriangle,
  red: AlertOctagon,
};

const milestoneIcons: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: 'text-green-600' },
  'in-progress': { icon: Loader2, color: 'text-gold' },
  critical: { icon: AlertTriangle, color: 'text-red-600' },
  'not-started': { icon: Circle, color: 'text-slate-300' },
};

function MiniKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-ivory px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-label">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-navy-deep">{value}</p>
      {sub && <p className="text-[11px] text-indigo-metric">{sub}</p>}
    </div>
  );
}

function MilestoneRow({ m }: { m: Milestone }) {
  const cfg = milestoneIcons[m.state];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon size={16} className={cfg.color} />
      <span className={`text-sm ${m.state === 'not-started' ? 'text-slate-label' : 'text-navy'}`}>{m.label}</span>
      <span className="ml-auto text-xs text-slate-label">{m.detail}</span>
    </div>
  );
}

function CostBarRow({ bar }: { bar: CostBar }) {
  const pct = bar.budget > 0 ? Math.min((bar.actual / bar.budget) * 100, 100) : 0;
  const colors: Record<string, string> = {
    green: 'bg-green-500',
    gold: 'bg-gold',
    red: 'bg-red-500',
    grey: 'bg-slate-400',
  };
  return (
    <div className="py-1">
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="text-navy">{bar.label}</span>
        <span className="text-slate-label">
          {formatAED(bar.actual)} / {formatAED(bar.budget)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ivory">
        <div className={`h-full rounded-full ${colors[bar.state]}`} style={{ width: `${pct}%` }} />
      </div>
      {bar.note && <p className="mt-0.5 text-[11px] text-red-600">{bar.note}</p>}
    </div>
  );
}

interface ProjectCardProps {
  project: ProjectData;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const LeakageIcon = leakageIcons[project.leakage.level];

  if (project.featured) {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:shadow-md"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-navy-deep">{project.name}</h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badgeColors[project.badgeColor]}`}>
                {project.statusBadge}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-label">
              <span className="flex items-center gap-1"><Building2 size={12} /> {project.entity}</span>
              <span className="flex items-center gap-1"><MapPin size={12} /> {project.location}</span>
              <span>{project.type}</span>
            </div>
          </div>
        </div>

        {/* Mini KPIs */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <MiniKpi label="Total Units" value={String(project.units)} />
          <MiniKpi label="Units Sold" value={String(project.unitsSold)} sub={`${project.unitsSoldPct}%`} />
          <MiniKpi label="Project Value" value={formatAED(project.value)} />
          <MiniKpi label="Handover" value={project.handover} />
        </div>

        {/* IFRS 15 section */}
        <div className="mt-4 rounded-lg border border-border bg-ivory/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-navy">IFRS 15 — % Completion Method</span>
            {project.ifrsNote && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gold ring-1 ring-gold/30">
                {project.ifrsNote}
              </span>
            )}
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-ivory ring-1 ring-border">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${project.ifrsPct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-label">
              {formatAED(project.ifrsRecognised)} recognised of {formatAED(project.value)} total
            </span>
            <span className="font-semibold text-gold">{project.ifrsPct}%</span>
          </div>
        </div>

        {/* Two columns: milestones + cost bars */}
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-label">Construction Progress</p>
            {project.milestones.map((m) => (
              <MilestoneRow key={m.label} m={m} />
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-label">Cost vs Budget</p>
            {project.costBars?.map((b) => (
              <CostBarRow key={b.label} bar={b} />
            ))}
          </div>
        </div>

        {/* Bottom links + leakage badge */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-4">
            <a href="#" className="text-[13px] font-medium text-gold transition hover:underline">View Full P&L</a>
            <a href="#" className="text-[13px] font-medium text-gold transition hover:underline">IFRS 15 Schedule</a>
            <a href="#" className="text-[13px] font-medium text-gold transition hover:underline">Contractor Bills (24)</a>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${leakageStyles[project.leakage.level]}`}>
            <LeakageIcon size={14} />
            {project.leakage.text}
          </span>
        </div>
      </div>
    );
  }

  // Standard (non-featured) card
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-navy-deep">{project.name}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeColors[project.badgeColor]}`}>
              {project.statusBadge}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-label">
            <span className="flex items-center gap-1"><Building2 size={11} /> {project.entity}</span>
            <span className="flex items-center gap-1"><MapPin size={11} /> {project.location}</span>
            <span>{project.type}</span>
          </div>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <MiniKpi label="Units" value={String(project.units)} />
        <MiniKpi label="Sold" value={String(project.unitsSold)} sub={`${project.unitsSoldPct}%`} />
        <MiniKpi label="Value" value={formatAED(project.value)} />
        <MiniKpi label="Handover" value={project.handover} />
      </div>

      {/* IFRS 15 */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-navy">IFRS 15 — % Completion</span>
          <span className="font-semibold text-gold">{project.ifrsPct}%</span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ivory ring-1 ring-border">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${project.ifrsPct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-slate-label">
          {formatAED(project.ifrsRecognised)} recognised of {formatAED(project.value)}
        </p>
        {project.ifrsNote && (
          <p className="mt-0.5 text-[11px] text-slate-label italic">{project.ifrsNote}</p>
        )}
      </div>

      {/* Milestones (compact) */}
      <div className="mt-3">
        {project.milestones.map((m) => (
          <MilestoneRow key={m.label} m={m} />
        ))}
      </div>

      {/* Cost note if any */}
      {project.costNote && (
        <p className="mt-2 text-[11px] text-red-600">{project.costNote}</p>
      )}

      {/* Bottom links + leakage badge */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <div className="flex items-center gap-3">
          <a href="#" className="text-[12px] font-medium text-gold transition hover:underline">View Full P&L</a>
          <a href="#" className="text-[12px] font-medium text-gold transition hover:underline">IFRS 15 Schedule</a>
        </div>
        <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${leakageStyles[project.leakage.level]}`}>
          <LeakageIcon size={12} />
          {project.leakage.text.replace('Revenue Leakage: ', '')}
        </span>
      </div>
    </div>
  );
}
