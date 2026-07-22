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

const SYH_BACKEND = "https://api.shareyourhealth.cn";
const SYH_MP_APP_ID = "wx67532ea818b427d6";
const SYH_APP_ID = "HEALTH";

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const subPath = path.join("/");
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
  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  const backendResp = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const respText = await backendResp.text();

  return new NextResponse(respText, {
    status: backendResp.status,
    headers: {
      "Content-Type":
        backendResp.headers.get("Content-Type") || "application/json",
    },
  });
}

export const POST = proxy;
export const GET = proxy;
