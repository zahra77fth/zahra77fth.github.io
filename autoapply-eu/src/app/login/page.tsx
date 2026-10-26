import { hasAnyUser } from "@/lib/auth";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const first = !(await hasAnyUser());
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold">AutoApply <span className="text-primary">EU</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">{first ? "Create the dashboard account. This is the only user; the password is stored as a scrypt hash." : "Sign in to your dashboard."}</p>
        <LoginForm first={first} />
      </div>
    </div>
  );
}
