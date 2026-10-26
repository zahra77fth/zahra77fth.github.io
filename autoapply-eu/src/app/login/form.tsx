"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function LoginForm({ first }: { first: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-5 space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password {first && <span className="text-muted-foreground">(min. 10 characters)</span>}</Label>
        <Input id="password" name="password" type="password" autoComplete={first ? "new-password" : "current-password"} minLength={first ? 10 : undefined} required />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {first ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
