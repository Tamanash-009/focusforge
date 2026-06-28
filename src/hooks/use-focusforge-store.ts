"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createInitialStudyState } from "@/lib/seed-data";
import { readJson, writeJson } from "@/lib/safe-storage";
import { flushStudyEventQueue, queuedStudyEventCount, queueStudyEvent } from "@/lib/sync-queue";
import type {
  AppSettings,
  Course,
  CourseInput,
  FocusSession,
  StudyNote,
  StudyState,
  StudyTask,
  TaskInput,
  ToastMessage,
} from "@/lib/types";
import { courseInputSchema, firstValidationError, taskInputSchema } from "@/lib/validation";

const STORAGE_KEY = "focusforge.study-state.v3";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(value: string) {
  return value.slice(0, 10) === todayKey();
}

function byDueDate(a: StudyTask, b: StudyTask) {
  return a.dueDate.localeCompare(b.dueDate);
}

function sanitizeState(value: StudyState): StudyState {
  const fallback = createInitialStudyState();
  const courses = Array.isArray(value.courses) ? value.courses : fallback.courses;
  const validCourseIds = new Set(courses.map((course) => course.id));

  return {
    courses,
    tasks: Array.isArray(value.tasks) ? value.tasks.filter((task) => validCourseIds.has(task.courseId)) : fallback.tasks,
    sessions: Array.isArray(value.sessions) ? value.sessions : fallback.sessions,
    notes: Array.isArray(value.notes) ? value.notes.filter((note) => validCourseIds.has(note.courseId)) : fallback.notes,
    settings: {
      ...fallback.settings,
      ...(value.settings ?? {}),
    },
    lastSyncedAt: value.lastSyncedAt,
  };
}

export function useFocusForgeStore() {
  const [state, setState] = useState<StudyState>(() => createInitialStudyState());
  const [isReady, setIsReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const flushPendingEvents = useCallback(async () => {
    const result = await flushStudyEventQueue();
    setPendingSyncCount(result.pending);
    return result;
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const restored = readJson<StudyState>(STORAGE_KEY, createInitialStudyState());
      setState(sanitizeState(restored));
      setIsReady(true);
      setCurrentTime(Date.now());
      setPendingSyncCount(queuedStudyEventCount());
      void flushPendingEvents();
    }, 0);

    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [flushPendingEvents]);

  useEffect(() => {
    function handleOnline() {
      void flushPendingEvents();
    }

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [flushPendingEvents]);

  useEffect(() => {
    if (isReady) {
      writeJson(STORAGE_KEY, state);
    }
  }, [isReady, state]);

  const pushToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = createId("toast");
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const recordStudyEvent = useCallback(
    (payload: Parameters<typeof queueStudyEvent>[0]) => {
      queueStudyEvent(payload);
      setPendingSyncCount(queuedStudyEventCount());
      void flushPendingEvents().then((result) => {
        if (result.flushed > 0) {
          pushToast({
            kind: "success",
            title: "Sync updated",
            message: `${result.flushed} study event${result.flushed === 1 ? "" : "s"} synced.`,
          });
        }
      });
    },
    [flushPendingEvents, pushToast],
  );

  const addCourse = useCallback(
    (input: CourseInput) => {
      const parsed = courseInputSchema.safeParse(input);

      if (!parsed.success) {
        const message = firstValidationError(parsed.error);
        pushToast({ kind: "error", title: "Course not saved", message });
        return { ok: false, message };
      }

      const course: Course = {
        id: createId("course"),
        title: parsed.data.title,
        code: parsed.data.code.toUpperCase(),
        color: parsed.data.color,
        weeklyTargetMinutes: parsed.data.weeklyTargetMinutes,
      };

      setState((current) => ({
        ...current,
        courses: [course, ...current.courses],
      }));

      recordStudyEvent({
        eventType: "course_created",
        occurredAt: new Date().toISOString(),
        metadata: { courseId: course.id, code: course.code },
      });

      pushToast({ kind: "success", title: "Course added", message: `${course.code} is ready for tasks and notes.` });
      return { ok: true, course };
    },
    [pushToast, recordStudyEvent],
  );

  const addTask = useCallback(
    (input: TaskInput) => {
      const parsed = taskInputSchema.safeParse(input);

      if (!parsed.success) {
        const message = firstValidationError(parsed.error);
        pushToast({ kind: "error", title: "Task not saved", message });
        return { ok: false, message };
      }

      const hasCourse = state.courses.some((course) => course.id === parsed.data.courseId);

      if (!hasCourse) {
        const message = "Create a course before adding study tasks.";
        pushToast({ kind: "error", title: "Task not saved", message });
        return { ok: false, message };
      }

      const task: StudyTask = {
        id: createId("task"),
        ...parsed.data,
        status: "planned",
        createdAt: new Date().toISOString(),
      };

      setState((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
      }));

      recordStudyEvent({
        eventType: "task_created",
        taskId: task.id,
        occurredAt: task.createdAt,
        metadata: { priority: task.priority, estimateMinutes: task.estimateMinutes },
      });

      pushToast({ kind: "success", title: "Task added", message: `${task.title} is in your plan.` });
      return { ok: true, task };
    },
    [pushToast, recordStudyEvent, state.courses],
  );

  const completeTask = useCallback(
    (taskId: string) => {
      const completedAt = new Date().toISOString();
      let completedTitle = "Task";

      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id !== taskId) {
            return task;
          }

          completedTitle = task.title;
          return { ...task, status: "done", completedAt };
        }),
      }));

      recordStudyEvent({
        eventType: "task_completed",
        taskId,
        occurredAt: completedAt,
      });

      pushToast({ kind: "success", title: "Completed", message: `${completedTitle} is marked done.` });
    },
    [pushToast, recordStudyEvent],
  );

  const activateTask = useCallback((taskId: string) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId && task.status !== "done" ? { ...task, status: "active" } : task,
      ),
    }));
  }, []);

  const recordSession = useCallback(
    (taskId: string | undefined, minutes: number, title: string, quality: FocusSession["quality"], distractions: number) => {
      const session: FocusSession = {
        id: createId("session"),
        taskId,
        title,
        minutes,
        quality,
        distractions,
        completedAt: new Date().toISOString(),
      };

      setState((current) => ({
        ...current,
        sessions: [session, ...current.sessions],
        tasks: taskId
          ? current.tasks.map((task) =>
              task.id === taskId ? { ...task, status: "done", completedAt: session.completedAt } : task,
            )
          : current.tasks,
        lastSyncedAt: session.completedAt,
      }));

      recordStudyEvent({
        eventType: "focus_completed",
        taskId,
        sessionId: session.id,
        occurredAt: session.completedAt,
        metadata: { minutes, quality, distractions },
      });

      pushToast({ kind: "success", title: "Focus logged", message: `${minutes} minutes added to today's progress.` });
      return session;
    },
    [pushToast, recordStudyEvent],
  );

  const addNote = useCallback(
    (courseId: string, title: string, summary: string) => {
      const cleanTitle = title.trim();
      const cleanSummary = summary.trim();

      const hasCourse = state.courses.some((course) => course.id === courseId);

      if (!hasCourse) {
        pushToast({ kind: "error", title: "Note not saved", message: "Create a course before saving notes." });
        return false;
      }

      if (cleanTitle.length < 3 || cleanSummary.length < 8) {
        pushToast({ kind: "error", title: "Note not saved", message: "Add a clear title and summary." });
        return false;
      }

      const note: StudyNote = {
        id: createId("note"),
        courseId,
        title: cleanTitle.slice(0, 80),
        summary: cleanSummary.slice(0, 280),
        tags: cleanTitle
          .toLowerCase()
          .split(" ")
          .filter((item) => item.length > 4)
          .slice(0, 3),
        updatedAt: new Date().toISOString(),
      };

      setState((current) => ({
        ...current,
        notes: [note, ...current.notes],
      }));

      recordStudyEvent({
        eventType: "note_created",
        occurredAt: note.updatedAt,
        metadata: { courseId },
      });

      pushToast({ kind: "success", title: "Note saved", message: `${note.title} is available in notes.` });
      return true;
    },
    [pushToast, recordStudyEvent, state.courses],
  );

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...settings,
      },
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        hasCompletedOnboarding: true,
      },
    }));
  }, []);

  const resetWorkspace = useCallback(() => {
    const nextState = createInitialStudyState();
    nextState.settings.hasCompletedOnboarding = true;
    setState(nextState);
    writeJson(STORAGE_KEY, nextState);
    pushToast({ kind: "info", title: "Workspace cleared", message: "Your local courses, tasks, notes, and sessions were removed." });
  }, [pushToast]);

  const derived = useMemo(() => {
    const openTasks = state.tasks.filter((task) => task.status !== "done").sort(byDueDate);
    const completedToday = state.tasks.filter((task) => task.completedAt && isToday(task.completedAt));
    const minutesToday = state.sessions
      .filter((session) => isToday(session.completedAt))
      .reduce((total, session) => total + session.minutes, 0);
    const totalMinutes = state.sessions.reduce((total, session) => total + session.minutes, 0);
    const dueSoon = openTasks.filter((task) => {
      const dueAt = new Date(`${task.dueDate}T23:59:59`).getTime();
      return currentTime > 0 && dueAt - currentTime <= 3 * 24 * 60 * 60 * 1000;
    });

    return {
      openTasks,
      completedToday,
      minutesToday,
      totalMinutes,
      dueSoon,
      nextTask: openTasks[0],
      dailyProgress: Math.min(100, Math.round((minutesToday / state.settings.dailyGoalMinutes) * 100)),
    };
  }, [currentTime, state]);

  return {
    state,
    isReady,
    toasts,
    derived,
    addCourse,
    addTask,
    completeTask,
    activateTask,
    recordSession,
    addNote,
    updateSettings,
    completeOnboarding,
    resetWorkspace,
    dismissToast: (id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    pushToast,
    pendingSyncCount,
    flushPendingEvents,
  };
}
