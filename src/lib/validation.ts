import { z } from "zod";

export const taskInputSchema = z.object({
  courseId: z.string().min(1, "Choose a course."),
  title: z.string().trim().min(3, "Use at least 3 characters.").max(90, "Keep the task title under 90 characters."),
  type: z.enum(["reading", "assignment", "practice", "review", "exam"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid due date."),
  estimateMinutes: z.coerce.number().int().min(15, "Minimum study block is 15 minutes.").max(240, "Split work longer than 4 hours."),
  notes: z.string().max(240, "Keep notes under 240 characters."),
});

export const courseInputSchema = z.object({
  title: z.string().trim().min(2, "Use at least 2 characters for the course name.").max(80, "Keep the course name under 80 characters."),
  code: z.string().trim().min(2, "Use at least 2 characters for the course code.").max(16, "Keep the course code under 16 characters."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid accent color."),
  weeklyTargetMinutes: z.coerce.number().int().min(30, "Weekly target must be at least 30 minutes.").max(3000, "Weekly target is too high."),
});

export const studyEventSchema = z.object({
  eventType: z.enum(["course_created", "task_created", "task_completed", "focus_completed", "note_created"]),
  taskId: z.string().optional(),
  sessionId: z.string().optional(),
  occurredAt: z.string().datetime(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export function firstValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the highlighted fields.";
}
