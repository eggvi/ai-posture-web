import {
  getAssessment,
  getBindings,
  json,
  workerAuthorized,
} from "@/lib/assessment-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!workerAuthorized(request)) return json({ error: "Worker token invalid" }, { status: 401 });
  const { id } = await context.params;
  const row = await getAssessment(id);
  if (!row) return json({ error: "Assessment not found" }, { status: 404 });
  let message = "算法处理失败";
  try {
    const body = await request.json() as { error?: string };
    if (body.error) message = body.error.slice(0, 1000);
  } catch {}
  const now = new Date().toISOString();
  await getBindings().DB.prepare(`
    UPDATE ai_posture_assessments SET status = 'FAILED', error = ?, updated_at = ? WHERE id = ?
  `).bind(message, now, id).run();
  return json({ ok: true, assessmentId: id });
}
