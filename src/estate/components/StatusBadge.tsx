import type { AuditStatus } from '@/estate/lib/demoData';

const styles: Record<AuditStatus, string> = {
  Active: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
  Pending: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
  Overdue: 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]',
};

export function StatusBadge({ status }: { status: AuditStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
