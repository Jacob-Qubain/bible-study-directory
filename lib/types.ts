export type StudyFormat = "in_person" | "online" | "hybrid";
export type StudyCadence = "weekly" | "biweekly";
export type FoodProvided = "none" | "snacks" | "meal";
export type TagCategory = "audience" | "topic";
export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface Tag {
  slug: string;
  label: string;
  category: TagCategory;
}

export interface Campus {
  id: string;
  slug: string; // findabiblestudy.org/<slug>
  name: string;
  city: string | null;
  timezone: string;
}

export interface Leader {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  publicPhone: string | null;
  whatsapp: boolean;
}

/** A study as the public directory sees it — no private address or meeting link. */
export interface Study {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  curriculum: string | null;
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // "HH:MM", local to `timezone`
  durationMinutes: number;
  timezone: string;
  cadence: StudyCadence;
  anchorDate: string; // "YYYY-MM-DD"
  format: StudyFormat;
  neighborhood: string | null;
  locationName: string | null;
  food: FoodProvided;
  capacity: number | null;
  campus: Pick<Campus, "id" | "slug" | "name">;
  leaders: Leader[];
  tags: Tag[];
}

/** Revealed only after someone joins. */
export interface PrivateMeetingDetails {
  address: string | null;
  meetingUrl: string | null;
}
