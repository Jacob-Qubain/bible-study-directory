"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClass } from "@/components/ui/field";

/**
 * Copies every number, comma-separated, ready to paste into the "To:" field
 * of a new message to start a group chat.
 */
export function CopyNumbers({ phones }: { phones: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = phones.join(", ");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard can be blocked (older browsers, permissions); let them copy by hand.
      window.prompt("Copy these numbers:", text);
    }
  }

  return (
    <button type="button" onClick={copy} className={buttonClass.secondary}>
      {copied ? (
        <Check className="size-4 text-accent" aria-hidden />
      ) : (
        <Copy className="size-4 text-accent" aria-hidden />
      )}
      <span aria-live="polite">
        {copied
          ? "Copied! Paste into a new message"
          : `Copy ${phones.length} ${phones.length === 1 ? "number" : "numbers"}`}
      </span>
    </button>
  );
}
