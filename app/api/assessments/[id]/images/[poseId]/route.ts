import {
  bearerToken,
  getAssessment,
  getBindings,
  hasClientAccess,
  imageExtension,
  isPoseId,
  json,
  parseUploads,
  type StoredUpload,
} from "@/lib/assessment-store";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; poseId: string }> },
) {
  const { id, poseId } = await context.params;
  if (!isPoseId(poseId)) return json({ error: "不支持的拍摄角度" }, { status: 400 });
  const row = await getAssessment(id);
  if (!row) return json({ error: "评估任务不存在" }, { status: 404 });
  if (bearerToken(request) !== row.client_token) return json({ error: "上传凭证无效" }, { status: 401 });
  if (row.status !== "DRAFT") return json({ error: "此任务已经提交，不能再修改照片" }, { status: 409 });

  const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
  if (!IMAGE_TYPES.has(contentType)) {
    return json({ error: "请上传 JPG、PNG 或 WebP 图片" }, { status: 415 });
  }
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_IMAGE_BYTES) return json({ error: "单张照片不能超过 12MB" }, { status: 413 });

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) {
    return json({ error: "照片为空或超过 12MB" }, { status: 413 });
  }

  const extension = imageExtension(contentType);
  const filename = `${poseId}.${extension}`;
  const key = `assessments/${id}/input/${filename}`;
  const { DB, UPLOADS } = getBindings();
  await UPLOADS.put(key, bytes, {
    httpMetadata: { contentType },
    customMetadata: { assessmentId: id, poseId },
  });

  const uploads = parseUploads(row.upload_json);
  const item: StoredUpload = { poseId, filename, key, contentType, size: bytes.byteLength };
  uploads[poseId] = item;
  await DB.prepare(`
    UPDATE ai_posture_assessments SET upload_json = ?, updated_at = ? WHERE id = ?
  `).bind(JSON.stringify(uploads), new Date().toISOString(), id).run();

  return json({ poseId, filename, size: bytes.byteLength });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; poseId: string }> },
) {
  const { id, poseId } = await context.params;
  if (!isPoseId(poseId)) return new Response("Not found", { status: 404 });
  const row = await getAssessment(id);
  if (!row || !hasClientAccess(request, row)) return new Response("Unauthorized", { status: 401 });

  const item = parseUploads(row.upload_json)[poseId];
  if (!item) return new Response("Not found", { status: 404 });
  const object = await getBindings().UPLOADS.get(item.key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
