import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Notice } from "@/components/ui/field";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Leader sign in" };

export default async function LoginPage(props: PageProps<"/leader/login">) {
  const params = await props.searchParams;
  const next = safeNext(params.next);
  const { user } = await getSession();
  if (user) redirect(next);

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <header className="grid gap-2">
        <h1 className="font-display text-3xl font-semibold">Lead a study?</h1>
        <p className="text-muted">
          Sign in to list your group, update times, or pause for the summer, and see who wants to
          come. We&apos;ll email you a link: no password to remember.
        </p>
      </header>
      {params.error === "link" && (
        <Notice tone="warn">
          That sign-in link has expired or was already used. Request a fresh one below.
        </Notice>
      )}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <LoginForm next={next} />
      </div>
    </div>
  );
}
