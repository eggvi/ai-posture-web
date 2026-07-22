/**
 * AI 体态评估 API 服务端代理
 *
 * 为什么不用 next.config.ts 的 rewrites？
 * rewrites 在转发浏览器请求时，自定义 header（X-Mp-LoginToken / X-Mp-AppId 等）不会被可靠透传，
 * 导致 syh-server UserInterceptor 因缺 X-Mp-AppId 跳过登录校验而返回 403。
 *
 * 这里改为 Next.js Route Handler，在服务端显式构造完整的 X-Mp-* 四件套 header 再转发，
 * header 完全可控，不依赖浏览器或 rewrites 的透传行为。
 */

import { NextRequest, NextResponse } from "next/server";

const SYH_BACKEND = "https://api.shareyourhealth.cn";
const SYH_MP_APP_ID = "wx67532ea818b427d6";
const SYH_APP_ID = "HEALTH";

async function proxy(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const subPath = path.join("/");
  const search = request.nextUrl.search || "";
  const targetUrl = `${SYH_BACKEND}/api/v1/ai-posture/assessments${subPath ? `/${subPath}` : ""}${search}`;

  // 从浏览器请求头读取 token / deviceToken
  const loginToken = request.headers.get("x-mp-logintoken") || "";
  const deviceToken = request.headers.get("x-devicetoken") || "";

  // 显式构造后端要求的完整 header 四件套
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-App-Id", SYH_APP_ID);
  headers.set("X-Platform", request.headers.get("x-platform") || "iOS");
  if (loginToken) {
    headers.set("X-Mp-LoginToken", loginToken);
    headers.set("X-Mp-AppId", SYH_MP_APP_ID);
  }
  if (deviceToken) {
    headers.set("X-DeviceToken", deviceToken);
  }

  // 读取请求体（GET/HEAD 无 body）
  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  const backendResp = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    // 禁用缓存，确保每次都打后端
    cache: "no-store",
  });

  const respText = await backendResp.text();

  return new NextResponse(respText, {
    status: backendResp.status,
    headers: {
      "Content-Type": backendResp.headers.get("Content-Type") || "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
