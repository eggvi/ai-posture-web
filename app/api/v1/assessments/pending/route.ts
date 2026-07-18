import {
  ensureAssessmentSchema,
  getBindings,
  json,
  parseUploads,
  workerAuthorized,
  type AssessmentRow,
} from "@/lib/assessment-store";

export async function GET(request: Request) {
  if (!workerAuthorized(request)) return json({ error: "Worker token invalid" }, { status: 401 });
  const { DB } = getBindings();
  await ensureAssessmentSchema(DB);
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(10, Number(url.searchParams.get("limit") || 3)));
  const { results } = await DB.prepare(`
    SELECT * FROM ai_posture_assessments
    WHERE status = 'SUBMITTED'
    ORDER BY submitted_at ASC
    LIMIT ?
  `).bind(limit).all<AssessmentRow>();

  const now = new Date().toISOString();
  const claimed: AssessmentRow[] = [];
  for (const row of results) {
    const updated = await DB.prepare(`
      UPDATE ai_posture_assessments
      SET status = 'PROCESSING', processing_at = ?, updated_at = ?
      WHERE id = ? AND status = 'SUBMITTED'
    `).bind(now, now, row.id).run();
    if (updated.meta.changes) claimed.push(row);
  }

  const origin = url.origin;
  return json(claimed.map((row) => {
    const uploads = parseUploads(row.upload_json);
    return {
      id: row.id,
      uploadData: {
        images: Object.values(uploads).flatMap((item) => item ? [{
          poseId: item.poseId,
          filename: item.filename,
          url: `${origin}/api/assessments/${row.id}/images/${item.poseId}?assetToken=${encodeURIComponent(row.asset_token)}`,
        }] : []),
      },
    };
  }));
}
