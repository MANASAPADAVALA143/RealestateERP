import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { useAlerts } from "../hooks.ts";
import type { AlertModule } from "../types.ts";

interface AlertBannerProps {
  module: AlertModule;
}

export function AlertBanner({ module }: AlertBannerProps) {
  const { alerts, loading } = useAlerts();

  if (loading) return null;

  const moduleAlerts = alerts.filter((a) => a.module === module);
  if (moduleAlerts.length === 0) return null;

  const criticals = moduleAlerts.filter((a) => a.severity === "Critical");
  const warnings  = moduleAlerts.filter((a) => a.severity === "Warning");

  // Pick highest severity present
  const topAlert = criticals[0] ?? warnings[0] ?? moduleAlerts[0];
  const isCritical = topAlert.severity === "Critical";
  const isWarning  = topAlert.severity === "Warning";

  const cfg = isCritical
    ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: AlertCircle,   link: "text-red-600 hover:text-red-800" }
    : isWarning
    ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: AlertTriangle, link: "text-amber-600 hover:text-amber-800" }
    : { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-blue-700", icon: Info,          link: "text-blue-600 hover:text-blue-800"  };

  const Icon = cfg.icon;
  const extra = moduleAlerts.length - 1;

  return (
    <div className={`flex items-center gap-3 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3`}>
      <Icon className={`h-4 w-4 shrink-0 ${cfg.text}`} />
      <p className={`flex-1 text-sm ${cfg.text}`}>
        <span className="font-semibold">{topAlert.message}</span>
        {extra > 0 && <span className="ml-1 opacity-70">+{extra} more alert{extra !== 1 ? "s" : ""}</span>}
      </p>
      <Link
        to="/rental-os/alerts"
        className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${cfg.link} transition-colors`}
      >
        View all <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
