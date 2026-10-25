import { Link } from "react-router-dom";
import { Plug } from "lucide-react";
import { RePage } from "@/realestate/ui";

export function ReIntegrationsPage() {
  return (
    <RePage page="Integrations" title="Integrations">
      <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
        <h3 className="font-serif text-xl text-navy">QuickBooks</h3>
        <p className="mt-2 text-sm text-navy/60">Not connected. The QuickBooks sync screen has not been built in this demo yet.</p>
        <Link to="/gnanova/realestate/dashboard" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">← Back to Company Dashboard</Link>
      </section>
    </RePage>
  );
}

export function ReStubPage({ title }: { title: string }) {
  return (
    <RePage page={title} title={title}>
      <section className="flex flex-col items-center rounded-2xl border border-dashed border-navy/20 bg-white px-6 py-14 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Plug className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-serif text-2xl text-navy">Coming Soon</h3>
        <p className="mt-2 max-w-md text-sm text-navy/60">
          This module is being configured. Data will appear once your accounting system is connected.
        </p>
        <Link to="/gnanova/integrations" className="mt-5 rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white">
          Connect QuickBooks
        </Link>
      </section>
    </RePage>
  );
}
