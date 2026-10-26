import { Download } from "lucide-react";

interface DocApp {
  id: string;
  resumePdfPath: string | null;
  resumeDocxPath: string | null;
  coverPdfPath: string | null;
  coverDocxPath: string | null;
  coverTxtPath: string | null;
  coverLanguage: string | null;
}

export function DocLinks({ app }: { app: DocApp }) {
  const links: [string, string | null][] = [
    ["CV (PDF)", app.resumePdfPath && "resume-pdf"],
    ["CV (DOCX)", app.resumeDocxPath && "resume-docx"],
    [`Cover letter ${app.coverLanguage ? `(${app.coverLanguage.toUpperCase()}) ` : ""}PDF`, app.coverPdfPath && "cover-pdf"],
    ["Cover letter DOCX", app.coverDocxPath && "cover-docx"],
    ["Cover letter TXT", app.coverTxtPath && "cover-txt"],
  ];
  const available = links.filter(([, k]) => k);
  if (!available.length) return <div className="text-xs text-muted-foreground">Documents not generated yet.</div>;
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {available.map(([label, kind]) => (
        <a key={kind} href={`/api/files/${app.id}/${kind}`} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 hover:bg-muted">
          <Download className="h-3 w-3" /> {label}
        </a>
      ))}
    </div>
  );
}
