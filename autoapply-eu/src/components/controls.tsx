"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Search, Square, Zap } from "lucide-react";
import { emergencyStopAction, manualAction, pauseAction, runNowAction, approveClarificationAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function RunControls({ paused, emergency }: { paused: boolean; emergency: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      const r = (await fn()) as { message?: string } | undefined;
      setMsg(r?.message ?? null);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={pending || emergency} onClick={() => act(() => runNowAction("manual"))}>
        <Zap className="h-4 w-4" /> Run Now
      </Button>
      <Button variant="outline" disabled={pending || emergency} onClick={() => act(() => runNowAction("discovery-only"))}>
        <Search className="h-4 w-4" /> Discovery-only run
      </Button>
      <Button variant="outline" disabled={pending || emergency} onClick={() => act(() => pauseAction(!paused))}>
        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {paused ? "Resume" : "Pause"}
      </Button>
      <Button variant={emergency ? "outline" : "destructive"} disabled={pending} onClick={() => act(() => emergencyStopAction(!emergency))}>
        <Square className="h-4 w-4" /> {emergency ? "Clear emergency stop" : "Emergency stop"}
      </Button>
      {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
    </div>
  );
}

export function ManualButtons({ id, canRetry }: { id: string; canRetry: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (a: "APPLIED_MANUALLY" | "NOT_INTERESTED" | "RETRY") =>
    start(async () => {
      const r = await manualAction(id, a);
      setMsg(r.ok ? null : r.message);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending || !canRetry} title={canRetry ? "" : "Disabled: the earlier attempt may already have been submitted"} onClick={() => go("RETRY")}>
        Retry automatic application
      </Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => go("APPLIED_MANUALLY")}>
        Mark as applied manually
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => go("NOT_INTERESTED")}>
        Not interested
      </Button>
      {msg && <span className="text-xs text-destructive">{msg}</span>}
    </div>
  );
}

export function ApproveClarification({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { await approveClarificationAction(jobId); router.refresh(); })}>
      Approve &amp; queue
    </Button>
  );
}
