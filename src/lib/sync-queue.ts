import { readJson, writeJson } from "@/lib/safe-storage";
import { isSupabaseConfigured, syncStudyEvent } from "@/lib/supabase";
import type { StudyEventPayload } from "@/lib/types";

const QUEUE_KEY = "focusforge.study-event-queue.v2";
const MAX_QUEUE_SIZE = 80;

type QueuedStudyEvent = StudyEventPayload & {
  queueId: string;
  queuedAt: string;
};

function createQueueId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `event_${crypto.randomUUID()}`;
  }

  return `event_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readQueue() {
  return readJson<QueuedStudyEvent[]>(QUEUE_KEY, []);
}

function writeQueue(queue: QueuedStudyEvent[]) {
  writeJson(QUEUE_KEY, queue.slice(-MAX_QUEUE_SIZE));
}

export function queuedStudyEventCount() {
  return readQueue().length;
}

export function queueStudyEvent(payload: StudyEventPayload) {
  const queue = readQueue();
  const queuedEvent: QueuedStudyEvent = {
    ...payload,
    queueId: createQueueId(),
    queuedAt: new Date().toISOString(),
  };

  writeQueue([...queue, queuedEvent]);
  return queuedEvent;
}

export async function flushStudyEventQueue() {
  const queue = readQueue();

  if (!queue.length || !isSupabaseConfigured()) {
    return { flushed: 0, pending: queue.length, skipped: true };
  }

  const remaining: QueuedStudyEvent[] = [];
  let flushed = 0;

  for (const event of queue) {
    const result = await syncStudyEvent(event);

    if (result.ok) {
      flushed += 1;
    } else {
      remaining.push(event);
    }
  }

  writeQueue(remaining);
  return { flushed, pending: remaining.length, skipped: false };
}
