import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";

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
        <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-ink shadow-float flex-none">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&q=80"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </header>
  );
}
