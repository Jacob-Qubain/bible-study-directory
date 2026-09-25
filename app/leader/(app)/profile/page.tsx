import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const { leader } = await requireLeader();
  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="font-display text-3xl font-semibold">Your profile</h1>
      <ProfileForm
        submitLabel="Save changes"
        initial={{
          name: leader.name,
          bio: leader.bio ?? "",
          phone: leader.publicPhone ? formatPhone(leader.publicPhone) : "",
          whatsapp: leader.whatsapp,
        }}
      />
    </div>
  );
}
