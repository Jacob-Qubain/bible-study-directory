import type { Leader } from "@/lib/types";

const TONES = [
  "bg-[#e2ede8] text-[#2f5d50]",
  "bg-[#f8e7dc] text-[#9a4522]",
  "bg-[#e8e4f3] text-[#4b3f7a]",
  "bg-[#f4eccb] text-[#6d5a12]",
  "bg-[#dcebf3] text-[#23536b]",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

function tone(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-lg",
};

export function Avatar({ leader, size = "md" }: { leader: Leader; size?: keyof typeof SIZES }) {
  const cls = `${SIZES[size]} shrink-0 rounded-full ring-2 ring-surface`;
  if (leader.photoUrl) {
    // Leader photos come from arbitrary hosts; a plain <img> avoids remotePatterns config.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={leader.photoUrl} alt="" className={`${cls} object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${cls} ${tone(leader.id)} inline-flex items-center justify-center font-semibold`}
    >
      {initials(leader.name)}
    </span>
  );
}

export function AvatarStack({ leaders, size = "md" }: { leaders: Leader[]; size?: keyof typeof SIZES }) {
  return (
    <span className="flex -space-x-2">
      {leaders.map((l) => (
        <Avatar key={l.id} leader={l} size={size} />
      ))}
    </span>
  );
}

export function leaderNames(leaders: Leader[]) {
  const names = leaders.map((l) => l.name.split(" ")[0]);
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
}
