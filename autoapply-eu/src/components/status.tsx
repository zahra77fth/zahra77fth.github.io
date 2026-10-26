import { Badge } from "@/components/ui/badge";

const MAP: Record<string, "success" | "warning" | "destructive" | "secondary" | "default" | "outline"> = {
  SUBMITTED_VERIFIED: "success",
  APPLIED_MANUALLY: "success",
  ELIGIBLE: "default",
  QUEUED: "secondary",
  DOCUMENTS_READY: "default",
  APPLYING: "default",
  RETRY_PENDING: "warning",
  NEEDS_ACTION: "warning",
  NEEDS_CLARIFICATION: "warning",
  SUBMISSION_UNCERTAIN: "warning",
  FAILED: "destructive",
  EXCLUDED: "outline",
  EXPIRED: "outline",
  DUPLICATE: "outline",
  SKIPPED: "outline",
  NOT_INTERESTED: "outline",
  DISCOVERED: "secondary",
  OK: "success",
  PARTIAL: "warning",
  EMPTY: "secondary",
  BLOCKED: "destructive",
  ERROR: "destructive",
  UNKNOWN: "outline",
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={MAP[value] ?? "secondary"}>{value.replace(/_/g, " ").toLowerCase()}</Badge>;
}
