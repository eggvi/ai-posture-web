import { env } from "cloudflare:workers";

export const POSE_IDS = ["front", "side", "back"] as const;
export type PoseId = (typeof POSE_IDS)[number];

export type ProfileInput = {
  nickname: string;
  age: number;
  height: number;
  weight: number;
  occupation?: string;
  goal: string;
  painArea?: string;
  painLevel?: string;
};

export type StoredUpload = {
  poseId: PoseId;
  filename: string;
  key: string;
  contentType: string;
  size: number;
};

export type AssessmentRow = {
  id: string;
  client_token: string;
  asset_token: string;
  status: string;
  source: string | null;
  language: string;
  embedded: number;
  profile_json: string;
  upload_json: string;
  report_json: string | null;
  annotated_json: string | null;
  engine_version: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  processing_at: string | null;
  completed_at: string | null;
};

type Bindings = {
  DB: D1Database;
  UPLOADS: R2Bucket;
  HYEYES_WORKER_TOKEN?: string;
};

export function getBindings(): Bindings {
  return env as unknown as Bindings;
}

export async function ensureAssessmentSchema(db = getBindings().DB) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ai_posture_assessments (
        id TEXT PRIMARY KEY,
        client_token TEXT NOT NULL,
        asset_token TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        source TEXT,
        language TEXT NOT NULL DEFAULT 'zh-CN',
        embedded INTEGER NOT NULL DEFAULT 0,
        profile_json TEXT NOT NULL,
        upload_json TEXT NOT NULL DEFAULT '{}',
        report_json TEXT,
        annotated_json TEXT,
        engine_version TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        submitted_at TEXT,
        processing_at TEXT,
        completed_at TEXT
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS ai_posture_status_created_idx
      ON ai_posture_assessments(status, created_at)
    `),
  ]);
}

export async function getAssessment(id: string): Promise<AssessmentRow | null> {
  const { DB } = getBindings();
  await ensureAssessmentSchema(DB);
  return DB.prepare("SELECT * FROM ai_posture_assessments WHERE id = ?")
    .bind(id)
    .first<AssessmentRow>();
}

export function parseUploads(value: string | null): Record<PoseId, StoredUpload | undefined> {
  if (!value) return {} as Record<PoseId, StoredUpload | undefined>;
  try {
    return JSON.parse(value) as Record<PoseId, StoredUpload | undefined>;
  } catch {
    return {} as Record<PoseId, StoredUpload | undefined>;
  }
}

export function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function isPoseId(value: string): value is PoseId {
  return POSE_IDS.includes(value as PoseId);
}

export function bearerToken(request: Request): string {
  const value = request.headers.get("authorization") ?? "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

export function hasClientAccess(request: Request, row: AssessmentRow): boolean {
  const url = new URL(request.url);
  const token = bearerToken(request) || url.searchParams.get("token") || "";
  const assetToken = url.searchParams.get("assetToken") || "";
  return token === row.client_token || assetToken === row.asset_token;
}

export function workerAuthorized(request: Request): boolean {
  const { HYEYES_WORKER_TOKEN } = getBindings();
  const host = new URL(request.url).hostname;
  const expected = HYEYES_WORKER_TOKEN ||
    (["127.0.0.1", "localhost"].includes(host) ? "local-dev-hyeyes-token" : "");
  return Boolean(expected) && bearerToken(request) === expected;
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function assessmentForClient(row: AssessmentRow, requestUrl: string) {
  const origin = new URL(requestUrl).origin;
  const uploads = parseUploads(row.upload_json);
  const annotated = safeJson<Array<{ pose_id?: string; poseId?: string; filename?: string }>>(
    row.annotated_json,
    [],
  );
  const token = encodeURIComponent(row.client_token);

  return {
    assessmentId: row.id,
    status: row.status,
    profile: safeJson<ProfileInput | null>(row.profile_json, null),
    uploads: POSE_IDS.flatMap((poseId) => {
      const item = uploads[poseId];
      return item
        ? [{
            poseId,
            filename: item.filename,
            url: `${origin}/api/assessments/${row.id}/images/${poseId}?token=${token}`,
          }]
        : [];
    }),
    reportData: safeJson<Record<string, unknown> | null>(row.report_json, null),
    annotatedImages: annotated.flatMap((item) => {
      const poseId = item.pose_id || item.poseId;
      const filename = item.filename;
      if (!poseId || !filename) return [];
      return [{
        poseId,
        filename,
        url: `${origin}/api/assessments/${row.id}/annotated/${encodeURIComponent(filename)}?token=${token}`,
      }];
    }),
    engineVersion: row.engine_version,
    error: row.error,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
  };
}

export function imageExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}
