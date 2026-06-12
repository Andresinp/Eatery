import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useOrders } from "../store/orders";
import { useMessages } from "../store/messages";

const ME_ID = "me";

export default function Chat() {
  const { order_id = "" } = useParams();
  const order = useOrders((s) => s.getById(order_id));
  const messages = useMessages((s) => s.byOrder[order_id] ?? []);
  const send = useMessages((s) => s.send);
  const seedFromHost = useMessages((s) => s.seedFromHost);

  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (order) {
      seedFromHost(order.id, order.listing_snapshot.host_name, order.listing_snapshot.host_name);
    }
  }, [order, seedFromHost]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!order) {
    return (
      <div className="min-h-full">
        <TopBar back title="Chat" />
        <div className="p-6 text-ink/70">
          Chat unlocks once you have a confirmed order.{" "}
          <Link className="underline" to="/orders">Your orders</Link>
        </div>
      </div>
    );
  }

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    send(order.id, ME_ID, v);
    setText("");
    setTimeout(() => {
      const replies = [
        "Got it, thanks!",
        "Sounds great — see you then.",
        "I'll keep that in mind.",
        "Perfect, looking forward to it.",
      ];
      send(order.id, order.listing_snapshot.host_name, replies[Math.floor(Math.random() * replies.length)]);
    }, 900);
  };

  return (
    <div className="min-h-full flex flex-col bg-cream-50">
      <TopBar back />
      <div className="px-4 pt-1 pb-3 border-b border-ink/10 bg-cream-50">
        <div className="max-w-[680px] mx-auto flex items-center gap-3">
          <img
            src={order.listing_snapshot.host_avatar}
            alt={order.listing_snapshot.host_name}
            className="w-10 h-10 rounded-full object-cover border border-ink/20 flex-none"
          />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold leading-tight">
              {order.listing_snapshot.host_name}
            </div>
            <div className="text-xs text-ink/60 truncate">
              {order.listing_snapshot.title} · {order.listing_snapshot.when}
            </div>
          </div>
          <Link
            to={`/orders/${order.id}`}
            className="px-3 py-1.5 rounded-full border-2 border-ink text-xs font-semibold"
          >
            Order
          </Link>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-[680px] mx-auto space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-sm text-ink/50 py-10">
              Say hi to {order.listing_snapshot.host_name}.
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === ME_ID;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[78%] px-4 py-2.5 rounded-2xl border-2 " +
                    (mine
                      ? "bg-ink text-cream-50 border-ink rounded-br-md"
                      : "bg-white text-ink border-ink/15 rounded-bl-md")
                  }
                >
                  <div className="text-sm leading-snug whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="border-t border-ink/10 bg-cream-50 p-3">
        <div className="max-w-[680px] mx-auto flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Write a message…"
            className="flex-1 px-3 py-2.5 rounded-2xl border-2 border-ink/30 bg-white focus:outline-none focus:border-ink resize-none max-h-32"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="w-11 h-11 rounded-full border-2 border-ink bg-ink text-cream-50 grid place-items-center disabled:opacity-40 flex-none"
            aria-label="Send"
          >
            →
          </button>
        </div>
      </footer>
    </div>
  );
}
