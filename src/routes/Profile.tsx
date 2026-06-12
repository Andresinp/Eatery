import { useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { Chip } from "../components/Chip";
import { useProfile } from "../store/profile";
import { useHost } from "../store/hostListings";
import { useOrders } from "../store/orders";

export default function Profile() {
  const me = useProfile((s) => s.me);
  const update = useProfile((s) => s.update);
  const hosted = useHost((s) => s.myListings).length;
  const orders = useOrders((s) => s.orders);
  const attended = orders.filter((o) => o.status === "completed").length;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: me.name, bio: me.bio });

  const save = () => {
    update({ name: draft.name.trim() || "You", bio: draft.bio.trim() });
    setEditing(false);
  };

  return (
    <div className="min-h-full bg-cream-50 pb-10">
      <TopBar back title="Your profile" />

      <div className="max-w-[640px] mx-auto px-4 pt-2 space-y-5">
        <div className="rounded-3xl border-2 border-ink/90 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <img
              src={me.avatar}
              alt={me.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-ink flex-none"
            />
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full font-display font-extrabold text-2xl bg-cream-50 border border-ink/20 rounded-lg px-2 py-1"
                />
              ) : (
                <div className="font-display font-extrabold text-2xl leading-tight">
                  {me.name || "You"}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {me.phone_verified && <Chip variant="leaf">📞 Phone ✓</Chip>}
                {me.identity_verified && <Chip variant="leaf">🪪 ID ✓</Chip>}
                {!me.phone_verified && !me.identity_verified && (
                  <Chip>Unverified — add phone in Settings</Chip>
                )}
              </div>
            </div>
            <button
              onClick={() => (editing ? save() : setEditing(true))}
              className="px-3 py-1.5 rounded-full border-2 border-ink text-sm font-semibold flex-none"
            >
              {editing ? "Save" : "Edit"}
            </button>
          </div>

          {editing ? (
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              rows={3}
              placeholder="A few words about yourself."
              className="mt-4 w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink resize-none"
            />
          ) : (
            me.bio && <p className="mt-4 text-sm text-ink/80 leading-relaxed">{me.bio}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Meals hosted" value={hosted} />
          <Stat label="Meals attended" value={attended} />
          <Stat label="Host rating" value="—" />
          <Stat label="Guest rating" value="—" />
        </div>

        <div className="rounded-2xl border-2 border-ink/90 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-ink/60 mb-2">
            Your dietary preferences
          </div>
          <div className="flex flex-wrap gap-1.5">
            {me.dietary_prefs.length === 0 ? (
              <span className="text-sm text-ink/50">None set</span>
            ) : (
              me.dietary_prefs.map((t) => <Chip key={t} variant="leaf">{t}</Chip>)
            )}
          </div>
          <div className="text-xs uppercase tracking-wider text-ink/60 mt-4 mb-2">
            Allergens you avoid
          </div>
          <div className="flex flex-wrap gap-1.5">
            {me.allergen_exclusions.length === 0 ? (
              <span className="text-sm text-ink/50">None set</span>
            ) : (
              me.allergen_exclusions.map((t) => <Chip key={t} variant="amber">{t}</Chip>)
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            to="/settings"
            className="flex-1 py-3 rounded-2xl border-2 border-ink font-semibold text-center"
          >
            Settings
          </Link>
          <Link
            to="/host"
            className="flex-1 py-3 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold text-center"
          >
            Switch to host
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border-2 border-ink/90 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wider text-ink/60">{label}</div>
      <div className="font-display font-extrabold text-2xl mt-0.5">{value}</div>
    </div>
  );
}
