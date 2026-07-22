import type { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE = "ai_posture_session";
export const DEVICE_COOKIE = "ai_posture_device";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const DEVICE_MAX_AGE = 60 * 60 * 24 * 365;

function forwardedValue(value: string | null): string {
  return value?.split(",")[0]?.trim() || "";
}

function requestProtocol(request: NextRequest): string {
  return forwardedValue(request.headers.get("x-forwarded-proto")) || request.nextUrl.protocol.replace(":", "");
}

function requestHost(request: NextRequest): string {
  return forwardedValue(request.headers.get("x-forwarded-host")) || request.headers.get("host") || request.nextUrl.host;
}

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const expected = `${requestProtocol(request)}://${requestHost(request)}`;
    return new URL(origin).origin === expected;
  } catch {
    return false;
  }
}
export function setAuthCookies(
  response: NextResponse,
  request: NextRequest,
  values: { token?: string; deviceToken?: string },
): void {
  const secure = requestProtocol(request) === "https";

  if (values.token) {
    response.cookies.set(AUTH_COOKIE, values.token, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }

  if (values.deviceToken) {
    response.cookies.set(DEVICE_COOKIE, values.deviceToken, {
      httpOnly: true,
      maxAge: DEVICE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }
}

export function clearAuthCookies(response: NextResponse, request: NextRequest): void {
  const secure = requestProtocol(request) === "https";
  for (const name of [AUTH_COOKIE, DEVICE_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }
}
