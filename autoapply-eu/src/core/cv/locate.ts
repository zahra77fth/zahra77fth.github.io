import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface CvCandidate {
  path: string;
  name: string;
  ext: ".pdf" | ".docx";
  sizeBytes: number;
  modifiedAt: string;
  likelyCv: boolean;
}

const CV_NAME = /(cv|resume|résumé|lebenslauf|curriculum|bewerbung)/i;

async function exists(p: string) {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function xdgDesktop(home: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(path.join(home, ".config", "user-dirs.dirs"), "utf8");
    const m = raw.match(/^XDG_DESKTOP_DIR="?([^"\n]+)"?/m);
    if (m) return m[1].replace("$HOME", home);
  } catch {
    /* no XDG config */
  }
  return undefined;
}

export async function desktopDirectories(override?: string): Promise<{ os: string; dirs: string[] }> {
  const home = os.homedir();
  const candidates: (string | undefined)[] = [override];
  if (process.platform === "win32") {
    candidates.push(
      process.env.OneDrive && path.join(process.env.OneDrive, "Desktop"),
      process.env.USERPROFILE && path.join(process.env.USERPROFILE, "Desktop"),
    );
  } else if (process.platform === "linux") {
    candidates.push(await xdgDesktop(home));
  }
  candidates.push(path.join(home, "Desktop"), path.join(home, "Bureaublad"), path.join(home, "Schreibtisch"));
  const dirs: string[] = [];
  for (const c of candidates) if (c && !dirs.includes(c) && (await exists(c))) dirs.push(c);
  return { os: `${process.platform} ${os.release()}`, dirs };
}

export async function findCvFiles(dirs: string[], maxDepth = 2): Promise<CvCandidate[]> {
  const out: CvCandidate[] = [];
  async function walk(dir: string, depth: number) {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name.startsWith("~$")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory() && depth < maxDepth) await walk(full, depth + 1);
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (ext !== ".pdf" && ext !== ".docx") continue;
      const st = await fs.stat(full);
      out.push({
        path: full,
        name: e.name,
        ext: ext as ".pdf" | ".docx",
        sizeBytes: st.size,
        modifiedAt: st.mtime.toISOString(),
        likelyCv: CV_NAME.test(e.name),
      });
    }
  }
  for (const d of dirs) await walk(d, 0);
  return out.sort((a, b) => Number(b.likelyCv) - Number(a.likelyCv) || b.modifiedAt.localeCompare(a.modifiedAt));
}
