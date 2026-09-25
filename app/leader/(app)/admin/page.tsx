import type { Metadata } from "next";
import { Check, Undo2 } from "lucide-react";
import { buttonClass } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth";
import { setApproval } from "./actions";

export const metadata: Metadata = { title: "Admin" };

interface AdminLeaderRow {
  id: string;
  name: string;
  email: string | null;
  approved: boolean;
  created_at: string;
  study_count: number;
}

export default async function AdminPage() {
  const { supabase, leader: me } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_leaders");
  if (error) throw new Error(error.message);
  const leaders = data as AdminLeaderRow[];
  const pending = leaders.filter((l) => !l.approved);
  const approved = leaders.filter((l) => l.approved);

  const row = (l: AdminLeaderRow) => (
    <li
      key={l.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
    >
      <div className="grid gap-0.5">
        <p className="font-semibold">{l.name}</p>
        <p className="text-sm text-muted">
          {l.email ?? "Sample leader (no sign-in)"} · {l.study_count}{" "}
          {Number(l.study_count) === 1 ? "study" : "studies"}
        </p>
      </div>
      {l.id !== me.id && (
        <form action={setApproval.bind(null, l.id, !l.approved)}>
          <button
            type="submit"
            className={l.approved ? buttonClass.quiet : buttonClass.primary}
          >
            {l.approved ? <Undo2 className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
            {l.approved ? "Revoke" : "Approve"}
          </button>
        </form>
      )}
    </li>
  );

  return (
    <div className="grid gap-8">
      <header className="grid gap-1">
        <h1 className="font-display text-3xl font-semibold">Leaders</h1>
        <p className="text-muted">
          Approving a leader makes their active studies visible in the directory.
        </p>
      </header>
      <section className="grid gap-3" aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="font-display text-xl font-semibold">
          Waiting for approval ({pending.length})
        </h2>
        {pending.length ? (
          <ul className="grid gap-3">{pending.map(row)}</ul>
        ) : (
          <p className="text-muted">All caught up.</p>
        )}
      </section>
      <section className="grid gap-3" aria-labelledby="approved-heading">
        <h2 id="approved-heading" className="font-display text-xl font-semibold">
          Approved ({approved.length})
        </h2>
        <ul className="grid gap-3">{approved.map(row)}</ul>
      </section>
    </div>
  );
}
