import { FocusForgeLogo } from "@/components/brand/logo";

export default function Loading() {
  return (
    <main className="app-background flex min-h-screen items-center justify-center p-6">
      <div className="splash-card w-full max-w-sm p-6 text-center">
        <div className="flex justify-center">
          <FocusForgeLogo compact />
        </div>
        <h1 className="mt-5 text-2xl font-black text-[var(--text-strong)]">FocusForge</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Loading your offline-first workspace.</p>
        <div className="focus-wave mx-auto mt-5 max-w-56" aria-hidden="true">
          {[54, 82, 46, 92, 60, 76].map((height, index) => (
            <span key={`${height}-${index}`} style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }} />
          ))}
        </div>
      </div>
    </main>
  );
}
