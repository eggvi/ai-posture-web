import {
  POSE_IDS,
  bearerToken,
  getAssessment,
  getBindings,
  json,
  parseUploads,
} from "@/lib/assessment-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const row = await getAssessment(id);
  if (!row) return json({ error: "评估任务不存在" }, { status: 404 });
  if (bearerToken(request) !== row.client_token) return json({ error: "提交凭证无效" }, { status: 401 });
  if (row.status !== "DRAFT") return json({ assessmentId: id, status: row.status });

  const uploads = parseUploads(row.upload_json);
  const missing = POSE_IDS.filter((poseId) => !uploads[poseId]);
  if (missing.length) return json({ error: "请先上传正面、侧面和背面三张照片", missing }, { status: 400 });

  const now = new Date().toISOString();
  await getBindings().DB.prepare(`
    UPDATE ai_posture_assessments
    SET status = 'SUBMITTED', submitted_at = ?, updated_at = ?, error = NULL
    WHERE id = ?
  `).bind(now, now, id).run();

  return json({ assessmentId: id, status: "SUBMITTED" });
}
