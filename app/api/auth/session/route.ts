import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  clearAuthCookies,
  isSameOriginRequest,
  setAuthCookies,
} from "@/lib/server-auth";

type SessionInput = {
  token?: unknown;
  deviceToken?: unknown;
};

function isValidToken(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= maxLength && !/[\r\n]/.test(value);
}

export function GET(request: NextRequest) {
  return NextResponse.json(
    { authenticated: Boolean(request.cookies.get(AUTH_COOKIE)?.value) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin session requests are not allowed" }, { status: 403 });
  }

  const input = (await request.json().catch(() => null)) as SessionInput | null;
  if (!input || !isValidToken(input.token, 4096)) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
  }

  if (input.deviceToken !== undefined && !isValidToken(input.deviceToken, 256)) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 400 });
  }

  const response = NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  setAuthCookies(response, request, {
    token: input.token,
    deviceToken: typeof input.deviceToken === "string" ? input.deviceToken : undefined,
  });
  return response;
}

export function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin session requests are not allowed" }, { status: 403 });
  }

  const response = NextResponse.json(
    { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearAuthCookies(response, request);
  return response;
}
