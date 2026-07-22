/**
 * 用户登录/短信 API 服务端代理
 *
 * 代理以下端点到 syh-server：
 * - POST /api/v1/users/login-mobile-code  发送短信验证码
 * - POST /api/v1/users/login-by-mobile    手机号+验证码登录
 *
 * 登录接口不需要 X-Mp-LoginToken，但需要 X-Mp-AppId / X-App-Id / X-DeviceToken。
 */

import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest, setAuthCookies } from "@/lib/server-auth";

const SYH_BACKEND = "https://api.shareyourhealth.cn";
const SYH_MP_APP_ID = "wx67532ea818b427d6";
const SYH_APP_ID = "HEALTH";

const ALLOWED_PATHS = new Set(["login-mobile-code", "login-by-mobile"]);
const REQUEST_TIMEOUT_MS = 10_000;

type JsonObject = Record<string, unknown>;

function readLoginToken(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as JsonObject;
  if (typeof record.token === "string") return record.token;
  if (record.data && typeof record.data === "object") {
    const nestedToken = (record.data as JsonObject).token;
    if (typeof nestedToken === "string") return nestedToken;
  }
  return "";
}

function withoutLoginToken(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const clean = { ...(value as JsonObject) };
  delete clean.token;
  if (clean.data && typeof clean.data === "object") {
    const nested = { ...(clean.data as JsonObject) };
    delete nested.token;
    clean.data = nested;
  }
  return clean;
}

function isSuccessfulEnvelope(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as JsonObject;
  return record.errCode === 0 || record.code === 0;
}

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const subPath = path.join("/");
  if (request.method !== "POST" || !ALLOWED_PATHS.has(subPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
  }
  const targetUrl = `${SYH_BACKEND}/api/v1/users/${subPath}`;

  // 从浏览器请求头读取 deviceToken
  // 登录阶段没有 token，不需要读 X-Mp-LoginToken
  const deviceToken = request.headers.get("x-devicetoken") || "";

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-App-Id", SYH_APP_ID);
  headers.set("X-Platform", "web");
  headers.set("X-Mp-AppId", SYH_MP_APP_ID);
  if (deviceToken) {
    headers.set("X-DeviceToken", deviceToken);
  }

  // 读取请求体
  const body = await request.text();

  try {
    const backendResp = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const responseData = await backendResp.json().catch(() => null);
    const loginSucceeded = subPath === "login-by-mobile" && backendResp.ok && isSuccessfulEnvelope(responseData);
    const loginToken = loginSucceeded ? readLoginToken(responseData) : "";
    if (loginSucceeded && !loginToken) {
      return NextResponse.json({ error: "登录服务未返回有效会话，请稍后重试" }, { status: 502 });
    }
    const response = NextResponse.json(withoutLoginToken(responseData) ?? { error: "Invalid upstream response" }, {
      status: backendResp.status,
      headers: { "Cache-Control": "no-store" },
    });
    setAuthCookies(response, request, {
      token: loginToken || undefined,
      deviceToken: deviceToken || undefined,
    });
    return response;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "登录服务响应超时，请稍后重试" : "登录服务暂时不可用，请稍后重试" },
      { status: timedOut ? 504 : 502 },
    );
  }
}

export const POST = proxy;
