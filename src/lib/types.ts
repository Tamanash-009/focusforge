export type ThemeMode = "system" | "light" | "dark";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "planned" | "active" | "done";

export type StudyTaskType = "reading" | "assignment" | "practice" | "review" | "exam";

export type Course = {
  id: string;
  title: string;
  code: string;
  color: string;
  weeklyTargetMinutes: number;
};

export type StudyTask = {
  id: string;
  courseId: string;
  title: string;
  type: StudyTaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  estimateMinutes: number;
  notes: string;
  createdAt: string;
  completedAt?: string;
};

export type FocusSession = {
  id: string;
  taskId?: string;
  title: string;
  minutes: number;
  quality: 1 | 2 | 3 | 4 | 5;
  distractions: number;
  completedAt: string;
};

export type StudyNote = {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: string;
};

export type AppSettings = {
  theme: ThemeMode;
  focusMinutes: number;
  breakMinutes: number;
  dailyGoalMinutes: number;
  reduceTransparency: boolean;
  hasCompletedOnboarding: boolean;
};

export type StudyState = {
  courses: Course[];
  tasks: StudyTask[];
  sessions: FocusSession[];
  notes: StudyNote[];
  settings: AppSettings;
  lastSyncedAt?: string;
};

export type ToastKind = "success" | "error" | "info" | "offline";

export type ToastMessage = {
  id: string;
  kind: ToastKind;
  title: string;
  message: string;
};

export type TaskInput = {
  courseId: string;
  title: string;
  type: StudyTaskType;
  priority: TaskPriority;
  dueDate: string;
  estimateMinutes: number;
  notes: string;
};

export type CourseInput = {
  title: string;
  code: string;
  color: string;
  weeklyTargetMinutes: number;
};

export type StudyEventPayload = {
  eventType: "course_created" | "task_created" | "task_completed" | "focus_completed" | "note_created";
  taskId?: string;
  sessionId?: string;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};
