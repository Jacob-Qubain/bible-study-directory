import { LogOut } from "lucide-react";
import { buttonClass } from "@/components/ui/field";
import { requireUser } from "@/lib/auth";
import { signOut } from "../login/actions";
import { NavLinks } from "./nav-links";

export default async function LeaderLayout({ children }: LayoutProps<"/leader">) {
  const { user, leader } = await requireUser();

  const links = leader
    ? [
        { href: "/leader", label: "My studies" },
        { href: "/leader/people", label: "People" },
        ...(leader.contactCampusIds.length || leader.isAdmin
          ? [{ href: "/leader/requests", label: "Looking for a study" }]
          : []),
        { href: "/leader/profile", label: "Profile" },
        ...(leader.isAdmin ? [{ href: "/leader/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-6 pb-16">
      <nav
        aria-label="Leader"
        className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-line pb-4"
      >
        <NavLinks links={links} />
        <span className="ml-auto hidden text-sm text-muted sm:inline">{user.email}</span>
        <form action={signOut}>
          <button type="submit" className={buttonClass.quiet}>
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
