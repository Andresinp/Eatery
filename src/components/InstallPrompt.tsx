import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "eatery-install-dismissed-at";
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissed < DISMISS_TTL_MS) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setOpen(false);
    setEvt(null);
  };

  if (!open || !evt) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[360px]">
      <div className="rounded-2xl border-2 border-ink bg-cream-50 shadow-sheet p-4 flex items-start gap-3 animate-slide-up">
        <div className="w-10 h-10 rounded-xl bg-amber border-2 border-ink grid place-items-center font-display font-extrabold text-lg flex-none">
          e
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base leading-tight">
            Install Eatery
          </div>
          <div className="text-xs text-ink/65">
            Add it to your home screen — opens like an app, works offline on the map.
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex-1 py-2 rounded-xl border-2 border-ink bg-ink text-cream-50 text-sm font-semibold"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-2 rounded-xl border-2 border-ink text-sm font-semibold"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
