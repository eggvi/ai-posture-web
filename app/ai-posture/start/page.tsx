"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, syhApi, type AssessmentDetail } from "@/lib/syh-api-client";
import { getDeviceToken, getLegacyAuthToken } from "@/lib/syh-api-config";

type Language = "zh" | "en";
type PoseId = "front" | "side" | "back";
type ProfileState = {
  age: string;
  height: string;
  weight: string;
  goal: string;
};
type Measurement = {
  name: string;
  level: string;
  raw_angle_deg?: number | null;
  grade_value?: number | null;
  is_restricted: boolean;
  joints?: string;
  muscles?: string;
  note?: string;
  skipped?: boolean;
};
type Evaluation = {
  pose_id: string;
  pose_name: string;
  detected: boolean;
  preflight_warnings?: string[];
  measurements: Measurement[];
};
type ReportData = {
  summary?: {
    poses_evaluated?: number;
    items_evaluated?: number;
    items_restricted?: number;
    items_normal?: number;
  };
  evaluations?: Evaluation[];
  issues?: Array<{
    pose_id: string;
    pose_name: string;
    item: string;
    level: string;
    joints?: string;
    muscles?: string;
    note?: string;
  }>;
};
type AssessmentPayload = {
  assessmentId: string;
  status: string;
  uploads: Array<{ poseId: PoseId; filename: string; url: string }>;
  reportData: ReportData | null;
  annotatedImages: Array<{ poseId: string; filename: string; url: string }>;
  engineVersion: string | null;
  error: string | null;
};

/** 后端 pose type 映射 */
const BACKEND_POSE: Record<PoseId, string> = {
  front: "FRONT",
  side: "SIDE",
  back: "BACK",
};

const copy = {
  zh: {
    brand: "蛋壳跟练",
    back: "返回介绍",
    title: "AI 体态评估",
    stepLabels: ["填写资料", "上传照片", "生成报告"],
    infoTitle: "先了解你的基本情况",
    infoBody: "只填写生成本次报告所需的资料，不会公开展示。",
    age: "年龄",
    height: "身高（cm）",
    weight: "体重（kg）",
    goal: "评估目标",
    goalOptions: [
      { label: "改善日常体态", value: "IMPROVE_POSTURE" },
      { label: "全面了解身体状态", value: "UNDERSTAND_POSTURE" },
    ],
    consent: "我同意照片仅用于本次 AI 体态评估，并已阅读健康提示。",
    next: "下一步：上传照片",
    photoTitle: "上传正面、侧面、背面照片",
    photoBody: "穿贴身运动服，赤脚站立，手机保持竖直；确保从头顶到脚底完整入镜。",
    poseNames: { front: "正面", side: "侧面", back: "背面" },
    poseTips: {
      front: "面向镜头，双脚并拢，双臂自然下垂",
      side: "身体侧对镜头，耳、肩、髋、踝完整可见",
      back: "背对镜头，头发扎起，露出颈肩与脚跟",
    },
    choosePhoto: "拍摄或选择照片",
    replacePhoto: "重新选择",
    uploaded: "已上传",
    uploading: "上传中…",
    submit: "确认三张照片并开始分析",
    processingTitle: "正在分析你的体态",
    processingBody: "AI 正在识别关节点、计算角度并生成标注图。通常需要 1–3 分钟，请保留此页面。",
    submitted: "照片已安全上传",
    queued: "等待算法任务",
    running: "识别关节点与身体对位",
    reportTitle: "你的 AI 体态报告",
    reportSubtitle: "正面、侧面和背面评估已完成",
    restricted: "受限项",
    normal: "正常项",
    views: "完成角度",
    items: "评估项",
    reportViews: "标注结果",
    findings: "重点发现",
    noIssues: "本次自动评估未发现明显受限项。",
    direction: "关注关节 / 肌群",
    note: "算法说明",
    restart: "重新评估",
    failed: "分析未完成",
    retry: "重新开始",
    retryStatus: "重新查询状态",
    draftMissing: "这个草稿缺少本机可提交的信息，请重新填写资料并选择照片。",
    sessionExpired: "登录已过期，正在返回登录页…",
    statusUnavailable: "暂时无法获取分析进度，请检查网络后重新查询。",
    preparingPhoto: "正在优化照片…",
    health: "本页用于健康运动参考，不构成医疗诊断。如有疼痛、麻木或疾病，请咨询专业医疗人员。",
    privacy: "原始照片和报告按评估任务隔离存储，不用于公开展示。",
  },
  en: {
    brand: "EggFitness",
    back: "Back to overview",
    title: "AI posture assessment",
    stepLabels: ["Your details", "Three photos", "Your report"],
    infoTitle: "Tell us a little about you",
    infoBody: "We only collect the details required to produce this report. They are never shown publicly.",
    age: "Age",
    height: "Height (cm)",
    weight: "Weight (kg)",
    goal: "Assessment goal",
    goalOptions: [
      { label: "Improve everyday posture", value: "IMPROVE_POSTURE" },
      { label: "Understand my overall posture", value: "UNDERSTAND_POSTURE" },
    ],
    consent: "I agree that my photos may be used for this AI posture assessment and have read the health notice.",
    next: "Next: upload photos",
    photoTitle: "Upload front, side, and back photos",
    photoBody: "Wear fitted activewear, stand barefoot, and keep the phone upright. Your full body must be visible.",
    poseNames: { front: "Front", side: "Side", back: "Back" },
    poseTips: {
      front: "Face the camera, feet together, arms relaxed",
      side: "Turn sideways; keep ear, shoulder, hip, and ankle visible",
      back: "Face away; tie up hair and keep heels visible",
    },
    choosePhoto: "Take or choose photo",
    replacePhoto: "Replace",
    uploaded: "Uploaded",
    uploading: "Uploading…",
    submit: "Confirm photos and start analysis",
    processingTitle: "Analyzing your posture",
    processingBody: "AI is detecting joints, measuring angles, and producing annotated views. This usually takes 1–3 minutes.",
    submitted: "Photos uploaded securely",
    queued: "Waiting for the analysis worker",
    running: "Detecting joints and alignment",
    reportTitle: "Your AI posture report",
    reportSubtitle: "Front, side, and back assessments are complete",
    restricted: "Limited",
    normal: "Normal",
    views: "Views",
    items: "Measurements",
    reportViews: "Annotated views",
    findings: "Key findings",
    noIssues: "No clear limitations were identified by the automated assessment.",
    direction: "Joints / muscles to consider",
    note: "Analysis note",
    restart: "New assessment",
    failed: "Analysis could not be completed",
    retry: "Start again",
    retryStatus: "Check status again",
    draftMissing: "This draft is missing local submission data. Please enter your details and choose the photos again.",
    sessionExpired: "Your session expired. Returning to sign in…",
    statusUnavailable: "We cannot retrieve the analysis status right now. Check your connection and try again.",
    preparingPhoto: "Optimizing photo…",
    health: "For fitness and wellness reference only. This is not a medical diagnosis. Consult a clinician for pain, numbness, or illness.",
    privacy: "Original photos and reports are isolated by assessment and are not displayed publicly.",
  },
} as const;

const poseIds: PoseId[] = ["front", "side", "back"];
const PRIVACY_URL = "https://admin.shareyourhealth.cn/fitness_privacy2.html";
const TERMS_URL = "https://admin.shareyourhealth.cn/fitness_service.html";
const MAX_POLL_FAILURES = 3;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;

const emptyProfile: ProfileState = {
  age: "",
  height: "",
  weight: "",
  goal: "",
};

type DraftState = {
  profile: ProfileState;
  imageKeys: Partial<Record<PoseId, string>>;
};

function isPoseId(value: string): value is PoseId {
  return poseIds.includes(value as PoseId);
}

function asReportData(value: unknown): ReportData | null {
  return value && typeof value === "object" ? value as ReportData : null;
}

function draftStorageKey(id: string): string {
  return `ai_posture_draft:${id}`;
}

function readDraft(id: string): DraftState | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(draftStorageKey(id)) || "null") as Partial<DraftState> | null;
    const profile = value?.profile;
    if (!profile || typeof profile.age !== "string" || typeof profile.height !== "string" || typeof profile.weight !== "string" || typeof profile.goal !== "string") {
      return null;
    }
    return { profile, imageKeys: value?.imageKeys || {} };
  } catch {
    return null;
  }
}

function writeDraft(id: string, value: DraftState): void {
  sessionStorage.setItem(draftStorageKey(id), JSON.stringify(value));
}

function removeDraft(id: string): void {
  sessionStorage.removeItem(draftStorageKey(id));
}

function requestError(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

async function optimizePhoto(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) throw new Error("Unsupported image data");

  if (typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  const longestEdge = Math.max(bitmap.width, bitmap.height);
  if (longestEdge < 1800 && file.size < 2 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, 1800 / longestEdge);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) return file;
  const basename = file.name.replace(/\.[^.]+$/, "") || "posture-photo";
  return new File([blob], `${basename}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

export default function AssessmentStartPage() {
  const [language, setLanguage] = useState<Language>("zh");
  const [embedded, setEmbedded] = useState(false);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState(1);
  const [profile, setProfile] = useState<ProfileState>(emptyProfile);
  const [consent, setConsent] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [previews, setPreviews] = useState<Partial<Record<PoseId, string>>>({});
  const [uploaded, setUploaded] = useState<Partial<Record<PoseId, boolean>>>({});
  const [imageKeys, setImageKeys] = useState<Partial<Record<PoseId, string>>>({});
  const [uploading, setUploading] = useState<PoseId | null>(null);
  const [payload, setPayload] = useState<AssessmentPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activePose, setActivePose] = useState("front");
  const [pollRevision, setPollRevision] = useState(0);
  const previewUrls = useRef(new Set<string>());

  const t = copy[language];
  const allUploaded = poseIds.every((poseId) => uploaded[poseId]);

  /** 将后端 AIPostureAssessmentRes 转为前端 AssessmentPayload */
  const apiToPayload = useCallback((data: AssessmentDetail): AssessmentPayload => {
    const images = data.images.flatMap((image) => {
      const poseId = image.poseType.toLowerCase();
      return isPoseId(poseId) ? [{ ...image, poseId }] : [];
    });
    return {
      assessmentId: String(data.id),
      status: data.status,
      uploads: images.map((image) => ({
        poseId: image.poseId,
        filename: "",
        url: image.originalUrl || "",
      })),
      reportData: asReportData(data.reportData),
      annotatedImages: images.map((image) => ({
        poseId: image.poseId,
        filename: "",
        url: image.annotatedUrl || image.originalUrl || "",
      })),
      engineVersion: data.engineVersion,
      error: data.errorMessage || null,
    };
  }, []);

  const loadAssessment = useCallback(async (id: string, messageLanguage?: Language) => {
    const data = await syhApi.getAssessment(id);
    const next = apiToPayload(data);
    setPayload(next);
    if (next.status === "DRAFT") {
      setPreviews(Object.fromEntries(next.uploads.map((item) => [item.poseId, item.url])));
      const draft = readDraft(id);
      if (draft) {
        setProfile(draft.profile);
        setConsent(true);
        setImageKeys(draft.imageKeys);
        setUploaded(Object.fromEntries(next.uploads.map((item) => [item.poseId, Boolean(draft.imageKeys[item.poseId])])));
        setStage(2);
      } else {
        setImageKeys({});
        setUploaded({});
        setStage(1);
        const resolvedLanguage = messageLanguage || (document.documentElement.lang.startsWith("en") ? "en" : "zh");
        setError(copy[resolvedLanguage].draftMissing);
      }
    } else {
      removeDraft(id);
      setStage(3);
    }
    return next;
  }, [apiToPayload]);

  const redirectToLogin = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["token", "auth_token", "device_token", "deviceToken"]) params.delete(key);
    const query = params.toString();
    const returnTo = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.location.replace(`/ai-posture/login?redirect=${encodeURIComponent(returnTo)}`);
  }, []);

  const handleRequestError = useCallback((reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 401) {
      setError(copy[language].sessionExpired);
      redirectToLogin();
      return;
    }
    setError(requestError(reason));
  }, [language, redirectToLogin]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        if (cancelled) return;
        const params = new URLSearchParams(window.location.search);
        const requestedLanguage = params.get("lang")?.toLowerCase();
        const nextLanguage: Language = requestedLanguage?.startsWith("en") ? "en" : "zh";
        const isEmbedded = params.get("embedded") === "1";
        setLanguage(nextLanguage);
        document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
        setEmbedded(isEmbedded);
        const id = params.get("id") || "";
        const deviceFromUrl = isEmbedded ? params.get("device_token") || params.get("deviceToken") || "" : "";
        const legacyToken = getLegacyAuthToken(isEmbedded);
        const deviceToken = deviceFromUrl || getDeviceToken();

        for (const key of ["token", "auth_token", "device_token", "deviceToken"]) params.delete(key);
        const cleanQuery = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);

        try {
          if (legacyToken) {
            const exchange = await fetch("/api/auth/session", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: legacyToken, deviceToken }),
            });
            if (!exchange.ok) throw new Error("Unable to establish a secure session");
            for (const key of ["syh_auth_token", "ai_posture_token"]) localStorage.removeItem(key);
          }

          const sessionResponse = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
          const session = await sessionResponse.json() as { authenticated?: boolean };
          if (!sessionResponse.ok || !session.authenticated) {
            redirectToLogin();
            return;
          }

          if (id) {
            setAssessmentId(id);
            try {
              await loadAssessment(id, nextLanguage);
            } catch (reason) {
              if (reason instanceof ApiError && reason.status === 401) {
                redirectToLogin();
                return;
              }
              setError(requestError(reason));
              setStage(1);
            }
          }
          if (!cancelled) setReady(true);
        } catch (reason) {
          if (!cancelled) {
            setError(requestError(reason));
            setReady(true);
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAssessment, redirectToLogin]);

  useEffect(() => {
    if (!assessmentId || stage !== 3) return;
    if (payload?.status === "SUCCEEDED" || payload?.status === "FAILED") return;
    let stopped = false;
    let failures = 0;
    let timer: number | undefined;
    const startedAt = Date.now();

    const schedule = (delay: number) => {
      timer = window.setTimeout(() => void poll(), delay);
    };
    const poll = async () => {
      if (stopped) return;
      if (document.hidden) {
        schedule(4000);
        return;
      }
      if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
        setError(copy[language].statusUnavailable);
        return;
      }
      try {
        const next = await loadAssessment(assessmentId);
        failures = 0;
        setError("");
        if (next.status !== "SUCCEEDED" && next.status !== "FAILED") schedule(4000);
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 401) {
          redirectToLogin();
          return;
        }
        failures += 1;
        if (failures >= MAX_POLL_FAILURES) {
          setError(copy[language].statusUnavailable);
          return;
        }
        schedule(4000 * 2 ** (failures - 1));
      }
    };
    const onVisibilityChange = () => {
      if (!document.hidden) {
        if (timer) window.clearTimeout(timer);
        void poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule(4000);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [assessmentId, language, loadAssessment, payload?.status, pollRevision, redirectToLogin, stage]);

  useEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    previewUrls.current.clear();
  }, []);

  const updateProfile = (key: keyof ProfileState, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!consent) {
      setError(language === "zh" ? "请先同意照片使用与健康提示" : "Please accept the photo and health notice");
      return;
    }
    setBusy(true);
    try {
      const data = await syhApi.createAssessment();
      const id = String(data.id);
      setAssessmentId(id);
      writeDraft(id, { profile, imageKeys });
      const params = new URLSearchParams(window.location.search);
      params.set("id", id);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      setStage(2);
    } catch (reason) {
      handleRequestError(reason);
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (poseId: PoseId, file?: File) => {
    if (!file || !assessmentId || uploading) return;
    setError("");
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 12 * 1024 * 1024) {
      setError(language === "zh" ? "请上传 12MB 以内的 JPG、PNG 或 WebP 照片" : "Upload a JPG, PNG, or WebP photo under 12MB");
      return;
    }
    setUploading(poseId);
    try {
      const optimizedFile = await optimizePhoto(file);
      const preview = URL.createObjectURL(optimizedFile);
      previewUrls.current.add(preview);
      setPreviews((current) => {
        const previous = current[poseId];
        if (previous?.startsWith("blob:")) {
          URL.revokeObjectURL(previous);
          previewUrls.current.delete(previous);
        }
        return { ...current, [poseId]: preview };
      });
      setUploaded((current) => ({ ...current, [poseId]: false }));
      const credential = await syhApi.getUploadCredential(assessmentId, BACKEND_POSE[poseId]);
      await syhApi.uploadToQiniu(credential, optimizedFile);
      const nextKeys = { ...imageKeys, [poseId]: credential.key };
      setImageKeys(nextKeys);
      writeDraft(assessmentId, { profile, imageKeys: nextKeys });
      setUploaded((current) => ({ ...current, [poseId]: true }));
    } catch (reason) {
      setUploaded((current) => ({ ...current, [poseId]: false }));
      if (requestError(reason) === "Unsupported image data") {
        setError(language === "zh" ? "照片内容无法识别，请重新选择 JPG、PNG 或 WebP 图片" : "The photo data is invalid. Choose a JPG, PNG, or WebP image.");
      } else {
        handleRequestError(reason);
      }
    } finally {
      setUploading(null);
    }
  };

  const submitAssessment = async () => {
    if (!allUploaded || busy) return;
    const frontKey = imageKeys.front;
    const sideKey = imageKeys.side;
    const backKey = imageKeys.back;
    if (!frontKey || !sideKey || !backKey) {
      setError(language === "zh" ? "照片状态不完整，请重新选择未完成的照片" : "Photo state is incomplete. Re-select unfinished photos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await syhApi.submitAssessment(assessmentId, {
        age: Number(profile.age),
        height: Number(profile.height),
        weight: Number(profile.weight),
        goal: profile.goal,
        frontImageKey: frontKey,
        sideImageKey: sideKey,
        backImageKey: backKey,
      });
      removeDraft(assessmentId);
      setStage(3);
      setPayload(apiToPayload(data));
    } catch (reason) {
      handleRequestError(reason);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    if (assessmentId) removeDraft(assessmentId);
    const params = new URLSearchParams(window.location.search);
    for (const key of ["id", "token", "auth_token", "device_token", "deviceToken"]) params.delete(key);
    const query = params.toString();
    window.location.assign(`${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  return (
    <div className={`assessment-flow ${embedded ? "is-embedded" : "is-browser"}`}>
      {!embedded && (
        <header className="flow-header">
          <a className="brand" href={`/?lang=${language === "zh" ? "zh-CN" : "en"}`}>
            <img src="/images/brand/logo.jpg" alt="" />
            <span>{t.brand}</span>
          </a>
          <a className="flow-back" href={`/?lang=${language === "zh" ? "zh-CN" : "en"}`}>← {t.back}</a>
        </header>
      )}

      <main className="flow-main">
        <div className="flow-intro">
          <p className="eyebrow">EGG · AI POSTURE</p>
          <h1>{t.title}</h1>
          <ol className="flow-progress" aria-label="Assessment progress">
            {t.stepLabels.map((label, index) => (
              <li key={label} className={stage >= index + 1 ? "is-active" : ""}>
                <span>{index + 1}</span>{label}
              </li>
            ))}
          </ol>
        </div>

        {!ready ? (
          <section className="flow-panel processing-panel flow-session-loading" aria-live="polite">
            <div className="analysis-orbit"><span /><span /><strong>AI</strong></div>
            <p>{language === "zh" ? "正在安全连接评估服务…" : "Connecting securely to the assessment service…"}</p>
          </section>
        ) : stage === 1 && (
          <form className="flow-panel profile-panel" onSubmit={saveProfile}>
            <div className="flow-panel-heading">
              <span className="panel-kicker">01</span>
              <div><h2>{t.infoTitle}</h2><p>{t.infoBody}</p></div>
            </div>
            <div className="field-grid">
              <label className="field"><span>{t.age}</span><input required inputMode="numeric" type="number" min="12" max="100" value={profile.age} onChange={(e) => updateProfile("age", e.target.value)} /></label>
              <label className="field"><span>{t.height}</span><input required inputMode="decimal" type="number" min="100" max="230" value={profile.height} onChange={(e) => updateProfile("height", e.target.value)} /></label>
              <label className="field"><span>{t.weight}</span><input required inputMode="decimal" type="number" min="25" max="250" step="0.1" value={profile.weight} onChange={(e) => updateProfile("weight", e.target.value)} /></label>
              <label className="field"><span>{t.goal}</span><select required value={profile.goal} onChange={(e) => updateProfile("goal", e.target.value)}><option value="">—</option>{t.goalOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            </div>
            <label className="consent-row">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t.consent} <a href={TERMS_URL} target="_blank" rel="noreferrer">{language === "zh" ? "用户协议" : "Terms"}</a> · <a href={PRIVACY_URL} target="_blank" rel="noreferrer">{language === "zh" ? "隐私政策" : "Privacy policy"}</a></span>
            </label>
            {error && <p className="flow-error" role="alert">{error}</p>}
            <button className="flow-primary" type="submit" disabled={busy}>{busy ? "…" : t.next}<span>→</span></button>
          </form>
        )}

        {stage === 2 && (
          <section className="flow-panel photo-panel">
            <div className="flow-panel-heading">
              <span className="panel-kicker coral">02</span>
              <div><h2>{t.photoTitle}</h2><p>{t.photoBody}</p></div>
            </div>
            <div className="photo-upload-grid">
              {poseIds.map((poseId) => (
                <article className={`photo-upload-card ${uploaded[poseId] ? "is-complete" : ""}`} key={poseId}>
                  <div className="photo-preview">
                    <img src={previews[poseId] || `/images/ai/${poseId}.webp`} alt={t.poseNames[poseId]} decoding="async" width="1050" height="1400" />
                    {!previews[poseId] && <div className="guide-overlay"><span>{t.poseNames[poseId]}</span></div>}
                    {uploaded[poseId] && <span className="upload-check">✓ {t.uploaded}</span>}
                  </div>
                  <div className="photo-card-copy"><h3>{t.poseNames[poseId]}</h3><p>{t.poseTips[poseId]}</p></div>
                  <label className={`photo-picker ${uploading !== null && uploading !== poseId ? "is-disabled" : ""}`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={uploading !== null} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void uploadPhoto(poseId, file); }} />
                    {uploading === poseId ? t.uploading : uploaded[poseId] ? t.replacePhoto : t.choosePhoto}
                  </label>
                </article>
              ))}
            </div>
            {error && <p className="flow-error" role="alert">{error}</p>}
            <button className="flow-primary" type="button" disabled={!allUploaded || busy || uploading !== null} onClick={submitAssessment}>{busy ? "…" : t.submit}<span>→</span></button>
            <p className="flow-privacy">🔒 {t.privacy}</p>
          </section>
        )}

        {stage === 3 && payload?.status === "SUCCEEDED" && payload.reportData ? (
          <ResultView payload={payload} t={t} activePose={activePose} setActivePose={setActivePose} restart={restart} />
        ) : stage === 3 && payload?.status === "FAILED" ? (
          <section className="flow-panel failure-panel"><div className="failure-icon">!</div><h2>{t.failed}</h2><p>{payload.error}</p><button className="flow-primary" type="button" onClick={restart}>{t.retry}</button></section>
        ) : stage === 3 ? (
          <section className="flow-panel processing-panel">
            <div className="analysis-orbit"><span /><span /><span /><strong>AI</strong></div>
            <h2>{t.processingTitle}</h2><p>{t.processingBody}</p>
            <ol className="processing-list"><li className="done">✓ {t.submitted}</li><li className={payload?.status === "QUEUED" ? "current" : "done"}>{payload?.status === "QUEUED" ? "•" : "✓"} {t.queued}</li><li className={payload?.status === "PROCESSING" ? "current" : ""}>• {t.running}</li></ol>
            {error && <p className="flow-error" role="alert">{error}</p>}
            {error && <button className="flow-secondary" type="button" onClick={() => { setError(""); setPollRevision((value) => value + 1); }}>{t.retryStatus}</button>}
          </section>
        ) : null}

        {ready && <aside className="flow-health-note">{t.health}</aside>}
      </main>
    </div>
  );
}

function ResultView({
  payload,
  t,
  activePose,
  setActivePose,
  restart,
}: {
  payload: AssessmentPayload;
  t: (typeof copy)[Language];
  activePose: string;
  setActivePose: (poseId: string) => void;
  restart: () => void;
}) {
  const summary = payload.reportData?.summary || {};
  const evaluations = payload.reportData?.evaluations || [];
  const issues = payload.reportData?.issues || [];
  const visiblePoses = evaluations.map((item) => item.pose_id);
  const resolvedActivePose = visiblePoses.includes(activePose) ? activePose : (visiblePoses[0] || activePose);
  const activeImage = payload.annotatedImages.find((item) => item.poseId === resolvedActivePose) || payload.annotatedImages[0];
  const activeEvaluation = evaluations.find((item) => item.pose_id === resolvedActivePose) || evaluations[0];

  return (
    <section className="result-report">
      <div className="report-hero">
        <div>
          <p className="eyebrow">AI REPORT · {payload.engineVersion || "0.2"}</p>
          <h2>{t.reportTitle}</h2>
          <p>{t.reportSubtitle}</p>
        </div>
        <div className="report-score">
          <strong>{summary.items_evaluated || 0}</strong>
          <span>{t.items}</span>
        </div>
      </div>

      <div className="report-stats">
        <div><strong>{summary.poses_evaluated || 0}</strong><span>{t.views}</span></div>
        <div><strong>{summary.items_restricted || 0}</strong><span>{t.restricted}</span></div>
        <div><strong>{summary.items_normal || 0}</strong><span>{t.normal}</span></div>
      </div>

      <section className="report-block">
        <div className="report-block-heading">
          <span>01</span>
          <h3>{t.reportViews}</h3>
        </div>
        <div className="report-viewer">
          {activeImage ? (
            <img src={activeImage.url} alt={activeEvaluation?.pose_name || resolvedActivePose} decoding="async" loading="lazy" />
          ) : (
            <div className="missing-annotated">{activeEvaluation?.pose_name}</div>
          )}
          <div className="report-view-tabs">
            {evaluations.map((item) => (
              <button
                type="button"
                className={item.pose_id === resolvedActivePose ? "is-active" : ""}
                onClick={() => setActivePose(item.pose_id)}
                key={item.pose_id}
              >
                {item.pose_name}
              </button>
            ))}
          </div>
        </div>
        <div className="measurement-grid">
          {activeEvaluation?.measurements
            .filter((item) => !item.skipped)
            .map((item) => (
              <div
                className={`measurement-chip ${item.is_restricted ? "is-limited" : "is-normal"}`}
                key={item.name}
              >
                <span>{item.name}</span>
                <strong>{item.level}</strong>
                {typeof item.raw_angle_deg === "number" && <small>{item.raw_angle_deg.toFixed(1)}°</small>}
              </div>
            ))}
        </div>
      </section>

      <section className="report-block">
        <div className="report-block-heading">
          <span>02</span>
          <h3>{t.findings}</h3>
        </div>
        {issues.length ? (
          <div className="issue-list">
            {issues.map((issue, index) => {
              const direction = [issue.joints, issue.muscles].filter(Boolean).join(" · ");
              return (
                <article className="issue-card" key={`${issue.pose_id}-${issue.item}-${index}`}>
                  <header>
                    <span>{issue.pose_name}</span>
                    <strong>{issue.level}</strong>
                  </header>
                  <h4>{issue.item}</h4>
                  {direction && (
                    <p>
                      <b>{t.direction}</b><br />
                      {direction}
                    </p>
                  )}
                  {issue.note && (
                    <p>
                      <b>{t.note}</b><br />
                      {issue.note}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="no-issues">✓ {t.noIssues}</div>
        )}
      </section>

      <div className="report-actions">
        <button className="flow-primary" type="button" onClick={restart}>
          {t.restart}<span>↻</span>
        </button>
        <p>🔒 {t.privacy}</p>
      </div>
    </section>
  );
}
