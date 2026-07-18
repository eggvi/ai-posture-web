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

  let body: {
    reportData?: unknown;
    annotatedImages?: unknown;
    engineVersion?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.reportData || typeof body.reportData !== "object") {
    return json({ error: "reportData is required" }, { status: 400 });
  }

  const annotated = Array.isArray(body.annotatedImages) ? body.annotatedImages : [];
  const now = new Date().toISOString();
  await getBindings().DB.prepare(`
    UPDATE ai_posture_assessments
    SET status = 'COMPLETED', report_json = ?, annotated_json = ?,
        engine_version = ?, completed_at = ?, updated_at = ?, error = NULL
    WHERE id = ?
  `).bind(
    JSON.stringify(body.reportData),
    JSON.stringify(annotated),
    body.engineVersion?.slice(0, 40) || null,
    now,
    now,
    id,
  ).run();
  return json({ ok: true, assessmentId: id });
}
