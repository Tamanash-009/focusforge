import { NextResponse } from "next/server";

import { normalizeError } from "@/lib/errors";
import { studyEventSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = studyEventSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid study event." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      acceptedAt: new Date().toISOString(),
      eventType: parsed.data.eventType,
    });
  } catch (error) {
    return NextResponse.json({ error: normalizeError(error) }, { status: 500 });
  }
}
