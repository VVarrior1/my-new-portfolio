import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { compactIfDue, enqueueHit } from "@/lib/analytics";
import {
  isBot,
  normalizeReferrer,
  sanitizeEventName,
  sanitizePath,
  type Hit,
} from "@/lib/analytics-core";

// Visitor identity is three first-party cookies; no IPs or fingerprints are stored.
//   pf_vid   random id, presence = returning visitor        (1 year)
//   pf_day   UTC day of the visitor's last counted visit     (2 days)
//   pf_seen  short hashes of pages this visitor has opened   (1 year)
//   pf_optout  set by /api/analytics/optout to skip counting (e.g. the site owner)
const YEAR = 60 * 60 * 24 * 365;
const MAX_SEEN = 60;

const pathHash = (path: string) => createHash("sha1").update(path).digest("base64url").slice(0, 7);

function skip(reason: string) {
  return NextResponse.json({ ok: true, counted: false, reason });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    // Accepts both fetch(JSON) and navigator.sendBeacon (text/plain) bodies.
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const host = request.headers.get("host") ?? "";
  if (request.cookies.get("pf_optout")) return skip("opted-out");
  if (isBot(request.headers.get("user-agent"))) return skip("bot");
  if (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) && process.env.ANALYTICS_COUNT_LOCALHOST !== "1") {
    return skip("localhost");
  }

  const now = new Date().toISOString();
  const day = now.slice(0, 10);

  // Old cached clients sent { type: "page", path } or { type: "blog", slug }.
  const type = body.type === "page" || body.type === "blog" ? "view" : body.type;
  const rawPath = body.type === "blog" && typeof body.slug === "string" ? `/blogs/${body.slug}` : body.path;

  let hit: Hit;
  const response = NextResponse.json({ ok: true, counted: true });

  if (type === "event") {
    const name = sanitizeEventName(body.name);
    if (!name) return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
    hit = { kind: "event", name, now, day };
  } else if (type === "view") {
    const path = sanitizePath(rawPath);
    if (!path) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: request.nextUrl.protocol === "https:", path: "/" };
    const newVisitor = !request.cookies.get("pf_vid");
    const newToday = request.cookies.get("pf_day")?.value !== day;
    const seen = (request.cookies.get("pf_seen")?.value ?? "").split(".").filter(Boolean);
    const hash = pathHash(path);
    const newForPath = !seen.includes(hash);

    hit = {
      kind: "view",
      path,
      newVisitor,
      newForPath,
      newToday,
      // Only a visitor's first view of the day carries a referrer, so internal navigation isn't re-counted.
      referrer: newToday ? normalizeReferrer(body.referrer, host.split(":")[0]) : null,
      now,
      day,
    };

    if (newVisitor) response.cookies.set("pf_vid", randomUUID(), { ...cookieOptions, maxAge: YEAR });
    if (newToday) response.cookies.set("pf_day", day, { ...cookieOptions, maxAge: 60 * 60 * 48 });
    if (newForPath) {
      response.cookies.set("pf_seen", [...seen, hash].slice(-MAX_SEEN).join("."), { ...cookieOptions, maxAge: YEAR });
    }
  } else {
    return NextResponse.json({ error: "type must be 'view' or 'event'" }, { status: 400 });
  }

  try {
    await enqueueHit(hit);
  } catch (error) {
    console.error("Failed to record analytics hit:", error);
    return NextResponse.json({ error: "Failed to record hit" }, { status: 503 });
  }

  await compactIfDue();
  return response;
}
