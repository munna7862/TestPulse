/** Liveness probe for the web app itself (the API has its own `/health`). */
export function GET(): Response {
  return Response.json({ success: true, data: { status: "ok", service: "web" } });
}
