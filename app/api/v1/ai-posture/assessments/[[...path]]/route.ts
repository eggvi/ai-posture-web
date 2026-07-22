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
import { AUTH_COOKIE, DEVICE_COOKIE, isSameOriginRequest } from "@/lib/server-auth";

const SYH_BACKEND = "https://api.shareyourhealth.cn";
const SYH_MP_APP_ID = "wx67532ea818b427d6";
const SYH_APP_ID = "HEALTH";
const REQUEST_TIMEOUT_MS = 15_000;

function isAllowedRoute(method: string, path: string[]): boolean {
  if (method === "POST" && path.length === 0) return true;
  if (!/^\d+$/.test(path[0] || "")) return false;
  if (method === "GET" && path.length === 1) return true;
  if (method !== "POST" || path.length !== 2) return false;
  return new Set(["upload-credentials", "submit", "feedback"]).has(path[1]);
}

async function proxy(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  if (!isAllowedRoute(request.method, path)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (request.method !== "GET" && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
  }
  const subPath = path.join("/");
  const search = request.nextUrl.search || "";
  const targetUrl = `${SYH_BACKEND}/api/v1/ai-posture/assessments${subPath ? `/${subPath}` : ""}${search}`;

  // 从浏览器请求头读取 token / deviceToken
  const loginToken = request.cookies.get(AUTH_COOKIE)?.value || "";
  const deviceToken = request.cookies.get(DEVICE_COOKIE)?.value || request.headers.get("x-devicetoken") || "";
  if (!loginToken) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  // 显式构造后端要求的完整 header 四件套
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-App-Id", SYH_APP_ID);
  headers.set("X-Platform", "web");
  headers.set("X-Mp-LoginToken", loginToken);
  headers.set("X-Mp-AppId", SYH_MP_APP_ID);
  if (deviceToken) {
    headers.set("X-DeviceToken", deviceToken);
  }

  // 读取请求体（GET/HEAD 无 body）
  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  try {
    const backendResp = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const respText = await backendResp.text();
    return new NextResponse(respText, {
      status: backendResp.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": backendResp.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "评估服务响应超时，请重试" : "评估服务暂时不可用，请重试" },
      { status: timedOut ? 504 : 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
