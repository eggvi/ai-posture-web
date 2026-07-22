"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { getOrCreateDeviceToken } from "@/lib/device";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/ai-posture/start";

  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [sendText, setSendText] = useState("获取验证码");
  const [sending, setSending] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState("");
  const [deviceToken, setDeviceToken] = useState("");

  useEffect(() => {
    setDeviceToken(getOrCreateDeviceToken());
  }, []);

  // 倒计时
  const startCountdown = useCallback(() => {
    let sec = 60;
    setSending(true);
    const timer = setInterval(() => {
      sec--;
      if (sec <= 0) {
        clearInterval(timer);
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

    try {
      const resp = await fetch("/api/v1/users/login-mobile-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-devicetoken": deviceToken,
        },
        body: JSON.stringify({ mobile: phone }),
      });
      const data = await resp.json();
      if (resp.ok && (data.errCode === 0 || data.code === 0)) {
        startCountdown();
      } else {
        setError(data.errMsg || data.msg || "发送失败，请重试");
      }
    } catch {
      setError("网络错误，请检查网络后重试");
    }
  }, [mobile, deviceToken, startCountdown]);

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
      const resp = await fetch("/api/v1/users/login-by-mobile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-devicetoken": deviceToken,
        },
        body: JSON.stringify({ mobile: phone, code }),
      });
      const data = await resp.json();

      if (resp.ok && (data.errCode === 0 || data.code === 0)) {
        // 登录成功，存储 token
        const token = data.data?.token || data.token || "";
        if (token) {
          localStorage.setItem("ai_posture_token", token);
        }
        // 跳转到目标页
        const params = new URLSearchParams();
        if (token) params.set("token", token);
        params.set("device_token", deviceToken);
        router.push(`${redirectTo}?${params.toString()}`);
      } else {
        setError(data.errMsg || data.msg || "登录失败，请检查验证码");
      }
    } catch {
      setError("网络错误，请检查网络后重试");
    } finally {
      setLogging(false);
    }
  }, [mobile, code, deviceToken, redirectTo, router]);

  // 回车快捷登录
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") login();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [login]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--soft)] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[var(--shadow)]">
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
          <h1 className="text-xl font-bold text-[var(--ink)]">AI 体态评估</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">手机号登录，开始你的体态分析</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
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
              maxLength={6}
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="flex-1 rounded-lg border border-[var(--line)] px-4 py-3 text-[var(--ink)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--mint)] focus:ring-1 focus:ring-[var(--mint)]"
            />
            <button
              type="button"
              disabled={sending || !mobile}
              onClick={sendCode}
              className="shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--mint-soft)] text-[var(--mint-deep)] hover:bg-[var(--mint)] hover:text-white"
            >
              {sendText}
            </button>
          </div>
        </div>

        {/* 登录按钮 */}
        <button
          type="button"
          disabled={logging || !mobile || !code}
          onClick={login}
          className="w-full rounded-lg bg-[var(--mint)] py-3 font-semibold text-white transition hover:bg-[var(--mint-deep)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {logging ? "登录中..." : "登录"}
        </button>

        {/* 底部提示 */}
        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          登录即表示同意服务条款和隐私政策
        </p>
      </div>
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
