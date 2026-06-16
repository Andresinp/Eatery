import { useNavigate } from "react-router-dom";
import { useT } from "../i18n";

/**
 * Segmented switch for moving between the Guest (map) and Host views.
 *
 * - On the map ("guest" mode) it reads "Guest | Host" with Guest active;
 *   tapping Host opens the host dashboard.
 * - On the host dashboard ("host" mode) it reads "Host | Map" with Host active;
 *   tapping Map returns to the map.
 */
export default function ViewToggle({ mode }: { mode: "guest" | "host" }) {
  const nav = useNavigate();
  const t = useT();

  const isHost = mode === "host";
  const leftLabel = isHost ? t("nav.host") : t("nav.guest");
  const rightLabel = isHost ? t("nav.map") : t("nav.host");
  const onRight = () => nav(isHost ? "/" : "/host");

  return (
    <div
      role="switch"
      aria-checked={isHost}
      aria-label={`${leftLabel} / ${rightLabel}`}
      className="flex items-center gap-0.5 p-0.5 rounded-full bg-cream-50 border-2 border-ink shadow-float"
    >
      <span className="px-2.5 py-1 rounded-full bg-ink text-cream-50 text-xs font-semibold leading-none">
        {leftLabel}
      </span>
      <button
        onClick={onRight}
        className="px-2.5 py-1 rounded-full text-ink/60 text-xs font-semibold leading-none hover:text-ink transition"
      >
        {rightLabel}
      </button>
    </div>
  );
}
