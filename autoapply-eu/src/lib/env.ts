import path from "node:path";

function bool(v: string | undefined, d = false) {
  if (v === undefined || v === "") return d;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export const env = {
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get redisUrl() {
    return process.env.REDIS_URL ?? "redis://localhost:6379";
  },
  get storageDir() {
    return path.resolve(process.env.STORAGE_DIR || "./storage");
  },
  get desktopDir() {
    return process.env.DESKTOP_DIR || undefined;
  },
  get authorizeRealSubmissions() {
    return bool(process.env.AUTHORIZE_REAL_SUBMISSIONS);
  },
  get headless() {
    return bool(process.env.HEADLESS, true);
  },
  get applyConcurrency() {
    return Math.max(1, Number(process.env.WORKER_CONCURRENCY_APPLY || 1));
  },
  get processConcurrency() {
    return Math.max(1, Number(process.env.WORKER_CONCURRENCY_PROCESS || 4));
  },
  get dashboardUrl() {
    return process.env.DASHBOARD_URL || "http://localhost:3000";
  },
};
