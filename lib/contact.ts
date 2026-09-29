import { normalizePhone } from "./phone";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One contact field accepts either an email or a phone number. */
export function parseContact(raw: string): { email: string | null; phone: string | null } | null {
  const value = raw.trim();
  if (value.includes("@")) return EMAIL.test(value) ? { email: value, phone: null } : null;
  const phone = normalizePhone(value);
  return phone ? { email: null, phone } : null;
}
