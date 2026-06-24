import { useEffect } from "react";

/**
 * Small accessible confirmation modal. Used before destructive actions such as
 * deleting a listing. Renders nothing when `open` is false.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Close on Escape for keyboard / desktop users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 animate-fade-in"
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-sm m-0 sm:m-4 rounded-t-3xl sm:rounded-3xl border-2 border-ink bg-white p-5 shadow-float"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <h2 className="font-display font-extrabold text-xl leading-tight">{title}</h2>
        {body && <p className="text-sm text-ink/70 mt-2">{body}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border-2 border-ink font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              "flex-1 py-3 rounded-2xl border-2 border-ink font-semibold " +
              (destructive
                ? "bg-red-600 text-white border-red-700"
                : "bg-ink text-cream-50")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
