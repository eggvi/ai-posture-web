"use client";

import { useCallback, useEffect, useState } from "react";

type Language = "zh" | "en";
type PoseId = "front" | "side" | "back";
type ProfileState = {
  nickname: string;
  age: string;
  height: string;
  weight: string;
  occupation: string;
  goal: string;
  painArea: string;
  painLevel: string;
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
type AssessmentPayload = {
  assessmentId: string;
  status: string;
  profile: Record<string, unknown> | null;
  uploads: Array<{ poseId: PoseId; filename: string; url: string }>;
  reportData: {
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
  } | null;
  annotatedImages: Array<{ poseId: string; filename: string; url: string }>;
  engineVersion: string | null;
  error: string | null;
};

const copy = {
  zh: {
    brand: "蛋壳跟练",
    back: "返回介绍",
    title: "AI 体态评估",
    stepLabels: ["填写资料", "上传照片", "生成报告"],
    infoTitle: "先了解你的基本情况",
    infoBody: "这些资料用于解释体态结果和后续训练方向，不会公开展示。",
    nickname: "昵称",
    nicknamePlaceholder: "怎么称呼你",
    age: "年龄",
    height: "身高（cm）",
    weight: "体重（kg）",
    occupation: "职业 / 日常状态（选填）",
    occupationPlaceholder: "例如：久坐办公、宝妈、教练",
    goal: "最想了解的问题",
    goalOptions: ["改善日常体态", "颈肩不适与头前伸", "骨盆与腰背", "腿型与膝踝对位", "全面了解身体状态"],
    painArea: "不适部位（选填）",
    painPlaceholder: "例如：颈部、腰部、膝盖",
    painLevel: "当前不适程度",
    painOptions: ["无明显不适", "轻微", "中等", "较明显"],
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
    health: "本页用于健康运动参考，不构成医疗诊断。如有疼痛、麻木或疾病，请咨询专业医疗人员。",
    privacy: "原始照片和报告按评估任务隔离存储，不用于公开展示。",
  },
  en: {
    brand: "EggFitness",
    back: "Back to overview",
    title: "AI posture assessment",
    stepLabels: ["Your details", "Three photos", "Your report"],
    infoTitle: "Tell us a little about you",
    infoBody: "We use these details to explain your posture results and training direction. They are never shown publicly.",
    nickname: "Name or nickname",
    nicknamePlaceholder: "How should we address you?",
    age: "Age",
    height: "Height (cm)",
    weight: "Weight (kg)",
    occupation: "Work / daily routine (optional)",
    occupationPlaceholder: "e.g. desk work, new parent, coach",
    goal: "What do you want to understand?",
    goalOptions: ["Everyday posture", "Neck and shoulders", "Pelvis and lower back", "Leg and knee alignment", "A full posture overview"],
    painArea: "Area of discomfort (optional)",
    painPlaceholder: "e.g. neck, lower back, knees",
    painLevel: "Current discomfort",
    painOptions: ["None", "Mild", "Moderate", "Noticeable"],
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
    health: "For fitness and wellness reference only. This is not a medical diagnosis. Consult a clinician for pain, numbness, or illness.",
    privacy: "Original photos and reports are isolated by assessment and are not displayed publicly.",
  },
} as const;

const poseIds: PoseId[] = ["front", "side", "back"];
const emptyProfile: ProfileState = {
  nickname: "",
  age: "",
  height: "",
  weight: "",
  occupation: "",
  goal: "",
  painArea: "",
  painLevel: "",
};

function apiError(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "error" in value) return String(value.error);
  return fallback;
}

export default function AssessmentStartPage() {
  const [language, setLanguage] = useState<Language>("zh");
  const [embedded, setEmbedded] = useState(false);
  const [stage, setStage] = useState(1);
  const [profile, setProfile] = useState<ProfileState>(emptyProfile);
  const [consent, setConsent] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [clientToken, setClientToken] = useState("");
  const [previews, setPreviews] = useState<Partial<Record<PoseId, string>>>({});
  const [uploaded, setUploaded] = useState<Partial<Record<PoseId, boolean>>>({});
  const [uploading, setUploading] = useState<PoseId | null>(null);
  const [payload, setPayload] = useState<AssessmentPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activePose, setActivePose] = useState("front");

  const t = copy[language];
  const allUploaded = poseIds.every((poseId) => uploaded[poseId]);

  const loadAssessment = useCallback(async (id: string, token: string) => {
    const response = await fetch(`/api/assessments/${id}?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    const data = await response.json() as AssessmentPayload | { error?: string };
    if (!response.ok) throw new Error(apiError(data, "Unable to load assessment"));
    const next = data as AssessmentPayload;
    setPayload(next);
    if (next.status === "DRAFT") {
      setStage(2);
      setUploaded(Object.fromEntries(next.uploads.map((item) => [item.poseId, true])));
      setPreviews(Object.fromEntries(next.uploads.map((item) => [item.poseId, item.url])));
    } else {
      setStage(3);
    }
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const params = new URLSearchParams(window.location.search);
      const requestedLanguage = params.get("lang")?.toLowerCase();
      setLanguage(requestedLanguage?.startsWith("en") ? "en" : "zh");
      setEmbedded(params.get("embedded") === "1");
      const id = params.get("id") || "";
      const token = params.get("token") || "";
      if (id && token) {
        setAssessmentId(id);
        setClientToken(token);
        loadAssessment(id, token).catch((reason) => setError(String(reason.message || reason)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadAssessment]);

  useEffect(() => {
    if (!assessmentId || !clientToken || stage !== 3) return;
    if (payload?.status === "COMPLETED" || payload?.status === "FAILED") return;
    const timer = window.setInterval(() => {
      loadAssessment(assessmentId, clientToken).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [assessmentId, clientToken, loadAssessment, payload?.status, stage]);

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
      const params = new URLSearchParams(window.location.search);
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            nickname: profile.nickname,
            age: Number(profile.age),
            height: Number(profile.height),
            weight: Number(profile.weight),
            occupation: profile.occupation,
            goal: profile.goal,
            painArea: profile.painArea,
            painLevel: profile.painLevel,
          },
          source: params.get("source") || "ai-posture-page",
          lang: language === "zh" ? "zh-CN" : "en",
          embedded,
        }),
      });
      const data = await response.json() as { assessmentId?: string; clientToken?: string; error?: string };
      if (!response.ok || !data.assessmentId || !data.clientToken) throw new Error(apiError(data, "Unable to create assessment"));
      setAssessmentId(data.assessmentId);
      setClientToken(data.clientToken);
      params.set("id", data.assessmentId);
      params.set("token", data.clientToken);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      setStage(2);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (poseId: PoseId, file?: File) => {
    if (!file || !assessmentId || !clientToken) return;
    setError("");
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 12 * 1024 * 1024) {
      setError(language === "zh" ? "请上传 12MB 以内的 JPG、PNG 或 WebP 照片" : "Upload a JPG, PNG, or WebP photo under 12MB");
      return;
    }
    const preview = URL.createObjectURL(file);
    setPreviews((current) => ({ ...current, [poseId]: preview }));
    setUploading(poseId);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/images/${poseId}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${clientToken}`,
          "content-type": file.type,
        },
        body: file,
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(apiError(data, "Upload failed"));
      setUploaded((current) => ({ ...current, [poseId]: true }));
    } catch (reason) {
      setUploaded((current) => ({ ...current, [poseId]: false }));
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setUploading(null);
    }
  };

  const submitAssessment = async () => {
    if (!allUploaded || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: { authorization: `Bearer ${clientToken}` },
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(apiError(data, "Submission failed"));
      setStage(3);
      await loadAssessment(assessmentId, clientToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("id");
    params.delete("token");
    window.location.href = `${window.location.pathname}?${params.toString()}`;
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

        {stage === 1 && (
          <form className="flow-panel profile-panel" onSubmit={saveProfile}>
            <div className="flow-panel-heading">
              <span className="panel-kicker">01</span>
              <div><h2>{t.infoTitle}</h2><p>{t.infoBody}</p></div>
            </div>
            <div className="field-grid">
              <label className="field"><span>{t.nickname}</span><input required value={profile.nickname} onChange={(e) => updateProfile("nickname", e.target.value)} placeholder={t.nicknamePlaceholder} /></label>
              <label className="field"><span>{t.age}</span><input required inputMode="numeric" type="number" min="12" max="100" value={profile.age} onChange={(e) => updateProfile("age", e.target.value)} /></label>
              <label className="field"><span>{t.height}</span><input required inputMode="decimal" type="number" min="100" max="230" value={profile.height} onChange={(e) => updateProfile("height", e.target.value)} /></label>
              <label className="field"><span>{t.weight}</span><input required inputMode="decimal" type="number" min="25" max="250" step="0.1" value={profile.weight} onChange={(e) => updateProfile("weight", e.target.value)} /></label>
              <label className="field field-wide"><span>{t.occupation}</span><input value={profile.occupation} onChange={(e) => updateProfile("occupation", e.target.value)} placeholder={t.occupationPlaceholder} /></label>
              <label className="field field-wide"><span>{t.goal}</span><select required value={profile.goal} onChange={(e) => updateProfile("goal", e.target.value)}><option value="">—</option>{t.goalOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field"><span>{t.painArea}</span><input value={profile.painArea} onChange={(e) => updateProfile("painArea", e.target.value)} placeholder={t.painPlaceholder} /></label>
              <label className="field"><span>{t.painLevel}</span><select value={profile.painLevel} onChange={(e) => updateProfile("painLevel", e.target.value)}><option value="">—</option>{t.painOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <label className="consent-row"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{t.consent}</span></label>
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
                    <img src={previews[poseId] || `/images/ai/${poseId}.jpg`} alt={t.poseNames[poseId]} />
                    {!previews[poseId] && <div className="guide-overlay"><span>{t.poseNames[poseId]}</span></div>}
                    {uploaded[poseId] && <span className="upload-check">✓ {t.uploaded}</span>}
                  </div>
                  <div className="photo-card-copy"><h3>{t.poseNames[poseId]}</h3><p>{t.poseTips[poseId]}</p></div>
                  <label className="photo-picker">
                    <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => uploadPhoto(poseId, event.target.files?.[0])} />
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

        {stage === 3 && payload?.status === "COMPLETED" && payload.reportData ? (
          <ResultView payload={payload} t={t} activePose={activePose} setActivePose={setActivePose} restart={restart} />
        ) : stage === 3 && payload?.status === "FAILED" ? (
          <section className="flow-panel failure-panel"><div className="failure-icon">!</div><h2>{t.failed}</h2><p>{payload.error}</p><button className="flow-primary" type="button" onClick={restart}>{t.retry}</button></section>
        ) : stage === 3 ? (
          <section className="flow-panel processing-panel">
            <div className="analysis-orbit"><span /><span /><span /><strong>AI</strong></div>
            <h2>{t.processingTitle}</h2><p>{t.processingBody}</p>
            <ol className="processing-list"><li className="done">✓ {t.submitted}</li><li className={payload?.status === "SUBMITTED" ? "current" : "done"}>{payload?.status === "SUBMITTED" ? "•" : "✓"} {t.queued}</li><li className={payload?.status === "PROCESSING" ? "current" : ""}>• {t.running}</li></ol>
            {error && <p className="flow-error">{error}</p>}
          </section>
        ) : null}

        <aside className="flow-health-note">{t.health}</aside>
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
            <img src={activeImage.url} alt={activeEvaluation?.pose_name || resolvedActivePose} />
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
