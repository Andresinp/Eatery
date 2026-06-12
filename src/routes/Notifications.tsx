import { useEffect } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useNotifications, type Notification } from "../store/notifications";

const ICON: Record<Notification["type"], string> = {
  booking_confirmed: "✅",
  booking_received: "📩",
  order_cancelled: "✖",
  reminder: "⏰",
  message: "💬",
  review_request: "★",
  no_show: "⚠",
  system: "✨",
};

export default function Notifications() {
  const items = useNotifications((s) => s.items);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const markRead = useNotifications((s) => s.markRead);

  useEffect(() => {
    const t = setTimeout(markAllRead, 600);
    return () => clearTimeout(t);
  }, [markAllRead]);

  const groups = groupByDay(items);

  return (
    <div className="min-h-full bg-cream-50 pb-10">
      <TopBar back title="Notifications" />

      <div className="max-w-[640px] mx-auto px-4 pt-2">
        {items.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/25 p-10 text-center">
            <div className="font-display font-extrabold text-2xl mb-1">
              You're all caught up
            </div>
            <p className="text-ink/60">
              Booking updates, reminders, and messages land here.
            </p>
          </div>
        ) : (
          groups.map(([day, list]) => (
            <div key={day} className="mb-6">
              <div className="text-xs uppercase tracking-wider text-ink/50 font-semibold mb-2 px-1">
                {day}
              </div>
              <div className="space-y-2">
                {list.map((n) => (
                  <NotifRow key={n.id} n={n} onClick={() => markRead(n.id)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotifRow({ n, onClick }: { n: Notification; onClick: () => void }) {
  const inner = (
    <div
      onClick={onClick}
      className={
        "flex gap-3 p-4 rounded-2xl border-2 transition " +
        (n.read
          ? "bg-white border-ink/15"
          : "bg-amber/15 border-amber/60 shadow-float")
      }
    >
      <div className="w-10 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center text-lg flex-none">
        {ICON[n.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-display font-bold text-base leading-tight">{n.title}</div>
          {!n.read && <span className="w-2 h-2 rounded-full bg-amber-deep" />}
        </div>
        <div className="text-sm text-ink/75 mt-0.5">{n.body}</div>
        <div className="text-[11px] text-ink/50 mt-1">{timeAgo(n.created_at)}</div>
      </div>
    </div>
  );
  if (n.data?.order_id) {
    return <Link to={`/orders/${n.data.order_id}`}>{inner}</Link>;
  }
  return inner;
}

function groupByDay(items: Notification[]): [string, Notification[]][] {
  const map = new Map<string, Notification[]>();
  for (const n of items) {
    const d = new Date(n.created_at);
    const today = new Date();
    let key = d.toLocaleDateString();
    if (sameDay(d, today)) key = "Today";
    else if (sameDay(d, addDays(today, -1))) key = "Yesterday";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }
  return Array.from(map.entries());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
