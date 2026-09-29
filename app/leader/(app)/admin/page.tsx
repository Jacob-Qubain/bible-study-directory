import type { Metadata } from "next";
import Link from "next/link";
import { Check, Trash2, Undo2, UserPlus, X } from "lucide-react";
import { buttonClass, inputClass, Select } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth";
import { setApproval } from "./actions";
import { addCampusContact, removeCampus, removeCampusContact } from "./campus-actions";
import { CampusForm } from "./campus-form";

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
  const [leaderResult, campusResult, studyResult, contactResult] = await Promise.all([
    supabase.rpc("admin_list_leaders"),
    supabase.from("campuses").select("id, slug, name, city").order("name"),
    // Admins can see every study, listed or not.
    supabase.from("bible_studies").select("campus_id"),
    supabase.from("campus_contacts").select("campus_id, leader_id, leaders ( name )").order("sort_order"),
  ]);
  const error = leaderResult.error ?? campusResult.error ?? studyResult.error ?? contactResult.error;
  if (error) throw new Error(error.message);
  const leaders = leaderResult.data as AdminLeaderRow[];
  const campuses = campusResult.data!.map((c) => ({
    ...c,
    studies: studyResult.data!.filter((s) => s.campus_id === c.id).length,
    contacts: (
      contactResult.data as unknown as {
        campus_id: string;
        leader_id: string;
        leaders: { name: string } | null;
      }[]
    ).filter((k) => k.campus_id === c.id),
  }));
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
        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <p className="text-muted">
          Approve leaders (their active studies then appear in the directory) and manage campuses.
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
      <section className="grid gap-3" aria-labelledby="campuses-heading">
        <h2 id="campuses-heading" className="font-display text-xl font-semibold">
          Campuses ({campuses.length})
        </h2>
        <p className="text-sm text-muted">
          Leaders choose from these when listing a study. A campus appears in the public picker once
          it has a live study. Contacts must sign in once and be approved before you can add them.
        </p>
        <ul className="grid gap-3">
          {campuses.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <div className="grid gap-0.5">
                <Link href={`/${c.slug}`} className="font-semibold hover:underline">
                  {c.name}
                </Link>
                <p className="text-sm text-muted">
                  /{c.slug}
                  {c.city && ` · ${c.city}`} · {c.studies} {c.studies === 1 ? "study" : "studies"}
                </p>
              </div>
              {c.studies === 0 && (
                <form action={removeCampus.bind(null, c.id)}>
                  <button type="submit" className={`${buttonClass.quiet} text-warm hover:text-warm`}>
                    <Trash2 className="size-4" aria-hidden />
                    Remove
                  </button>
                </form>
              )}
              <div className="grid w-full gap-2 border-t border-line pt-3">
                <p className="text-sm font-medium">
                  Contacts{" "}
                  <span className="font-normal text-muted">
                    · shown on the campus page; they get &ldquo;nothing fits my schedule&rdquo; requests.
                    With none, requests go to admins.
                  </span>
                </p>
                {c.contacts.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {c.contacts.map((k) => (
                      <li
                        key={k.leader_id}
                        className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pr-1 pl-3 text-sm"
                      >
                        {k.leaders?.name ?? "Unknown"}
                        <form action={removeCampusContact.bind(null, c.id, k.leader_id)}>
                          <button
                            type="submit"
                            aria-label={`Remove ${k.leaders?.name ?? "contact"} as a contact`}
                            className="grid size-7 place-items-center rounded-full hover:bg-surface"
                          >
                            <X className="size-3.5" aria-hidden />
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  action={addCampusContact.bind(null, c.id)}
                  className="flex flex-wrap items-center gap-2"
                >
                  <label className="sr-only" htmlFor={`contact-${c.id}`}>
                    Leader to add as a contact for {c.name}
                  </label>
                  <Select
                    id={`contact-${c.id}`}
                    name="leaderId"
                    required
                    wrapperClassName="min-w-0 flex-1 sm:max-w-xs"
                    className={`${inputClass} h-11 text-sm`}
                  >
                    <option value="">Choose a leader…</option>
                    {approved
                      .filter((l) => !c.contacts.some((k) => k.leader_id === l.id))
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </Select>
                  <button type="submit" className={buttonClass.secondary}>
                    <UserPlus className="size-4" aria-hidden />
                    Add
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <CampusForm />
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
