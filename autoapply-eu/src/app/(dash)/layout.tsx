import { Nav } from "@/components/nav";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MANUAL_STATES } from "@/core/state";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const [manualCount, settings] = await Promise.all([prisma.application.count({ where: { state: { in: MANUAL_STATES } } }), getSettings()]);
  return (
    <>
      <Nav manualCount={manualCount} />
      {settings.emergencyStop && <div className="bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">Emergency stop is engaged — no discovery runs or submissions will happen until you clear it on the Overview page.</div>}
      {!settings.emergencyStop && settings.paused && <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">Processing is paused.</div>}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
