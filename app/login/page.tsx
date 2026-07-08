import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, LogIn, UserPlus } from "lucide-react";

import { authEnabled, currentUserId, googleEnabled } from "@/auth";
import {
  credentialsSignInAction,
  registerAction,
  signInAction,
} from "@/app/auth-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass } from "@/components/form-controls";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  invalid: "Wrong username or password — try again.",
  badname:
    "Usernames are 3–32 characters: letters, numbers, dots, dashes, underscores.",
  weak: "Passwords need at least 8 characters.",
  taken: "That username is taken — try another.",
  unavailable: "Accounts are temporarily unavailable. Try again shortly.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const { mode, error } = await searchParams;
  const signup = mode === "signup";

  if (!authEnabled) {
    return (
      <EmptyState
        icon={KeyRound}
        title="Auth isn't configured"
        description="This deployment is running the read-only demo archive."
      />
    );
  }
  if (await currentUserId()) redirect("/");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title={signup ? "Create your account" : "Sign in"}
        subtitle={
          signup
            ? "A username and password is all it takes to start your archive."
            : "Pick up where your archive left off."
        }
      />

      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-300">
          {ERRORS[error] ?? "Sign-in failed — try again."}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{signup ? "New account" : "Welcome back"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={signup ? registerAction : credentialsSignInAction}
            className="space-y-4"
          >
            <Field
              label="Username"
              hint={
                signup
                  ? "3–32 characters — letters, numbers, dots, dashes, underscores."
                  : undefined
              }
            >
              <input
                name="username"
                required
                minLength={3}
                maxLength={32}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. posterhead"
                className={inputClass}
              />
            </Field>
            <Field
              label="Password"
              hint={signup ? "At least 8 characters." : undefined}
            >
              <input
                name="password"
                required
                type="password"
                minLength={signup ? 8 : 1}
                autoComplete={signup ? "new-password" : "current-password"}
                className={inputClass}
              />
            </Field>
            <Button type="submit" className="w-full">
              {signup ? <UserPlus /> : <LogIn />}
              {signup ? "Create account" : "Sign in"}
            </Button>
          </form>

          {googleEnabled ? (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <form action={signInAction}>
                <Button type="submit" variant="outline" className="w-full">
                  Continue with Google
                </Button>
              </form>
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            {signup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link
                  href="/login?mode=signup"
                  className="text-primary hover:underline"
                >
                  Create an account
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
