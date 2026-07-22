/**
 * syh-server API 配置
 * 从 Cloudflare D1/R2 切换到 syh-server 后端
 */

// Next.js rewrites 代理 /api/v1/ai-posture → syh-server，避免浏览器 CORS 问题
// 相对路径即可，Next.js 在服务端转发到 api.shareyourhealth.cn
export const SYH_API_PATHS = {
  // 创建评估
  createAssessment: () => `/api/v1/ai-posture/assessments`,

  // 获取评估详情
  getAssessment: (id: string) => `/api/v1/ai-posture/assessments/${id}`,

  // 获取上传凭证
  getUploadCredentials: (id: string) => `/api/v1/ai-posture/assessments/${id}/upload-credentials`,

  // 提交评估
  submitAssessment: (id: string) => `/api/v1/ai-posture/assessments/${id}/submit`,

  // 提交反馈
  submitFeedback: (id: string) => `/api/v1/ai-posture/assessments/${id}/feedback`,
};

/**
 * 蛋壳跟练 iOS App 的微信开放平台 AppId
 * 来源：iOS 工程 WxManager.swift:16 WXManager.kAppKey，EGVMoyaPlugin.swift:20 设置 X-Mp-AppId
 * syh-server UserInterceptor 要求 X-Mp-LoginToken + X-Mp-AppId 同时存在才做登录校验
 */
export const SYH_MP_APP_ID = "wx67532ea818b427d6";

// X-App-Id 应用标识（HEALTH / FITNESS / YOUTH）
export const SYH_APP_ID = "HEALTH";

/**
 * 从 App 获取用户登录 token
 * 在 App 内嵌 H5 时，App 会通过 URL 参数或 JSBridge 传入 token
 */
export function getAuthToken(): string {
  if (typeof window === "undefined") return "";

  // 方式 1：URL 参数
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get("auth_token") || params.get("token");
  if (tokenFromUrl) return tokenFromUrl;

  // 方式 2：localStorage（App 通过 JSBridge 写入）
  const tokenFromStorage = localStorage.getItem("syh_auth_token");
  if (tokenFromStorage) return tokenFromStorage;

  // 方式 3：H5 手机号登录后写入
  const tokenFromH5 = localStorage.getItem("ai_posture_token");
  if (tokenFromH5) return tokenFromH5;

  // 方式 4：从 window 全局变量（App 注入）
  if ((window as any).syhAuthToken) return (window as any).syhAuthToken;

  return "";
}

/**
 * 从 App 获取设备 token（iOS 设备唯一标识，大写 UUID）
 * 与 token 配对使用，来源 EGVAppInfo.share.deviceId
 */
export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";

  // 方式 1：URL 参数
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("device_token") || params.get("deviceToken");
  if (fromUrl) return fromUrl;

  // 方式 2：localStorage
  const fromStorage = localStorage.getItem("syh_device_token");
  if (fromStorage) return fromStorage;

  // 方式 3：H5 手机号登录后写入
  const fromH5 = localStorage.getItem("ai_posture_device_token");
  if (fromH5) return fromH5;

  // 方式 4：window 全局变量
  if ((window as any).syhDeviceToken) return (window as any).syhDeviceToken;

  return "";
}
