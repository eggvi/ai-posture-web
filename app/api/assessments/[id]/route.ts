import {
  assessmentForClient,
  getAssessment,
  hasClientAccess,
  json,
} from "@/lib/assessment-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const row = await getAssessment(id);
  if (!row) return json({ error: "评估任务不存在" }, { status: 404 });
  if (!hasClientAccess(request, row)) return json({ error: "无权访问此评估" }, { status: 401 });
  return json(assessmentForClient(row, request.url));
}
