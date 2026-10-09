import { NextRequest, NextResponse } from "next/server";

// Visit /api/analytics/optout once per browser to stop counting your own visits.
// /api/analytics/optout?undo=1 starts counting again.
export async function GET(request: NextRequest) {
  const undo = request.nextUrl.searchParams.has("undo");
  const response = NextResponse.redirect(new URL(`/stats?tracking=${undo ? "on" : "off"}`, request.url));

  if (undo) {
    response.cookies.delete("pf_optout");
  } else {
    response.cookies.set("pf_optout", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 5,
    });
  }
  return response;
}
