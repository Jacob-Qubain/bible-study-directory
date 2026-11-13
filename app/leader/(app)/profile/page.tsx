import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const { supabase, user, leader } = await requireLeader();
  const { data: settings } = await supabase
    .from("leader_settings")
    .select("notify_email")
    .eq("leader_id", leader.id)
    .maybeSingle();
  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="font-display text-3xl font-semibold">Your profile</h1>
      <ProfileForm
        submitLabel="Save changes"
        signInEmail={user.email}
        initial={{
          name: leader.name,
          bio: leader.bio ?? "",
          phone: leader.publicPhone ? formatPhone(leader.publicPhone) : "",
          whatsapp: leader.whatsapp,
          notifyEmail: settings?.notify_email ?? "",
        }}
      />
    </div>
  );
}
