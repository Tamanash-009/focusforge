"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookPlus,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock,
  CloudOff,
  Download,
  Flame,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Moon,
  NotebookText,
  Pause,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  Target,
  TimerReset,
  Trophy,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { AuthStatus, SecurityBadge } from "@/components/auth/auth-status";
import { FocusForgeLogo, FocusForgeMark } from "@/components/brand/logo";
import { AutoInstallPrompt } from "@/components/pwa/auto-install-prompt";
import { InstallCard } from "@/components/pwa/install-card";
import { useFocusForgeStore } from "@/hooks/use-focusforge-store";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { isSupabaseConfigured } from "@/lib/supabase";
import type {
  Course,
  FocusSession,
  CourseInput,
  StudyState,
  StudyTask,
  StudyTaskType,
  TaskPriority,
  ThemeMode,
  ToastKind,
} from "@/lib/types";

type ViewId = "dashboard" | "planner" | "focus" | "notes" | "settings";

const navItems: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "planner", label: "Planner", icon: CalendarDays },
  { id: "focus", label: "Focus", icon: Target },
  { id: "notes", label: "Notes", icon: NotebookText },
  { id: "settings", label: "Settings", icon: Settings },
];

const taskTypes: StudyTaskType[] = ["reading", "assignment", "practice", "review", "exam"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
const viewIds = new Set<ViewId>(["dashboard", "planner", "focus", "notes", "settings"]);
const accentColors = ["#38d6c9", "#4f8cff", "#8b5cf6", "#f472b6", "#b7f34a", "#f7c948"];

function minutesLabel(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function localDateInputValue(date = new Date()) {
  const localValue = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 10);
}

function courseForTask(courses: Course[], task: StudyTask) {
  return courses.find((course) => course.id === task.courseId);
}

function priorityClass(priority: TaskPriority) {
  const classes: Record<TaskPriority, string> = {
    low: "badge-neutral",
    medium: "badge-blue",
    high: "badge-violet",
    urgent: "badge-danger",
  };

  return classes[priority];
}

function studyStreak(state: StudyState) {
  const sessionDays = new Set(state.sessions.map((session) => session.completedAt.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();

  for (let index = 0; index < 30; index += 1) {
    const localDate = localDateInputValue(cursor);
    if (!sessionDays.has(localDate)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function focusXp(state: StudyState) {
  const completedTasks = state.tasks.filter((task) => task.status === "done").length;
  const sessionMinutes = state.sessions.reduce((total, session) => total + session.minutes, 0);
  return sessionMinutes * 8 + completedTasks * 120;
}

export function FocusForgeApp() {
  const store = useFocusForgeStore();
  const isOnline = useNetworkStatus();
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const { state, derived } = store;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const nextTheme = state.settings.theme === "system" ? (media.matches ? "dark" : "light") : state.settings.theme;
      setResolvedTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.dataset.transparency = state.settings.reduceTransparency ? "reduced" : "normal";
    }

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => {
      media.removeEventListener("change", applyTheme);
    };
  }, [state.settings.reduceTransparency, state.settings.theme]);

  useEffect(() => {
    function syncViewFromUrl() {
      const requestedView = new URLSearchParams(window.location.search).get("view");
      const nextView = requestedView && viewIds.has(requestedView as ViewId) ? (requestedView as ViewId) : "dashboard";

      if (nextView !== activeView) {
        setActiveView(nextView);
      }
    }

    const timeout = window.setTimeout(syncViewFromUrl, 0);
    const interval = window.setInterval(syncViewFromUrl, 400);
    window.addEventListener("popstate", syncViewFromUrl);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener("popstate", syncViewFromUrl);
    };
  }, [activeView]);

  function notify(kind: ToastKind, title: string, message: string) {
    store.pushToast({ kind, title, message });
  }

  function changeView(view: ViewId) {
    setActiveView(view);

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (view === "dashboard") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", view);
    }
    window.history.replaceState({}, "", url.toString());
  }

  if (!store.isReady) {
    return <AppBootSplash />;
  }

  if (!state.settings.hasCompletedOnboarding) {
    return (
      <div className="app-background min-h-screen text-[var(--text-strong)]">
        <OnboardingView store={store} onComplete={() => store.completeOnboarding()} />
        <ToastStack toasts={store.toasts} onDismiss={store.dismissToast} />
      </div>
    );
  }

  return (
    <div className="app-background min-h-screen pb-24 text-[var(--text-strong)] lg:pb-8">
      <a className="skip-link" href="#main-content">
        Skip to dashboard
      </a>
      {!isOnline && <OfflineBanner />}
      <header className="app-topbar sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--shell-glass)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button className="rounded-md text-left focus-ring" type="button" onClick={() => changeView("dashboard")}>
            <FocusForgeLogo />
          </button>
          <div className="flex items-center gap-2">
            <button
              className="icon-button"
              type="button"
              aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
              onClick={() => store.updateSettings({ theme: resolvedTheme === "dark" ? "light" : "dark" })}
            >
              {resolvedTheme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
            </button>
            <AuthStatus />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[220px_minmax(0,1fr)_280px]"
      >
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <DesktopNav activeView={activeView} onChange={changeView} />
            <TodayPanel state={state} minutesToday={derived.minutesToday} progress={derived.dailyProgress} />
            <SecurityBadge />
          </div>
        </aside>

        <section className="min-w-0">
          {activeView === "dashboard" && <DashboardView state={state} derived={derived} setActiveView={changeView} store={store} />}
          {activeView === "planner" && <PlannerView state={state} derived={derived} store={store} />}
          {activeView === "focus" && <FocusView state={state} derived={derived} store={store} />}
          {activeView === "notes" && <NotesView state={state} store={store} />}
          {activeView === "settings" && (
            <SettingsView
              state={state}
              store={store}
              isOnline={isOnline}
              onMessage={(kind, title, message) => notify(kind, title, message)}
            />
          )}
        </section>

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <InstallCard onMessage={(kind, title, message) => notify(kind, title, message)} />
            <SyncPanel isOnline={isOnline} state={state} pendingSyncCount={store.pendingSyncCount} />
            <InsightPanel state={state} derived={derived} />
          </div>
        </aside>
      </main>

      <MobileNav activeView={activeView} onChange={changeView} />
      <AutoInstallPrompt onMessage={(kind, title, message) => notify(kind, title, message)} />
      <ToastStack toasts={store.toasts} onDismiss={store.dismissToast} />
    </div>
  );
}

function AppBootSplash() {
  return (
    <main className="app-background flex min-h-screen items-center justify-center p-6">
      <section className="splash-card text-center" aria-label="Loading FocusForge">
        <div className="mx-auto flex justify-center">
          <FocusForgeMark className="h-16 w-16" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-[var(--text-strong)]">FocusForge</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Preparing your offline-first study space.</p>
        <div className="focus-wave mx-auto mt-5 max-w-56" aria-hidden="true">
          {[54, 82, 46, 92, 60, 76].map((height, index) => (
            <span key={`${height}-${index}`} style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }} />
          ))}
        </div>
      </section>
    </main>
  );
}

function DesktopNav({ activeView, onChange }: { activeView: ViewId; onChange: (view: ViewId) => void }) {
  return (
    <nav className="surface-panel p-2" aria-label="Primary">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;

        return (
          <button
            key={item.id}
            className={active ? "nav-item nav-item-active" : "nav-item"}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function MobileNav({ activeView, onChange }: { activeView: ViewId; onChange: (view: ViewId) => void }) {
  return (
    <nav className="mobile-nav-shell fixed inset-x-3 z-50 grid grid-cols-5 rounded-lg border border-[var(--border-soft)] bg-[var(--shell-glass)] p-1 shadow-[var(--shadow-strong)] backdrop-blur-xl lg:hidden" aria-label="Mobile primary">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;

        return (
          <button
            key={item.id}
            className={active ? "mobile-nav-item mobile-nav-item-active" : "mobile-nav-item"}
            type="button"
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function OnboardingView({
  store,
  onComplete,
}: {
  store: ReturnType<typeof useFocusForgeStore>;
  onComplete: () => void;
}) {
  function handleCourseSaved() {
    onComplete();
    store.pushToast({
      kind: "success",
      title: "Workspace ready",
      message: "Add your first task when you are ready.",
    });
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1fr)] lg:px-8">
      <section className="onboarding-hero">
        <FocusForgeLogo />
        <div className="mt-8 inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] px-3 py-2 text-sm font-black text-[var(--text-muted)]">
          <Sparkles aria-hidden="true" size={16} />
          Material You inspired study OS
        </div>
        <h1 className="mt-5 text-4xl font-black leading-tight text-[var(--text-strong)] sm:text-5xl">
          Build your own focus space.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)]">
          Start with your real course. FocusForge stays offline-first, saves locally, and only syncs when cloud credentials are configured.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <OnboardingSignal icon={CloudOff} label="Offline-first" />
          <OnboardingSignal icon={Palette} label="Tonal glass UI" />
          <OnboardingSignal icon={Download} label="Installable PWA" />
        </div>
      </section>
      <section className="surface-panel p-5 sm:p-6">
        <SectionTitle icon={GraduationCap} title="Create first course" detail="Blank workspace, only your data" />
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          This course unlocks tasks, focus sessions, and notes. You can add more courses later from Planner.
        </p>
        <div className="mt-5">
          <CourseForm onAdd={store.addCourse} onSaved={handleCourseSaved} submitLabel="Create my workspace" />
        </div>
      </section>
    </main>
  );
}

function OnboardingSignal({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="tonal-chip">
      <Icon aria-hidden="true" size={16} />
      {label}
    </div>
  );
}

function CourseForm({
  onAdd,
  onSaved,
  submitLabel = "Save course",
}: {
  onAdd: ReturnType<typeof useFocusForgeStore>["addCourse"];
  onSaved?: (course: Course) => void;
  submitLabel?: string;
}) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("");
  const [weeklyTargetMinutes, setWeeklyTargetMinutes] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: CourseInput = {
      title,
      code,
      color,
      weeklyTargetMinutes: Number(weeklyTargetMinutes),
    };
    const result = onAdd(input);

    if (result.ok && "course" in result && result.course) {
      setTitle("");
      setCode("");
      setColor("");
      setWeeklyTargetMinutes("");
      onSaved?.(result.course);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <label className="field-label">
        Course name
        <input
          aria-label="Course name"
          className="field-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          placeholder="Physics, UX Research, Data Structures"
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">
          Course code
          <input
            aria-label="Course code"
            className="field-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={16}
            placeholder="PHY101"
            required
          />
        </label>
        <label className="field-label">
          Weekly target minutes
          <input
            aria-label="Weekly target minutes"
            className="field-input"
            type="number"
            min="30"
            max="3000"
            step="30"
            value={weeklyTargetMinutes}
            onChange={(event) => setWeeklyTargetMinutes(event.target.value)}
            placeholder="240"
            required
          />
        </label>
      </div>
      <fieldset className="field-label">
        <legend>Accent color</legend>
        <div className="color-swatch-grid">
          {accentColors.map((accentColor) => (
            <button
              key={accentColor}
              className={color === accentColor ? "color-swatch color-swatch-active" : "color-swatch"}
              style={{ background: accentColor }}
              type="button"
              aria-label={`Choose accent ${accentColor}`}
              aria-pressed={color === accentColor}
              onClick={() => setColor(accentColor)}
            />
          ))}
        </div>
      </fieldset>
      <button className="btn-primary w-full" type="submit">
        <ArrowRight aria-hidden="true" size={17} />
        {submitLabel}
      </button>
    </form>
  );
}

function DashboardView({
  state,
  derived,
  setActiveView,
  store,
}: {
  state: StudyState;
  derived: ReturnType<typeof useFocusForgeStore>["derived"];
  setActiveView: (view: ViewId) => void;
  store: ReturnType<typeof useFocusForgeStore>;
}) {
  return (
    <div className="space-y-5">
      <HeroPanel state={state} derived={derived} onStartFocus={() => setActiveView("focus")} onPlan={() => setActiveView("planner")} />
      <MobileQuickDock
        canFocus={Boolean(derived.nextTask)}
        onStartFocus={() => setActiveView("focus")}
        onPlan={() => setActiveView("planner")}
        onApp={() => setActiveView("settings")}
      />
      <MomentumStrip state={state} derived={derived} />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Clock} label="Today" value={minutesLabel(derived.minutesToday)} detail={`${derived.dailyProgress}% of daily goal`} />
        <MetricCard icon={ListChecks} label="Open tasks" value={String(derived.openTasks.length)} detail={`${derived.dueSoon.length} due soon`} />
        <MetricCard icon={Flame} label="All focus" value={minutesLabel(derived.totalMinutes)} detail={`${derived.completedToday.length} completed today`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <UpcomingTasks state={state} tasks={derived.openTasks.slice(0, 5)} onComplete={store.completeTask} onActivate={store.activateTask} />
        <CourseLoad state={state} />
      </div>
    </div>
  );
}

function HeroPanel({
  state,
  derived,
  onStartFocus,
  onPlan,
}: {
  state: StudyState;
  derived: ReturnType<typeof useFocusForgeStore>["derived"];
  onStartFocus: () => void;
  onPlan: () => void;
}) {
  const nextTask = derived.nextTask;
  const nextCourse = nextTask ? courseForTask(state.courses, nextTask) : undefined;

  return (
    <section className="hero-panel kinetic-panel overflow-hidden p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] px-3 py-2 text-sm font-bold text-[var(--text-muted)]">
            <Sparkles aria-hidden="true" size={16} />
            Live study deck
            <span className="h-1 w-1 rounded-full bg-[var(--brand-mark)]" />
            <CircleDot aria-hidden="true" size={16} />
            {nextTask ? `${nextCourse?.code ?? "Course"} is next` : "No active deadline"}
          </div>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-[var(--text-strong)] sm:text-4xl">
            {nextTask ? nextTask.title : "Your study system is clear."}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
            {nextTask
              ? `${minutesLabel(nextTask.estimateMinutes)} planned, due ${dateLabel(nextTask.dueDate)}. Keep the next block narrow and measurable.`
              : "Create a focused task to start a study block."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary" type="button" onClick={onStartFocus} disabled={!nextTask}>
              <Play aria-hidden="true" size={17} />
              Lock in
            </button>
            <button className="btn-secondary" type="button" onClick={onPlan}>
              <Plus aria-hidden="true" size={17} />
              Add study task
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-muted)]">Daily progress</span>
            <span className="text-sm font-bold text-[var(--text-strong)]">{derived.dailyProgress}%</span>
          </div>
          <div className="mt-4 h-3 rounded-full bg-[var(--surface-muted)]">
            <div className="h-full rounded-full bg-[var(--brand-gradient)]" style={{ width: `${derived.dailyProgress}%` }} />
          </div>
          <div className="focus-wave mt-5" aria-hidden="true">
            {[42, 66, 54, 88, 58, 76, 48, 70].map((height, index) => (
              <span key={`${height}-${index}`} style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }} />
            ))}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Goal" value={minutesLabel(state.settings.dailyGoalMinutes)} />
            <Stat label="Logged" value={minutesLabel(derived.minutesToday)} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function MobileQuickDock({
  canFocus,
  onStartFocus,
  onPlan,
  onApp,
}: {
  canFocus: boolean;
  onStartFocus: () => void;
  onPlan: () => void;
  onApp: () => void;
}) {
  return (
    <section className="mobile-action-dock lg:hidden" aria-label="Quick actions">
      <button className="btn-primary" type="button" onClick={onStartFocus} disabled={!canFocus}>
        <Zap aria-hidden="true" size={17} />
        Lock in
      </button>
      <button className="btn-secondary" type="button" onClick={onPlan}>
        <Plus aria-hidden="true" size={17} />
        Plan
      </button>
      <button className="btn-secondary" type="button" onClick={onApp}>
        <Download aria-hidden="true" size={17} />
        App
      </button>
    </section>
  );
}

function MomentumStrip({
  state,
  derived,
}: {
  state: StudyState;
  derived: ReturnType<typeof useFocusForgeStore>["derived"];
}) {
  const xp = focusXp(state);
  const streak = studyStreak(state);
  const nextWin = derived.nextTask ? minutesLabel(derived.nextTask.estimateMinutes) : "clear";
  const pressureLevel = derived.dueSoon.length >= 3 ? "High tempo" : derived.dueSoon.length ? "On deck" : "Clean slate";

  return (
    <section className="momentum-grid" aria-label="Study momentum">
      <MomentumCard icon={Zap} label="Focus XP" value={xp.toLocaleString()} detail="earned from real sessions" tone="cyan" />
      <MomentumCard icon={Trophy} label="Streak" value={`${streak}d`} detail="daily study chain" tone="lime" />
      <MomentumCard icon={Clock} label="Next win" value={nextWin} detail="smallest useful block" tone="pink" />
      <MomentumCard icon={Sparkles} label="Vibe" value={pressureLevel} detail={`${derived.dueSoon.length} deadline signals`} tone="violet" />
    </section>
  );
}

function MomentumCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "lime" | "pink" | "violet";
}) {
  return (
    <article className={`momentum-card momentum-${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase text-[var(--text-muted)]">{label}</span>
        <span className="momentum-icon">
          <Icon aria-hidden="true" size={16} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-black text-[var(--text-strong)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{detail}</p>
    </article>
  );
}

function PlannerView({
  state,
  derived,
  store,
}: {
  state: StudyState;
  derived: ReturnType<typeof useFocusForgeStore>["derived"];
  store: ReturnType<typeof useFocusForgeStore>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-5">
        <section className="surface-panel p-5">
          <SectionTitle icon={BookPlus} title="Add course" detail="Create your own study tracks" />
          <div className="mt-5">
            <CourseForm onAdd={store.addCourse} />
          </div>
        </section>
        <TaskForm state={state} onAdd={store.addTask} />
      </div>
      <section className="surface-panel p-5">
        <SectionTitle icon={CalendarDays} title="Study plan" detail={`${derived.openTasks.length} open tasks`} />
        {derived.openTasks.length ? (
          <TaskList state={state} tasks={derived.openTasks} onComplete={store.completeTask} onActivate={store.activateTask} />
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Plan is clear"
            message="Add the next meaningful task to keep your study queue ready."
          />
        )}
      </section>
    </div>
  );
}

function TaskForm({ state, onAdd }: { state: StudyState; onAdd: ReturnType<typeof useFocusForgeStore>["addTask"] }) {
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "");
  const [type, setType] = useState<StudyTaskType>("practice");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [estimateMinutes, setEstimateMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const selectedCourseId = courseId || state.courses[0]?.id || "";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onAdd({ title, courseId: selectedCourseId, type, priority, dueDate, estimateMinutes: Number(estimateMinutes), notes });

    if (result.ok) {
      setTitle("");
      setPriority("medium");
      setDueDate("");
      setEstimateMinutes("");
      setNotes("");
    }
  }

  return (
    <form className="surface-panel space-y-4 p-5" onSubmit={submit} noValidate>
      <SectionTitle icon={Plus} title="Add task" detail="Validated study block" />
      {!state.courses.length && (
        <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-muted)]">
          Add a course first. Tasks stay disabled until there is a real study track.
        </div>
      )}
      <label className="field-label">
        Task title
        <input
          aria-label="Task title"
          className="field-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={90}
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <label className="field-label">
          Course
          <select
            aria-label="Course"
            className="field-input"
            value={selectedCourseId}
            onChange={(event) => setCourseId(event.target.value)}
            disabled={!state.courses.length}
            required
          >
            {state.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Type
          <select
            aria-label="Type"
            className="field-input"
            value={type}
            onChange={(event) => setType(event.target.value as StudyTaskType)}
          >
            {taskTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
        <label className="field-label">
          Priority
          <select
            aria-label="Priority"
            className="field-input"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
          >
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Due date
          <input
            aria-label="Due date"
            className="field-input"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </label>
        <label className="field-label">
          Minutes
          <input
            aria-label="Minutes"
            className="field-input"
            type="number"
            min="15"
            max="240"
            step="15"
            value={estimateMinutes}
            onChange={(event) => setEstimateMinutes(event.target.value)}
            required
          />
        </label>
      </div>
      <label className="field-label">
        Notes
        <textarea
          aria-label="Task notes"
          className="field-input min-h-24 resize-none"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={240}
        />
      </label>
      <button className="btn-primary w-full" type="submit" disabled={!state.courses.length}>
        <Plus aria-hidden="true" size={17} />
        Save task
      </button>
    </form>
  );
}

function FocusView({
  state,
  derived,
  store,
}: {
  state: StudyState;
  derived: ReturnType<typeof useFocusForgeStore>["derived"];
  store: ReturnType<typeof useFocusForgeStore>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <FocusTimer state={state} nextTask={derived.nextTask} onActivate={store.activateTask} onRecord={store.recordSession} />
      <section className="surface-panel p-5">
        <SectionTitle icon={ListChecks} title="Focus queue" detail={`${derived.openTasks.length} tasks`} />
        {derived.openTasks.length ? (
          <TaskList state={state} tasks={derived.openTasks.slice(0, 6)} onComplete={store.completeTask} onActivate={store.activateTask} compact />
        ) : (
          <EmptyState icon={Target} title="No focus task" message="Add a study task before starting the next block." />
        )}
      </section>
    </div>
  );
}

function FocusTimer({
  state,
  nextTask,
  onActivate,
  onRecord,
}: {
  state: StudyState;
  nextTask?: StudyTask;
  onActivate: (taskId: string) => void;
  onRecord: ReturnType<typeof useFocusForgeStore>["recordSession"];
}) {
  const [selectedTaskId, setSelectedTaskId] = useState(nextTask?.id ?? "");
  const [secondsLeft, setSecondsLeft] = useState(state.settings.focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [quality, setQuality] = useState<FocusSession["quality"]>(4);
  const [distractions, setDistractions] = useState(0);
  const selectedTask = state.tasks.find((task) => task.id === selectedTaskId && task.status !== "done") ?? nextTask;
  const durationSeconds = state.settings.focusMinutes * 60;
  const progress = Math.round(((durationSeconds - secondsLeft) / durationSeconds) * 100);

  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.setTimeout(() => setRunning(false), 0);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [running]);

  function resetTimer() {
    setRunning(false);
    setSecondsLeft(durationSeconds);
  }

  function completeSession() {
    if (!selectedTask) {
      return;
    }

    onRecord(selectedTask.id, state.settings.focusMinutes, selectedTask.title, quality, distractions);
    resetTimer();
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <section className="surface-panel p-5 sm:p-6">
      <SectionTitle icon={Target} title="Focus session" detail={`${state.settings.focusMinutes} minute block`} />
      <div className="mt-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] p-5 text-center">
        <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-glass)]">
          <div>
            <p className="text-5xl font-bold text-[var(--text-strong)]">
              {minutes}:{seconds}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{progress}% complete</p>
          </div>
        </div>
        <div className="mt-5 h-3 rounded-full bg-[var(--surface-muted)]">
          <div className="h-full rounded-full bg-[var(--brand-gradient)]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="field-label">
          Current task
          <select
            aria-label="Current task"
            className="field-input"
            value={selectedTask?.id ?? ""}
            onChange={(event) => {
              setSelectedTaskId(event.target.value);
              onActivate(event.target.value);
            }}
          >
            {state.tasks
              .filter((task) => task.status !== "done")
              .map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
          </select>
        </label>
        <label className="field-label">
          Session quality
          <select
            aria-label="Session quality"
            className="field-input"
            value={quality}
            onChange={(event) => setQuality(Number(event.target.value) as FocusSession["quality"])}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field-label mt-4">
        Distractions
        <input
          aria-label="Distractions"
          className="field-input"
          type="number"
          min="0"
          max="20"
          value={distractions}
          onChange={(event) => setDistractions(Math.max(0, Number(event.target.value)))}
        />
      </label>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button className="btn-primary" type="button" onClick={() => setRunning((value) => !value)} disabled={!selectedTask}>
          {running ? <Pause aria-hidden="true" size={17} /> : <Play aria-hidden="true" size={17} />}
          {running ? "Pause" : "Start"}
        </button>
        <button className="btn-secondary" type="button" onClick={resetTimer}>
          <TimerReset aria-hidden="true" size={17} />
          Reset
        </button>
        <button className="btn-secondary" type="button" onClick={completeSession} disabled={!selectedTask}>
          <CheckCircle2 aria-hidden="true" size={17} />
          Complete
        </button>
      </div>
    </section>
  );
}

function NotesView({ state, store }: { state: StudyState; store: ReturnType<typeof useFocusForgeStore> }) {
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCourseId = courseId || state.courses[0]?.id || "";

    if (store.addNote(selectedCourseId, title, summary)) {
      setTitle("");
      setSummary("");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form className="surface-panel space-y-4 p-5" onSubmit={submit} noValidate>
        <SectionTitle icon={NotebookText} title="Capture note" detail="Course-linked memory" />
        {!state.courses.length && (
          <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-muted)]">
            Create a course in Planner before saving notes.
          </div>
        )}
        <label className="field-label">
          Course
          <select
            aria-label="Note course"
            className="field-input"
            value={courseId || state.courses[0]?.id || ""}
            onChange={(event) => setCourseId(event.target.value)}
            disabled={!state.courses.length}
          >
            {state.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Title
          <input
            aria-label="Note title"
            className="field-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            required
          />
        </label>
        <label className="field-label">
          Summary
          <textarea
            aria-label="Note summary"
            className="field-input min-h-32 resize-none"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={280}
            required
          />
        </label>
        <button className="btn-primary w-full" type="submit" disabled={!state.courses.length}>
          <Plus aria-hidden="true" size={17} />
          Save note
        </button>
      </form>
      <section className="surface-panel p-5">
        <SectionTitle icon={BookOpen} title="Study notes" detail={`${state.notes.length} saved`} />
        {state.notes.length ? (
          <div className="mt-5 grid gap-3">
            {state.notes.map((note) => {
              const course = state.courses.find((item) => item.id === note.courseId);
              return (
                <article className="item-card" key={note.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="course-dot" style={{ background: course?.color }} />
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">{course?.code}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[var(--text-strong)]">{note.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{note.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                      <span className="badge-neutral" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={NotebookText} title="No notes yet" message="Capture concise notes after each study block." />
        )}
      </section>
    </div>
  );
}

function SettingsView({
  state,
  store,
  isOnline,
  onMessage,
}: {
  state: StudyState;
  store: ReturnType<typeof useFocusForgeStore>;
  isOnline: boolean;
  onMessage: (kind: "success" | "info" | "error", title: string, message: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="surface-panel p-5">
        <SectionTitle icon={Settings} title="Settings" detail="Preferences and resilience" />
        <div className="mt-5 grid gap-5">
          <PreferenceGroup title="Theme">
            <SegmentedTheme value={state.settings.theme} onChange={(theme) => store.updateSettings({ theme })} />
          </PreferenceGroup>
          <PreferenceGroup title="Focus rhythm">
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberSetting label="Focus minutes" value={state.settings.focusMinutes} min={15} max={90} onChange={(value) => store.updateSettings({ focusMinutes: value })} />
              <NumberSetting label="Break minutes" value={state.settings.breakMinutes} min={3} max={30} onChange={(value) => store.updateSettings({ breakMinutes: value })} />
              <NumberSetting label="Daily goal" value={state.settings.dailyGoalMinutes} min={30} max={480} onChange={(value) => store.updateSettings({ dailyGoalMinutes: value })} />
            </div>
          </PreferenceGroup>
          <PreferenceGroup title="Accessibility">
            <label className="flex items-center justify-between gap-4 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] p-4">
              <span>
                <span className="block text-sm font-semibold text-[var(--text-strong)]">Reduce transparency</span>
                <span className="block text-sm text-[var(--text-muted)]">Use denser surfaces over blur.</span>
              </span>
              <input
                className="h-5 w-5 accent-[var(--brand-mark)]"
                type="checkbox"
                checked={state.settings.reduceTransparency}
                onChange={(event) => store.updateSettings({ reduceTransparency: event.target.checked })}
              />
            </label>
          </PreferenceGroup>
        </div>
      </section>
      <div className="space-y-4">
        <InstallCard onMessage={onMessage} />
        <StatusCard icon={isOnline ? Wifi : WifiOff} title={isOnline ? "Online" : "Offline"} detail={isOnline ? "Sync can run when credentials are configured." : "Changes stay local until connectivity returns."} />
        <StatusCard
          icon={isSupabaseConfigured() ? CheckCircle2 : CloudOff}
          title={isSupabaseConfigured() ? "Supabase configured" : "Local-first mode"}
          detail={
            isSupabaseConfigured()
              ? `${store.pendingSyncCount} study event${store.pendingSyncCount === 1 ? "" : "s"} pending sync.`
              : `${store.pendingSyncCount} study event${store.pendingSyncCount === 1 ? "" : "s"} stored in the local queue.`
          }
        />
        <button className="btn-secondary w-full" type="button" onClick={store.resetWorkspace}>
          <RefreshCw aria-hidden="true" size={17} />
          Clear workspace
        </button>
      </div>
    </div>
  );
}

function SegmentedTheme({ value, onChange }: { value: ThemeMode; onChange: (theme: ThemeMode) => void }) {
  const options: Array<{ value: ThemeMode; label: string; icon: LucideIcon }> = [
    { value: "system", label: "System", icon: Activity },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            className={value === option.value ? "segment-button segment-button-active" : "segment-button"}
            type="button"
            onClick={() => onChange(option.value)}
          >
            <Icon aria-hidden="true" size={16} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function NumberSetting({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field-label">
      {label}
      <input
        aria-label={label}
        className="field-input"
        type="number"
        min={min}
        max={max}
        step="5"
        value={value}
        onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))}
      />
    </label>
  );
}

function TaskList({
  state,
  tasks,
  onComplete,
  onActivate,
  compact = false,
}: {
  state: StudyState;
  tasks: StudyTask[];
  onComplete: (taskId: string) => void;
  onActivate: (taskId: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="mt-5 grid gap-3">
      {tasks.map((task) => {
        const course = courseForTask(state.courses, task);

        return (
          <article className="item-card" key={task.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="course-dot" style={{ background: course?.color ?? "var(--brand-mark)" }} />
                  <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">{course?.code ?? "COURSE"}</span>
                  <span className={priorityClass(task.priority)}>{task.priority}</span>
                  <span className="badge-neutral">{task.type}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-[var(--text-strong)]">{task.title}</h3>
                {!compact && <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{task.notes || "No extra notes."}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays aria-hidden="true" size={14} />
                    {dateLabel(task.dueDate)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock aria-hidden="true" size={14} />
                    {minutesLabel(task.estimateMinutes)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="icon-button" type="button" aria-label={`Set ${task.title} active`} onClick={() => onActivate(task.id)}>
                  <Target aria-hidden="true" size={17} />
                </button>
                <button className="icon-button" type="button" aria-label={`Complete ${task.title}`} onClick={() => onComplete(task.id)}>
                  <CheckCircle2 aria-hidden="true" size={17} />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function UpcomingTasks({
  state,
  tasks,
  onComplete,
  onActivate,
}: {
  state: StudyState;
  tasks: StudyTask[];
  onComplete: (taskId: string) => void;
  onActivate: (taskId: string) => void;
}) {
  return (
    <section className="surface-panel p-5">
      <SectionTitle icon={ListChecks} title="Priority queue" detail={`${tasks.length} visible`} />
      {tasks.length ? (
        <TaskList state={state} tasks={tasks} onComplete={onComplete} onActivate={onActivate} compact />
      ) : (
        <EmptyState icon={CheckCircle2} title="All caught up" message="There are no open tasks in the current plan." />
      )}
    </section>
  );
}

function CourseLoad({ state }: { state: StudyState }) {
  const courseStats = useMemo(
    () =>
      state.courses.map((course) => {
        const openMinutes = state.tasks
          .filter((task) => task.courseId === course.id && task.status !== "done")
          .reduce((total, task) => total + task.estimateMinutes, 0);
        const progress = Math.min(100, Math.round((openMinutes / course.weeklyTargetMinutes) * 100));
        return { course, openMinutes, progress };
      }),
    [state.courses, state.tasks],
  );

  return (
    <section className="surface-panel p-5">
      <SectionTitle icon={BarChart3} title="Course load" detail="Weekly target coverage" />
      {courseStats.length ? (
        <div className="mt-5 space-y-4">
          {courseStats.map(({ course, openMinutes, progress }) => (
            <div key={course.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="course-dot" style={{ background: course.color }} />
                  <span className="text-sm font-semibold text-[var(--text-strong)]">{course.code}</span>
                </div>
                <span className="text-sm text-[var(--text-muted)]">{minutesLabel(openMinutes)}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[var(--surface-muted)]">
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: course.color }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title="No courses yet" message="Create your first course in Planner to unlock load tracking." />
      )}
    </section>
  );
}

function TodayPanel({ state, minutesToday, progress }: { state: StudyState; minutesToday: number; progress: number }) {
  return (
    <section className="surface-panel p-4">
      <div className="flex items-center gap-3">
        <FocusForgeMark className="h-10 w-10" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-strong)]">Today</p>
          <p className="text-xs text-[var(--text-muted)]">{minutesLabel(minutesToday)} logged</p>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-[var(--surface-muted)]">
        <div className="h-full rounded-full bg-[var(--brand-gradient)]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">Goal: {minutesLabel(state.settings.dailyGoalMinutes)}</p>
    </section>
  );
}

function SyncPanel({
  isOnline,
  state,
  pendingSyncCount,
}: {
  isOnline: boolean;
  state: StudyState;
  pendingSyncCount: number;
}) {
  return (
    <section className="surface-panel p-5">
      <SectionTitle icon={isOnline ? Wifi : WifiOff} title="Sync state" detail={isOnline ? "Network available" : "Offline"} />
      <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
        {isSupabaseConfigured()
          ? `${pendingSyncCount} pending. Last local write ${state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleString() : "pending"}.`
          : `${pendingSyncCount} event${pendingSyncCount === 1 ? "" : "s"} stored locally until Supabase env values are added.`}
      </p>
    </section>
  );
}

function InsightPanel({
  state,
  derived,
}: {
  state: StudyState;
  derived: ReturnType<typeof useFocusForgeStore>["derived"];
}) {
  const qualityAverage = state.sessions.length
    ? (state.sessions.reduce((total, session) => total + session.quality, 0) / state.sessions.length).toFixed(1)
    : "0";

  return (
    <section className="surface-panel p-5">
      <SectionTitle icon={Activity} title="Study signal" detail="Quality and load" />
      <dl className="mt-4 grid gap-3">
        <Stat label="Quality avg" value={`${qualityAverage}/5`} />
        <Stat label="Due soon" value={String(derived.dueSoon.length)} />
        <Stat label="Notes" value={String(state.notes.length)} />
      </dl>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="surface-panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-strong)]">{value}</p>
        </div>
        <div className="icon-surface">
          <Icon aria-hidden="true" size={20} />
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--text-muted)]">{detail}</p>
    </article>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="icon-surface">
          <Icon aria-hidden="true" size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">{title}</h2>
          <p className="text-sm text-[var(--text-muted)]">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3">
      <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-[var(--text-strong)]">{value}</dd>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--surface-solid)] text-[var(--brand-mark)]">
        <Icon aria-hidden="true" size={22} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--text-strong)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">{message}</p>
    </div>
  );
}

function PreferenceGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-muted)]">{title}</h3>
      {children}
    </section>
  );
}

function StatusCard({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <section className="surface-panel p-5">
      <div className="flex items-start gap-3">
        <div className="icon-surface">
          <Icon aria-hidden="true" size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{detail}</p>
        </div>
      </div>
    </section>
  );
}

function OfflineBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[var(--warning-bg)] px-4 py-2 text-sm font-semibold text-[var(--warning-text)]">
      <WifiOff aria-hidden="true" size={16} />
      Offline mode active. Changes are preserved locally.
    </div>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ReturnType<typeof useFocusForgeStore>["toasts"]; onDismiss: (id: string) => void }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-50 grid w-[min(92vw,360px)] gap-3">
      {toasts.map((toast) => (
        <div
          className={`toast toast-${toast.kind}`}
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live={toast.kind === "error" ? "assertive" : "polite"}
        >
          <AlertCircle aria-hidden="true" size={18} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-strong)]">{toast.title}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{toast.message}</p>
          </div>
          <button className="icon-button h-8 w-8" type="button" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
            <X aria-hidden="true" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
