"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateDeviceToken } from "@/lib/device";

const TERMS_URL = "https://admin.shareyourhealth.cn/fitness_service.html";
const PRIVACY_URL = "https://admin.shareyourhealth.cn/fitness_privacy2.html";
const SAFE_REDIRECT_ORIGIN = "https://eggfitness.local";

type ApiEnvelope = {
  code?: unknown;
  errCode?: unknown;
  error?: unknown;
  errMsg?: unknown;
  msg?: unknown;
};

function getSafeRedirect(value: string | null): string {
  try {
    const url = new URL(value || "/ai-posture/start", SAFE_REDIRECT_ORIGIN);
    if (url.origin !== SAFE_REDIRECT_ORIGIN || url.pathname !== "/ai-posture/start") {
      return "/ai-posture/start";
    }
    for (const key of ["token", "auth_token", "device_token", "deviceToken"]) {
      url.searchParams.delete(key);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/ai-posture/start";
  }
}

function isApiSuccess(data: ApiEnvelope): boolean {
  return data.errCode === 0 || data.code === 0;
}

function apiMessage(data: ApiEnvelope, fallback: string): string {
  for (const value of [data.errMsg, data.msg, data.error]) {
    if (typeof value === "string" && value) return value;
  }
  return fallback;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get("redirect"));

  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [sendText, setSendText] = useState("获取验证码");
  const [sending, setSending] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState("");
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  }, []);

  // 倒计时
  const startCountdown = useCallback(() => {
    let sec = 60;
    setSending(true);
    setSendText(`${sec}s`);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = setInterval(() => {
      sec--;
      if (sec <= 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        setSendText("重新获取");
        setSending(false);
      } else {
        setSendText(`${sec}s`);
      }
    }, 1000);
  }, []);

  // 发送验证码
  const sendCode = useCallback(async () => {
    const phone = mobile.replace(/\s/g, "");
    if (!/^1\d{10}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    setError("");
    setSending(true);
    setSendText("发送中…");

    try {
      const deviceToken = getOrCreateDeviceToken();
      const resp = await fetch("/api/v1/users/login-mobile-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-devicetoken": deviceToken,
        },
        body: JSON.stringify({ mobile: phone }),
      });
      const data = (await resp.json().catch(() => ({}))) as ApiEnvelope;
      if (resp.ok && isApiSuccess(data)) {
        startCountdown();
      } else {
        setError(apiMessage(data, "发送失败，请重试"));
        setSendText("重新获取");
        setSending(false);
      }
    } catch {
      setError("网络错误，请检查网络后重试");
      setSendText("重新获取");
      setSending(false);
    }
  }, [mobile, startCountdown]);

  // 登录
  const login = useCallback(async () => {
    const phone = mobile.replace(/\s/g, "");
    if (!/^1\d{10}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    if (!code || code.length < 4) {
      setError("请输入验证码");
      return;
    }
    setError("");
    setLogging(true);

    try {
      const deviceToken = getOrCreateDeviceToken();
      const resp = await fetch("/api/v1/users/login-by-mobile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-devicetoken": deviceToken,
        },
        body: JSON.stringify({ mobile: phone, code }),
      });
      const data = (await resp.json().catch(() => ({}))) as ApiEnvelope;

      if (resp.ok && isApiSuccess(data)) {
        router.replace(redirectTo);
        router.refresh();
      } else {
        setError(apiMessage(data, "登录失败，请检查验证码"));
      }
    } catch {
      setError("网络错误，请检查网络后重试");
    } finally {
      setLogging(false);
    }
  }, [mobile, code, redirectTo, router]);

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void login();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--soft)] px-4">
      <form className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[var(--shadow)]" onSubmit={submitLogin}>
        {/* Logo / 标题 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mint-soft)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11 5.17-.85 9-5.75 9-11V7l-9-5z"
                fill="var(--mint)"
                stroke="var(--mint-deep)"
                strokeWidth="1.5"
              />
              <path
                d="M8 12l3 3 5-6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="login-title text-xl font-bold text-[var(--ink)]">AI 体态评估</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">手机号登录，开始你的体态分析</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        {/* 手机号 */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
            手机号
          </label>
          <input
            type="tel"
            autoComplete="tel"
            maxLength={11}
            placeholder="请输入手机号"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg border border-[var(--line)] px-4 py-3 text-[var(--ink)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--mint)] focus:ring-1 focus:ring-[var(--mint)]"
          />
        </div>

        {/* 验证码 */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
            验证码
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 py-3 text-[var(--ink)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--mint)] focus:ring-1 focus:ring-[var(--mint)]"
            />
            <button
              type="button"
              disabled={sending || mobile.length !== 11}
              onClick={sendCode}
              className="shrink-0 rounded-lg px-3 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--mint-soft)] text-[var(--mint-deep)] hover:bg-[var(--mint)] hover:text-white"
            >
              {sendText}
            </button>
          </div>
        </div>

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={logging || mobile.length !== 11 || code.length < 4}
          className="w-full rounded-lg bg-[var(--mint)] py-3 font-semibold text-white transition hover:bg-[var(--mint-deep)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {logging ? "登录中..." : "登录"}
        </button>

        {/* 底部提示 */}
        <p className="login-legal mt-6 text-center text-xs text-[var(--muted)]">
          登录即表示同意
          <a href={TERMS_URL} target="_blank" rel="noreferrer">《用户协议》</a>
          和
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer">《隐私政策》</a>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--soft)]">
          <div className="text-[var(--muted)]">加载中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
