import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "../profile/profile-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const { leader } = await requireUser();
  if (leader) redirect("/leader");

  return (
    <div className="grid max-w-xl gap-6">
      <header className="grid gap-2">
        <h1 className="font-display text-3xl font-semibold">Welcome! Let&apos;s set you up.</h1>
        <p className="text-muted">
          This is what visitors see next to your study. It takes about a minute.
        </p>
      </header>
      <ProfileForm submitLabel="Continue" initial={{ name: "", bio: "", phone: "", whatsapp: false }} />
    </div>
  );
}
