import { DAY_NAMES, formatClock } from "../schedule";
import type { Tag } from "../types";

/** "an hour and a half", "45 minutes", "two hours" */
function spokenDuration(minutes: number) {
  const words = ["", "an hour", "two hours", "three hours"];
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} minutes`;
  if (rest === 0) return words[hours] ?? `${hours} hours`;
  if (rest === 30) return hours === 1 ? "an hour and a half" : `${words[hours].replace(" hours", "")} and a half hours`;
  return `${words[hours] ?? `${hours} hours`} and ${rest} minutes`;
}

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/**
 * A friendly first draft of "What to expect", built from the study's name and
 * the details already in the editor. Leaders are expected to edit it; it only
 * states things the form actually says.
 */
export function draftDescription(form: FormData, tags: Tag[]): string {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const title = get("title") || "This study";
  const curriculum = get("curriculum");
  const format = get("format");
  const place = get("locationName");
  const food = get("food");
  const capacity = Number(get("capacity")) || null;
  const duration = Number(get("duration")) || null;
  const time = get("time");
  const date = get("date");
  const biweekly = get("cadence") === "biweekly";
  const picked = new Set(form.getAll("tags").map(String));
  const chosen = tags.filter((t) => picked.has(t.slug));

  const sentences: string[] = [];

  // Who it's for, and what you'll read.
  const audience = chosen
    .filter((t) => t.category === "audience" && t.slug !== "co-ed")
    .map((t) => t.label.toLowerCase());
  const forWhom = audience.length ? ` for ${listJoin(audience)}` : " open to everyone";
  // Skip the reading when the name already says it ("1 Corinthians" reading 1 Corinthians).
  const named = curriculum && title.toLowerCase().includes(curriculum.toLowerCase());
  const reading = curriculum && !named ? `, working through ${curriculum}` : "";
  sentences.push(`${title} is a${biweekly ? "n every-other-week" : " weekly"} Bible study${forWhom}${reading}.`);

  // When and where.
  const weekday = date ? DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()] : null;
  const where =
    format === "online" ? `on ${place || "a video call"}` : place ? `at ${place}` : null;
  const meeting = [
    weekday && (biweekly ? `every other ${weekday}` : `on ${weekday}s`),
    time && `at ${formatClock(time)}`,
    where,
  ].filter(Boolean);
  if (meeting.length) {
    const online = format === "hybrid" ? ", with the option to join online," : "";
    // "at Newman Center, Room 214, and wrap up" needs the closing comma.
    const pause = where?.includes(",") && !online ? "," : "";
    const length = duration ? `${pause} and wrap up after about ${spokenDuration(duration)}` : "";
    sentences.push(`We meet ${meeting.join(" ")}${online}${length}.`.replace(",.", "."));
  }

  // What a week looks like.
  if (food === "meal") sentences.push("Dinner is provided, so come hungry.");
  if (food === "snacks") sentences.push("There will be snacks.");
  if (picked.has("topical")) sentences.push("Each week we look at what the Bible says about a different topic.");
  else if (picked.has("book-study") && !curriculum) sentences.push("We read through a book of the Bible together.");
  if (picked.has("prayer")) sentences.push("Every week includes time to pray for one another.");
  if (capacity && capacity <= 20) sentences.push(`It's a small group of about ${capacity}, so it's easy to get to know people.`);

  // Welcome.
  sentences.push(
    picked.has("new-to-faith")
      ? "If you're new to faith or just curious, you're in the right place. No experience needed."
      : "Whether you've read the Bible for years or are opening it for the first time, you're welcome here.",
  );
  sentences.push("Come as you are, and feel free to bring a friend.");

  return sentences.join(" ");
}
