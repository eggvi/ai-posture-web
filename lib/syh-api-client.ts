/**
 * syh-server API 客户端
 * API contract 来自 AIPostureAssessmentApi.java
 */

import { SYH_API_PATHS, getDeviceToken } from "./syh-api-config";

// ============ 后端实际请求体 ============

// POST /{assessmentId}/upload-credentials body: { poseType: "FRONT"|"SIDE"|"BACK" }
// 返回: { poseType, token, key, bucket, uploadUrl }
export type UploadCredential = {
  poseType: string;
  token: string;
  key: string;
  bucket: string;
  uploadUrl: string;
};

// POST /{assessmentId}/submit body
export type SubmitInput = {
  age: number;
  height: number;
  weight: number;
  goal: string;
  frontImageKey: string;
  sideImageKey: string;
  backImageKey: string;
};

// ============ 后端实际响应体（AIPostureAssessmentRes） ============

export type AssessmentDetail = {
  id: number;                         // assessmentId (Long)
  status: string;                     // DRAFT | QUEUED | PROCESSING | SUCCEEDED | FAILED
  age: number | null;
  height: number | null;
  weight: number | null;
  goal: string | null;
  images: Array<{
    poseType: string;                 // FRONT | SIDE | BACK
    originalUrl: string;
    annotatedUrl: string;
  }>;
  reportData: unknown | null;
  engineVersion: string | null;
  errorType: string | null;
  errorMessage: string | null;
  feedbackRating: number | null;
  feedbackComment: string | null;
  submitTime: string | null;
  completeTime: string | null;
};

// ============ HTTP 客户端 ============

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function parseAssessmentDetail(value: unknown): AssessmentDetail {
  if (!isRecord(value) || typeof value.id !== "number" || typeof value.status !== "string" || !Array.isArray(value.images)) {
    throw new ApiError("评估服务返回了无法识别的数据", 502);
  }
  return value as AssessmentDetail;
}

async function clearExpiredSession() {
  if (typeof window === "undefined") return;
  for (const key of ["syh_auth_token", "ai_posture_token"]) localStorage.removeItem(key);
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<unknown> {
  const deviceToken = getDeviceToken();
  const headers = new Headers(options.headers);

  if (deviceToken) {
    headers.set("X-DeviceToken", deviceToken);
  }
  headers.set("X-Platform", "web");

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers,
    signal: options.signal || AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (response.status === 401) await clearExpiredSession();
    const message = [error?.errMsg, error?.error, error?.message].find((value) => typeof value === "string");
    throw new ApiError(typeof message === "string" ? message : `Request failed: ${response.status}`, response.status);
  }

  return response.json() as Promise<unknown>;
}

// ============ API 方法 ============

export const syhApi = {
  /**
   * 创建评估（无 body，后端 createOrResume 用 getUserId()）
   */
  async createAssessment(): Promise<AssessmentDetail> {
    return parseAssessmentDetail(await fetchWithAuth(SYH_API_PATHS.createAssessment(), {
      method: "POST",
    }));
  },

  /**
   * 获取单向照片的上传凭证（每次只请求一种 pose）
   * poseType: "FRONT" | "SIDE" | "BACK"
   */
  async getUploadCredential(assessmentId: string, poseType: string): Promise<UploadCredential> {
    const value = await fetchWithAuth(SYH_API_PATHS.getUploadCredentials(assessmentId), {
      method: "POST",
      body: JSON.stringify({ poseType: poseType.toUpperCase() }),
    });
    if (!isRecord(value) || typeof value.token !== "string" || typeof value.key !== "string" || typeof value.uploadUrl !== "string") {
      throw new ApiError("上传服务返回了无法识别的数据", 502);
    }
    return value as UploadCredential;
  },

  /**
   * 直传图片到七牛（使用 credential 中的 uploadUrl + token + key）
   */
  async uploadToQiniu(credential: UploadCredential, file: File): Promise<void> {
    const uploadUrl = new URL(credential.uploadUrl);
    if (uploadUrl.protocol !== "https:") throw new ApiError("图片上传地址不是安全连接", 502);
    const formData = new FormData();
    formData.append("token", credential.token);
    formData.append("key", credential.key);
    formData.append("file", file);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new ApiError(`Upload failed: ${response.status}`, response.status);
    }
  },

  /**
   * 提交评估（需要年龄/身高/体重/目标 + 三张照片的 key）
   */
  async submitAssessment(assessmentId: string, input: SubmitInput): Promise<AssessmentDetail> {
    return parseAssessmentDetail(await fetchWithAuth(SYH_API_PATHS.submitAssessment(assessmentId), {
      method: "POST",
      body: JSON.stringify(input),
    }));
  },

  /**
   * 查询评估状态和报告
   */
  async getAssessment(assessmentId: string): Promise<AssessmentDetail> {
    return parseAssessmentDetail(await fetchWithAuth(SYH_API_PATHS.getAssessment(assessmentId)));
  },

  /**
   * 提交反馈评分
   */
  async submitFeedback(assessmentId: string, rating: number, comment?: string): Promise<AssessmentDetail> {
    return parseAssessmentDetail(await fetchWithAuth(SYH_API_PATHS.submitFeedback(assessmentId), {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }));
  },
};
