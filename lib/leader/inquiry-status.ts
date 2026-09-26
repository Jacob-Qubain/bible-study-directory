export type InquiryStatus = "new" | "contacted" | "joined" | "declined";

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Reached out",
  joined: "Joined",
  declined: "Not a fit",
};
