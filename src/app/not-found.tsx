import Link from "next/link";

import { FocusForgeLogo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="app-background flex min-h-screen items-center justify-center p-6">
      <section className="surface-panel w-full max-w-md p-6">
        <FocusForgeLogo />
        <h1 className="mt-6 text-2xl font-bold text-[var(--text-strong)]">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">The requested FocusForge route does not exist.</p>
        <Link className="btn-primary mt-6" href="/">
          Return home
        </Link>
      </section>
    </main>
  );
}
