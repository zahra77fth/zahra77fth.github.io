import Link from "next/link";
import { logoutAction } from "@/app/actions";

const LINKS = [
  ["/", "Overview"],
  ["/jobs", "Job discovery"],
  ["/applications", "Applications"],
  ["/manual", "Manual queue"],
  ["/timeline", "Timeline"],
  ["/settings", "Settings"],
  ["/setup", "Setup wizard"],
] as const;

export function Nav({ manualCount }: { manualCount: number }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          AutoApply <span className="text-primary">EU</span>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              {label}
              {href === "/manual" && manualCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{manualCount}</span>}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="ml-auto">
          <button className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
        </form>
      </div>
    </header>
  );
}
