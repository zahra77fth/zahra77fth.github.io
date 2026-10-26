/**
 * Terminal setup: creates .env with fresh secrets, checks Postgres/Redis, runs migrations,
 * and lists CV files found on the Desktop. Candidate verification happens in the web wizard.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import readline from "node:readline/promises";
import { desktopDirectories, findCvFiles } from "../src/core/cv/locate";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  if (!fs.existsSync(envPath)) {
    let tpl = fs.readFileSync(path.join(root, ".env.example"), "utf8");
    tpl = tpl.replace(/^ENCRYPTION_KEY=.*$/m, `ENCRYPTION_KEY=${crypto.randomBytes(32).toString("base64")}`);
    tpl = tpl.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${crypto.randomBytes(32).toString("base64url")}`);
    fs.writeFileSync(envPath, tpl, { mode: 0o600 });
    console.log("Created .env with fresh ENCRYPTION_KEY and SESSION_SECRET.");
  } else console.log(".env exists — keeping it.");
  process.loadEnvFile?.(envPath);

  console.log("Running database migrations…");
  try {
    execSync("npx prisma migrate deploy", { cwd: root, stdio: "inherit" });
  } catch {
    console.error("Migrations failed. Is Postgres running? Try: docker compose up -d postgres redis");
    process.exit(1);
  }

  const { os, dirs } = await desktopDirectories(process.env.DESKTOP_DIR || undefined);
  console.log(`\nOS: ${os}\nDesktop folders: ${dirs.join(", ") || "none found (set DESKTOP_DIR in .env)"}`);
  const files = await findCvFiles(dirs);
  if (!files.length) console.log("No PDF/DOCX files found on the Desktop. You can upload your CV in the web wizard.");
  files.forEach((f, i) => console.log(`  [${i + 1}] ${f.name}${f.likelyCv ? "  ← looks like a CV" : ""}  (${f.path})`));
  if (files.length) {
    const ans = await rl.question("\nWhich file is your master CV? (number, Enter to choose later in the web wizard): ");
    const pick = files[Number(ans) - 1];
    if (pick) console.log(`Selected ${pick.path}. Confirm it in the web wizard (Setup → step 1) to extract and verify your profile.`);
  }
  console.log("\nNext:\n  npm run dev      # dashboard on http://localhost:3000\n  npm run worker   # background worker + daily schedule\nOpen the dashboard, create your account, and follow the Setup wizard.");
  rl.close();
}

main();
