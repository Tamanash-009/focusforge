import { NextResponse, type NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 80;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const now = Date.now();
  const key = clientKey(request);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  bucket.count += 1;

  if (bucket.count > MAX_REQUESTS) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
