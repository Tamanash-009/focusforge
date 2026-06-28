"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { LogIn, ShieldCheck, UserRound } from "lucide-react";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function ConfiguredAuthStatus() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="h-10 w-32 animate-pulse rounded-md bg-[var(--surface-muted)]" aria-label="Loading account" />
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <SignInButton mode="modal">
          <button className="btn-secondary" type="button">
            <LogIn aria-hidden="true" size={16} />
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="btn-primary hidden sm:inline-flex" type="button">
            Start
          </button>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold text-[var(--text-strong)]">{user.firstName ?? "Student"}</p>
        <p className="text-xs text-[var(--text-muted)]">Cloud sync ready</p>
      </div>
      <UserButton appearance={{ elements: { avatarBox: "h-10 w-10" } }} />
    </div>
  );
}

export function AuthStatus() {
  if (!clerkPublishableKey) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] px-3 py-2 text-sm text-[var(--text-muted)]">
        <UserRound aria-hidden="true" size={16} />
        Guest mode
      </div>
    );
  }

  return <ConfiguredAuthStatus />;
}

export function SecurityBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-glass)] px-3 py-2 text-xs font-medium text-[var(--text-muted)]">
      <ShieldCheck aria-hidden="true" size={14} />
      Protected auth boundary
    </div>
  );
}
