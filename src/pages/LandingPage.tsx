import { Link } from 'react-router-dom';
import {
  ChartPie,
  BadgeCheck,
  Landmark,
  ReceiptText,
  ArrowRight,
  Play,
  Check,
  Star,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

const modules = [
  {
    icon: ChartPie,
    iconColor: 'text-gold',
    title: 'EstateCFO Dashboard',
    desc: 'Entity-level P&L, NAV tracker, cash position, and portfolio dashboard across all your projects. AED and INR supported.',
    tags: ['Portfolio P&L', 'Multi-entity', 'NAV tracker', 'Cash position'],
  },
  {
    icon: BadgeCheck,
    iconColor: 'text-indigo-metric',
    title: 'IFRS 15 & 16',
    desc: 'Off-plan revenue recognition via % completion, SPA contract portfolio, lease schedules with CPI escalation, and journal entry automation.',
    tags: ['IFRS 15 POB', 'IFRS 16 leases', 'IFRS 9 ECL', 'Handover triggers'],
  },
  {
    icon: Landmark,
    iconColor: 'text-gold',
    title: 'Fund Management',
    desc: 'LP/GP structure, capital calls, distributions, fund-level IRR, waterfall calculations, and investor reporting.',
    tags: ['Capital calls', 'Distributions', 'IRR', 'Waterfall', 'LP reporting'],
  },
  {
    icon: ReceiptText,
    iconColor: 'text-indigo-metric',
    title: 'Accounting',
    desc: 'UAE VAT returns (residential zero-rated / commercial 5%), AP contractor invoice 3-way match, AR collections, and audit command center.',
    tags: ['GulfTax VAT', 'AP InvoiceFlow', 'AR aging', 'Audit command'],
  },
];

const steps = [
  { n: 1, title: 'Connect your projects', desc: 'Import SPA contracts, leases, and cost schedules from your existing systems.' },
  { n: 2, title: 'IFRS recognition computed', desc: 'Percentage-of-completion and POB revenue calculated automatically per project.' },
  { n: 3, title: 'VAT classified & posted', desc: 'Residential zero-rated and commercial 5% transactions categorized and posted.' },
  { n: 4, title: 'Investor report generated', desc: 'LP-level performance, IRR, and waterfall ready for quarterly distribution.' },
];

const testimonials = [
  { quote: 'EstateCFO caught AED 1.2M of revenue leakage on our off-plan portfolio in the first scan. The IFRS 15 POB engine is remarkably precise.', name: 'Khalid Al Mansoori', role: 'CFO, Marina Heights Group' },
  { quote: 'RERA escrow reconciliation used to take my team a full week. Now it is a live dashboard with overdue alerts before they become findings.', name: 'Priya Nair', role: 'Finance Director, Palm View Developments' },
  { quote: 'LP reporting went from spreadsheets to a one-click quarterly pack. Our investors finally see fund-level IRR and waterfall in real time.', name: 'Ahmed Al Rashid', role: 'Fund Manager, Desert Oasis Capital' },
];

const pricing = [
  { tier: 'Starter', price: 'AED 2,500', period: '/month', popular: false, features: ['Up to 5 projects', 'IFRS 15/16', 'Basic accounting', 'Email support'] },
  { tier: 'Professional', price: 'AED 6,000', period: '/month', popular: true, features: ['Up to 20 projects', 'IFRS 15/16/9', 'Full accounting + VAT', 'Fund management (up to 2 funds)', 'Priority support'] },
  { tier: 'Enterprise', price: 'AED 15,000', period: '/month', popular: false, features: ['Unlimited projects', 'Full platform', 'Multi-fund management', 'RERA OS integration', 'Dedicated CSM', 'Custom onboarding'] },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ivory">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <div className="hidden items-center gap-8 lg:flex">
            {['Platform', 'IFRS', 'Fund Management', 'Accounting', 'Pricing'].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-medium text-slate-label transition hover:text-navy">
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-navy transition hover:bg-ivory">
              Sign in
            </Link>
            <a href="#demo" className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition hover:bg-goldLight">
              Book Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-ivory py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full border border-gold px-4 py-1.5 text-xs font-medium text-gold">
              Built for UAE & India Real Estate
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight text-navy">
              The CFO platform built for real estate developers
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-label">
              IFRS 15/16 revenue recognition, fund management, accounting, and RERA compliance — unified in one institutional-grade platform.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <a href="#demo" className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-base font-medium text-white transition hover:bg-goldLight">
                Start free trial <ArrowRight size={18} />
              </a>
              <a href="#how" className="flex items-center gap-2 rounded-lg border border-border bg-white px-6 py-3 text-base font-medium text-navy transition hover:bg-ivory">
                <Play size={16} /> Watch demo
              </a>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-border">
              <div className="flex">
                <div className="flex w-36 flex-col gap-3 bg-navy p-3">
                  <div className="text-sm font-bold text-white">Estate<span className="text-gold">CFO</span></div>
                  {['Dashboard', 'Projects', 'Cash Flow', 'Reports'].map((s, i) => (
                    <div key={s} className={`rounded px-2 py-1.5 text-xs ${i === 0 ? 'bg-white/10 text-gold' : 'text-white/60'}`}>{s}</div>
                  ))}
                </div>
                <div className="flex-1 space-y-3 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: 'Total Assets', v: 'AED 4.68B' },
                      { l: 'Net Income', v: 'AED 312.6M' },
                      { l: 'Cash Position', v: 'AED 586.7M' },
                      { l: 'Gross IRR', v: '18.4%' },
                    ].map((k) => (
                      <div key={k.l} className="rounded-lg border border-border bg-ivory p-3">
                        <p className="text-[10px] text-slate-label">{k.l}</p>
                        <p className="text-sm font-bold text-navy">{k.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-navy">Revenue Recognition</span>
                      <span className="text-[10px] text-gold">25% recognised</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ivory">
                      <div className="h-full rounded-full bg-gold" style={{ width: '25%' }} />
                    </div>
                  </div>
                  <div className="flex items-end gap-2 rounded-lg border border-border p-3">
                    {[40, 65, 50, 80, 60, 90].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-indigo-metric/80" style={{ height: `${h}px` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics strip */}
      <section className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-7xl divide-x divide-border px-6 md:grid-cols-3">
          {[
            { v: 'AED 1.28M', l: 'Revenue leakage detected on first scan' },
            { v: '47 Leases', l: 'UAE portfolio validated on IFRS 16' },
            { v: 'AED 4.68B', l: 'Assets under management tracked' },
          ].map((m) => (
            <div key={m.l} className="border-l-4 border-gold px-6 py-8 first:border-l-4">
              <p className="text-2xl font-bold text-navy">{m.v}</p>
              <p className="mt-1 text-sm text-slate-label">{m.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="platform" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-navy">Everything a real estate CFO needs</h2>
          <p className="mt-3 text-slate-label">Four integrated modules covering the full lifecycle of property development finance.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.title} className="group relative overflow-hidden rounded-xl border border-border bg-white p-8 transition-all hover:shadow-lg hover:[border-top:3px_solid_#C79A2B]">
                <Icon className={m.iconColor} size={32} strokeWidth={1.8} />
                <h3 className="mt-4 text-xl font-semibold text-navy">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-label">{m.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {m.tags.map((t) => (
                    <span key={t} className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-navy/70">{t}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-navy">How it works</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                {i < 3 && <div className="absolute left-12 top-6 hidden h-px w-full bg-border md:block" />}
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-lg font-bold text-white">{s.n}</div>
                <h3 className="mt-4 text-base font-semibold text-navy">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-label">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-ivory py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-navy">Trusted by finance leaders</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border border-border bg-white p-6">
                <div className="mb-3 flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-gold" fill="#C79A2B" />)}
                </div>
                <p className="text-sm leading-relaxed text-navy/80">"{t.quote}"</p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-semibold text-navy">{t.name}</p>
                  <p className="text-xs text-slate-label">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-navy">Pricing</h2>
          <p className="mt-3 text-slate-label">Choose the plan that matches your portfolio scale.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {pricing.map((p) => (
            <div
              key={p.tier}
              className={`relative rounded-xl border bg-white p-8 ${p.popular ? 'border-2 border-gold shadow-lg' : 'border-border'}`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-4 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-navy">{p.tier}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-navy">{p.price}</span>
                <span className="text-sm text-slate-label">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-navy/80">
                    <Check size={16} className="text-gold" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href="#demo"
                className={`mt-8 block rounded-lg py-3 text-center text-sm font-medium transition ${
                  p.popular ? 'bg-gold text-white hover:bg-goldLight' : 'border border-border text-navy hover:bg-ivory'
                }`}
              >
                Get started
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section id="demo" className="bg-navy py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to see it with your own data?</h2>
          <p className="mt-3 text-white/60">
            30-minute live demo. We'll run IFRS 15 on your SPA portfolio and fund IRR on your capital structure.
          </p>
          <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Name"
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-gold"
            />
            <input
              type="email"
              placeholder="Email"
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-gold"
            />
            <button type="submit" className="rounded-lg bg-gold px-6 py-3 font-medium text-white transition hover:bg-goldLight">
              Book demo
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <Logo variant="light" />
              <p className="mt-2 text-sm text-white/50">Real Estate Finance Intelligence for UAE & India</p>
            </div>
            <div className="flex flex-wrap gap-6">
              {['Platform', 'IFRS', 'Fund Management', 'Pricing', 'Privacy'].map((l) => (
                <a key={l} href="#" className="text-sm text-white/60 transition hover:text-white">{l}</a>
              ))}
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
            © 2026 Gnanova Pro AI Technologies · estatecfo.gnanova.com
          </div>
        </div>
      </footer>
    </div>
  );
}
