/** Runs one discovery pass (no matching side effects beyond persistence, no applications) and prints coverage. */
import { runDiscovery } from "../src/core/discovery/run";
import { matchJobs } from "../src/core/pipeline";
import { prisma } from "../src/lib/db";

const stats = await runDiscovery();
const matching = await matchJobs();
const sources = await prisma.source.findMany({ orderBy: { id: "asc" } });
console.log(JSON.stringify({ stats, matching }, null, 2));
for (const s of sources) console.log(`${s.coverage.padEnd(8)} ${String(s.lastJobCount).padStart(5)} scanned ${String(s.lastMatchCount).padStart(4)} in scope  ${s.name}${s.lastError ? `  — ${s.lastError}` : ""}`);
await prisma.$disconnect();
