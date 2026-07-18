import {
  ensureAssessmentSchema,
  getBindings,
  json,
  type ProfileInput,
} from "@/lib/assessment-store";

function validProfile(value: unknown): value is ProfileInput {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<ProfileInput>;
  return Boolean(
    profile.nickname?.trim() &&
      Number.isFinite(profile.age) && Number(profile.age) >= 12 && Number(profile.age) <= 100 &&
      Number.isFinite(profile.height) && Number(profile.height) >= 100 && Number(profile.height) <= 230 &&
      Number.isFinite(profile.weight) && Number(profile.weight) >= 25 && Number(profile.weight) <= 250 &&
      profile.goal?.trim(),
  );
}

export async function POST(request: Request) {
  let body: {
    profile?: unknown;
    source?: string;
    lang?: string;
    embedded?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求内容不是有效 JSON" }, { status: 400 });
  }

  if (!validProfile(body.profile)) {
    return json({ error: "请完整填写昵称、年龄、身高、体重和评估目标" }, { status: 400 });
  }

  const { DB } = getBindings();
  await ensureAssessmentSchema(DB);

  const id = crypto.randomUUID();
  const clientToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const assetToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const now = new Date().toISOString();

  await DB.prepare(`
    INSERT INTO ai_posture_assessments (
      id, client_token, asset_token, status, source, language, embedded,
      profile_json, upload_json, created_at, updated_at
    ) VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, '{}', ?, ?)
  `).bind(
    id,
    clientToken,
    assetToken,
    body.source?.slice(0, 120) || "direct",
    body.lang?.slice(0, 16) || "zh-CN",
    body.embedded ? 1 : 0,
    JSON.stringify(body.profile),
    now,
    now,
  ).run();

  return json({ assessmentId: id, clientToken, status: "DRAFT" }, { status: 201 });
}
