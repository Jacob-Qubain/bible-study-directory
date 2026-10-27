import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CalendarCheck, ScanLine, Timer, UserRoundCheck } from "lucide-react";
import { DAY_NAMES } from "@/lib/schedule";
import { getCampus, getStudies } from "@/lib/data/studies";
import { SITE_URL } from "@/lib/site";
import { PrintButton } from "./print-button";

export async function generateMetadata(props: PageProps<"/[campus]/flyer">): Promise<Metadata> {
  const campus = await getCampus((await props.params).campus);
  return campus ? { title: `Flyer · ${campus.name}`, robots: { index: false } } : {};
}

/** One printable page per campus: logo, a big QR code, and the campus link. */
export default async function FlyerPage(props: PageProps<"/[campus]/flyer">) {
  const campus = await getCampus((await props.params).campus);
  if (!campus) notFound();
  const studies = await getStudies(campus.id);

  const url = `${SITE_URL}/${campus.slug}`;
  const shortUrl = url.replace(/^https?:\/\//, "");
  // Slugs are restricted to [a-z0-9-] by the database, so the SVG is safe to inline.
  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1a2633", light: "#ffffff" },
  });
  const days = [...new Set(studies.map((s) => s.dayOfWeek))]
    .toSorted((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // Monday first
    .map((d) => DAY_NAMES[d]);

  const points = [
    { icon: UserRoundCheck, text: "No sign-up, no account" },
    { icon: CalendarCheck, text: "Pick a night that works for you" },
    { icon: Timer, text: "Let the leader know in ten seconds" },
  ];

  return (
    <div className="mx-auto grid max-w-[8.5in] gap-4 px-4 py-6 print:max-w-none print:p-0">
      <div className="flex justify-end print:hidden">
        <PrintButton />
      </div>

      {/* Light colors regardless of theme, so it prints the same everywhere. */}
      <article className="grid justify-items-center gap-7 rounded-2xl border border-[#dbe3ec] bg-white px-8 py-12 text-center text-[#1a2633] sm:px-14 print:min-h-[10in] print:rounded-none print:border-0 print:py-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- static app icon, printed */}
        <img src="/icon.png" alt="" width={96} height={96} className="size-24" />
        <div className="grid gap-3">
          <p className="text-lg font-semibold tracking-wide text-[#236aa6] uppercase">{campus.name}</p>
          <h1 className="font-display text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl">
            Looking for a Bible study?
          </h1>
          <p className="text-xl text-[#566374]">
            {studies.length > 1
              ? `${studies.length} studies meet every week. Find one that fits your schedule.`
              : "Find one that fits your schedule."}
          </p>
        </div>

        <div
          role="img"
          aria-label={`QR code linking to ${shortUrl}`}
          className="size-64 sm:size-72 [&_svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />

        <div className="grid gap-1">
          <p className="flex items-center justify-center gap-2 text-lg font-medium text-[#566374]">
            <ScanLine className="size-5 text-[#236aa6]" aria-hidden />
            Scan with your phone camera, or visit
          </p>
          <p className="font-display text-3xl font-semibold text-[#236aa6]">{shortUrl}</p>
        </div>

        <ul className="grid gap-3 text-left text-lg">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon className="size-6 shrink-0 text-[#236aa6]" aria-hidden />
              {text}
            </li>
          ))}
        </ul>

        {days.length > 0 && (
          <p className="text-[#566374]">Meeting {days.join(", ").replace(/, ([^,]*)$/, " and $1")}</p>
        )}
      </article>
    </div>
  );
}
