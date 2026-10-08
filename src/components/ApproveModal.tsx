import { AlertTriangle, X } from 'lucide-react';

interface ApproveModalProps {
  open: boolean;
  vendor: string;
  amount: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ApproveModal({ open, vendor, amount, onCancel, onConfirm }: ApproveModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-navy/40" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-[70] w-[440px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-600" />
            <h3 className="text-base font-semibold text-navy-deep">Confirm Approval</h3>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1 text-slate-label transition hover:bg-ivory">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-navy">
            Approve <span className="font-bold">{amount}</span> payment to <span className="font-bold">{vendor}</span>?
          </p>
          <p className="mt-2 text-xs text-slate-label">This cannot be undone.</p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy transition hover:bg-ivory"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition hover:bg-goldLight"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
