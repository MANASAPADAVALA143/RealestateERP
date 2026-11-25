import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAlerts } from "../hooks.ts";

export function NotificationBell() {
  const { criticalCount, warningCount, scanning } = useAlerts();
  const badgeCount = criticalCount + warningCount;

  return (
    <Link
      to="/rental-os/alerts"
      className="relative rounded-xl border border-navy/10 bg-white p-2 text-navy hover:border-[#C79A2B]/40 transition-colors"
      title={badgeCount > 0 ? `${badgeCount} active alert${badgeCount !== 1 ? "s" : ""}` : "No active alerts"}
    >
      <Bell className={`h-4 w-4 ${scanning ? "animate-pulse text-[#C79A2B]" : ""}`} />
      {badgeCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
