import Link from "next/link";
import { SHORT_DAYS, WEEK } from "@/lib/availability";
import type { TimeOfDay } from "@/lib/types";

const TIME_LABELS: Record<TimeOfDay, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

export interface GridCell {
  day: number;
  time: TimeOfDay;
  /** People still looking who are free in this slot. */
  free: number;
  /** Listed studies that already meet in this slot. */
  studies: number;
}

/** Days × times heat map of when students are free; each cell filters the list below. */
export function DemandGrid({
  grid,
  busiest,
  slot,
  base,
}: {
  grid: GridCell[][];
  busiest: number;
  slot: { day: number; time: TimeOfDay } | null;
  base: string;
}) {
  return (
    <div className="-mx-1">
      <table className="w-full table-fixed border-separate border-spacing-1 text-center text-sm">
        <thead>
          <tr>
            <td className="w-9 sm:w-20" />
            {WEEK.map((d) => (
              <th key={d} scope="col" className="pb-1 font-medium text-muted">
                {SHORT_DAYS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr key={row[0].time}>
              <th scope="row" className="pr-1 text-left font-medium text-muted">
                <span className="sm:hidden">{TIME_LABELS[row[0].time].slice(0, 3)}</span>
                <span className="hidden sm:inline">{TIME_LABELS[row[0].time]}</span>
              </th>
              {row.map((c) => {
                const active = slot?.day === c.day && slot.time === c.time;
                const tone =
                  c.free === 0
                    ? "bg-background text-muted"
                    : c.free === busiest
                      ? "bg-accent text-accent-ink"
                      : "bg-accent-soft text-accent";
                return (
                  <td key={c.day} className="p-0">
                    <Link
                      href={active ? base : `${base}&day=${c.day}&time=${c.time}`}
                      aria-label={`${c.free} free ${SHORT_DAYS[c.day]} ${c.time}${c.studies ? `, ${c.studies} study already meets` : ""}`}
                      aria-current={active ? "true" : undefined}
                      className={`relative flex h-11 items-center justify-center rounded-lg font-semibold ${tone} ${active ? "ring-2 ring-[var(--focus)]" : ""}`}
                    >
                      {c.free || "·"}
                      {c.studies > 0 && (
                        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-warm" aria-hidden />
                      )}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
