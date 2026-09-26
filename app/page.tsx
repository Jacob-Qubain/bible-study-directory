import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CampusPicker } from "@/components/campus/campus-picker";
import { CAMPUS_COOKIE } from "@/lib/campus-cookie";
import { getActiveCampuses } from "@/lib/data/studies";

/**
 * Campus picker. Returning visitors go straight to their remembered campus,
 * and when only one campus has studies there's nothing to choose, so everyone
 * goes there. `/?choose` always shows the list (the "Change campus" link).
 */
export default async function Home(props: PageProps<"/">) {
  const [campuses, { choose }, jar] = await Promise.all([
    getActiveCampuses(),
    props.searchParams,
    cookies(),
  ]);

  if (choose === undefined) {
    const remembered = campuses.find((c) => c.slug === jar.get(CAMPUS_COOKIE)?.value);
    if (remembered) redirect(`/${remembered.slug}`);
    if (campuses.length === 1) redirect(`/${campuses[0].slug}`);
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 pt-10 pb-16 sm:pt-14">
      <header className="grid gap-3">
        <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Find a Bible study <span className="text-accent italic">on your campus.</span>
        </h1>
        <p className="text-lg text-muted">
          Pick your school to see every study meeting this week. No sign-up needed.
        </p>
      </header>

      {campuses.length ? (
        <CampusPicker campuses={campuses} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-muted">
          No studies are listed yet. Check back soon!
        </p>
      )}
    </div>
  );
}
