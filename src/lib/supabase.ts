import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { logError } from "@/lib/logger";
import type { StudyEventPayload } from "@/lib/types";

let browserClient: SupabaseClient | null = null;

export const supabaseRuntime = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function isSupabaseConfigured() {
  return Boolean(supabaseRuntime.url && supabaseRuntime.anonKey);
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseRuntime.url, supabaseRuntime.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}

export async function syncStudyEvent(payload: StudyEventPayload) {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return { ok: false, skipped: true };
  }

  const { error } = await client.from("study_events").insert({
    event_type: payload.eventType,
    task_id: payload.taskId ?? null,
    session_id: payload.sessionId ?? null,
    occurred_at: payload.occurredAt,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    logError("supabase.syncStudyEvent", error);
    return { ok: false, skipped: false };
  }

  return { ok: true, skipped: false };
}
