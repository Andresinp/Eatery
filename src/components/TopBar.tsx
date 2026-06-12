import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useNotifications } from "../store/notifications";
import { useProfile } from "../store/profile";

export default function TopBar({
  back,
  title,
  transparent,
}: {
  back?: boolean;
  title?: string;
  transparent?: boolean;
}) {
  const nav = useNavigate();
  const unread = useNotifications((s) => s.items.filter((n) => !n.read).length);
  const avatar = useProfile((s) => s.me.avatar);

  return (
    <header
      className={
        "sticky top-0 z-30 px-4 py-3 flex items-center justify-between " +
        (transparent ? "bg-transparent" : "bg-cream-50/95 backdrop-blur border-b border-ink/10")
      }
    >
      <div className="flex items-center gap-3 min-w-0">
        {back ? (
          <button
            onClick={() => nav(-1)}
            aria-label="Back"
            className="w-10 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center shadow-float flex-none"
          >
            ‹
          </button>
        ) : (
          <Link to="/" className="flex-none">
            <Logo />
          </Link>
        )}
        {title && (
          <div className="font-display font-extrabold text-lg truncate">{title}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/orders"
          className="px-3 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center text-sm font-semibold shadow-float"
        >
          Orders
        </Link>
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative w-10 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center shadow-float"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber border-2 border-ink text-[10px] font-bold text-amber-ink grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link
          to="/profile"
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-ink shadow-float flex-none"
        >
          <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
        </Link>
      </div>
    </header>
  );
}
