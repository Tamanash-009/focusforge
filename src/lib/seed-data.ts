import type { StudyState } from "@/lib/types";

export function createInitialStudyState(): StudyState {
  return {
    courses: [],
    tasks: [],
    sessions: [],
    notes: [],
    settings: {
      theme: "system",
      focusMinutes: 25,
      breakMinutes: 5,
      dailyGoalMinutes: 120,
      reduceTransparency: false,
      hasCompletedOnboarding: false,
    },
  };
}
