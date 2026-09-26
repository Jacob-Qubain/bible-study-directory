import { formatPhone } from "../phone";
import { STATUS_LABELS } from "./inquiry-status";
import type { Inquiry } from "./queries";

export interface ExportRow extends Inquiry {
  studyTitle: string;
}

// ─── vCard (phone contacts) ────────────────────────────────────────────────
function vcardEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** One .vcf with everyone; iPhone and Android import them all in one tap. */
export function toVCard(rows: ExportRow[]) {
  return rows
    .map((r) => {
      const parts = r.name.trim().split(/\s+/);
      const first = parts[0] ?? "";
      const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
      const note = [`Wants to join ${r.studyTitle} (via Find a Bible Study)`, r.message]
        .filter(Boolean)
        .join("\n");
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${vcardEscape(r.name.trim())}`,
        `N:${vcardEscape(last)};${vcardEscape(first)};;;`,
        r.email && `EMAIL;TYPE=INTERNET:${vcardEscape(r.email)}`,
        r.phone && `TEL;TYPE=CELL:${r.phone}`,
        `NOTE:${vcardEscape(note)}`,
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\r\n");
    })
    .join("\r\n")
    .concat("\r\n");
}

// ─── CSV (spreadsheets) ────────────────────────────────────────────────────
/**
 * Quotes a cell, and neutralizes text a spreadsheet would run as a formula
 * (visitors type their own name and note, so treat them as untrusted).
 */
function csvCell(value: string | null) {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export function toCsv(rows: ExportRow[]) {
  const header = ["Name", "Email", "Phone", "Study", "Status", "Note", "Reached out"];
  const lines = rows.map((r) =>
    [
      r.name,
      r.email,
      r.phone ? formatPhone(r.phone) : null,
      r.studyTitle,
      STATUS_LABELS[r.status],
      r.message,
      r.createdAt.slice(0, 10),
    ]
      .map(csvCell)
      .join(","),
  );
  // BOM so Excel opens names with accents correctly.
  return "\uFEFF" + [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
