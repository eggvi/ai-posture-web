"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Language = "zh" | "en";

const content = {
  zh: {
    brand: "蛋壳跟练",
    navResults: "报告示例",
    navCases: "学员案例",
    navSteps: "使用流程",
    eyebrow: "AI 体态评估",
    heroTitle: "2 分钟，看懂你的体态",
    heroBody:
      "上传正面、侧面和背面 3 张照片，获得身体对称性、关键关节对位和个性化训练方向。",
    chips: ["3 张照片", "约 2 分钟", "个性化报告"],
    heroCaption: "AI 识别关节点与身体对位",
    resultsEyebrow: "你将获得什么",
    resultsTitle: "一眼看懂你的体态报告",
    resultsBody:
      "AI 标注关键关节、角度与受限等级；正面、侧面、背面可左右滑动查看。",
    resultLabels: ["正面评估", "侧面评估", "背面评估"],
    casesEyebrow: "改善案例",
    casesTitle: "真实学员，真实改变",
    casesBody: "来自蛋壳跟练学员的训练记录与反馈。实际结果因个人情况和训练执行而异。",
    casePeriods: ["15 天", "1 个月", "2 周", "2 周", "4 周"],
    caseTags: ["颈前伸 · 骨盆姿态", "骨盆前倾 · 臀线", "肩背 · 发力模式", "核心 · 体态", "腿部对位 · 假胯宽"],
    caseQuotes: [
      "老师很耐心，拍的视频都会帮我纠正动作。",
      "骨盆前倾改善最大，臀线上移，假胯宽和颈前伸也改善了。",
      "两周下来本身感觉蛮强的，父母都说肩膀变化很大。",
      "体态改善超级多，动作纠正也非常认真。",
      "坚持训练后，肩背、骨盆和腿部对位都有明显变化。",
    ],
    stepsEyebrow: "使用流程",
    stepsTitle: "简单几步，获得体态报告",
    stepsBody: "跟随拍摄引导完成评估，整个过程约 2 分钟。",
    stepTitles: ["填写信息", "拍摄照片", "AI 体态分析", "获得建议"],
    trustTitle: "你的照片只用于本次体态评估",
    trustBody: "报告用于健康运动参考，不构成医疗诊断。如有疼痛或疾病，请咨询专业医疗人员。",
    cta: "立即测试",
    ctaNote: "本次 AI 评估免费",
    previous: "上一张",
    next: "下一张",
    language: "EN",
    footer: "© 2026 蛋壳跟练 · ShareYourHealth",
  },
  en: {
    brand: "EggFitness",
    navResults: "Sample report",
    navCases: "Real results",
    navSteps: "How it works",
    eyebrow: "AI POSTURE ASSESSMENT",
    heroTitle: "Understand your posture in 2 minutes",
    heroBody:
      "Upload front, side, and back photos to see body symmetry, key joint alignment, and a personalized training direction.",
    chips: ["3 photos", "About 2 minutes", "Personalized report"],
    heroCaption: "AI-detected joints and body alignment",
    resultsEyebrow: "WHAT YOU WILL GET",
    resultsTitle: "A posture report you can understand",
    resultsBody:
      "AI highlights key joints, angles, and limitation levels. Swipe through front, side, and back views.",
    resultLabels: ["Front view", "Side view", "Back view"],
    casesEyebrow: "REAL RESULTS",
    casesTitle: "Real members, real progress",
    casesBody:
      "Training records and feedback from EggFitness members. Individual results vary by starting point and consistency.",
    casePeriods: ["15 days", "1 month", "2 weeks", "2 weeks", "4 weeks"],
    caseTags: [
      "Forward head · Pelvis",
      "Anterior tilt · Hip line",
      "Shoulders · Movement",
      "Core · Posture",
      "Leg alignment · Hip line",
    ],
    caseQuotes: [
      "The coach was patient and corrected every movement video I sent.",
      "My pelvic tilt improved the most, together with my hip line and forward head posture.",
      "I felt stronger after two weeks, and my family noticed a big change in my shoulders.",
      "My posture improved a lot, and the movement corrections were always thoughtful.",
      "Consistent training improved my shoulders, pelvis, and lower-body alignment.",
    ],
    stepsEyebrow: "HOW IT WORKS",
    stepsTitle: "A simple path to your posture report",
    stepsBody: "Follow the photo guide and finish the assessment in about 2 minutes.",
    stepTitles: ["Enter info", "Take photos", "AI analysis", "Get advice"],
    trustTitle: "Your photos are used only for this assessment",
    trustBody:
      "This report supports fitness and wellness decisions and is not a medical diagnosis. Consult a medical professional for pain or health concerns.",
    cta: "Start assessment",
    ctaNote: "Your AI assessment is free",
    previous: "Previous",
    next: "Next",
    language: "中文",
    footer: "© 2026 EggFitness · ShareYourHealth",
  },
} as const;

const aiImages = [
  "/images/ai/front.jpg",
  "/images/ai/side.jpg",
  "/images/ai/back.jpg",
];

const caseImages = [
  "/images/cases/case-15-days.jpg",
  "/images/cases/case-one-month.jpg",
  "/images/cases/case-two-weeks-a.jpg",
  "/images/cases/case-two-weeks-b.jpg",
  "/images/cases/case-four-weeks.jpg",
];

const processImages = [
  "/images/process/step-01.jpg",
  "/images/process/step-02.jpg",
  "/images/process/step-03.jpg",
  "/images/process/step-04.jpg",
];

const stepColors = ["#FFC95F", "#FF846F", "#44D5C6", "#9BE4F2"];

function ScrollButtons({
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
}: {
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="scroll-buttons" aria-label="Carousel controls">
      <button type="button" onClick={onPrevious} aria-label={previousLabel}>
        ←
      </button>
      <button type="button" onClick={onNext} aria-label={nextLabel}>
        →
      </button>
    </div>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh");
  const [embedded, setEmbedded] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const caseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedLanguage = params.get("lang")?.toLowerCase();
    setEmbedded(params.get("embedded") === "1");

    if (requestedLanguage?.startsWith("en")) {
      setLanguage("en");
    } else if (requestedLanguage?.startsWith("zh")) {
      setLanguage("zh");
    } else if (navigator.language.toLowerCase().startsWith("en")) {
      setLanguage("en");
    }
  }, []);

  const t = content[language];
  const pageClass = useMemo(
    () => `site-shell ${embedded ? "is-embedded" : "is-browser"}`,
    [embedded],
  );

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: -1 | 1) => {
    ref.current?.scrollBy({
      left: direction * Math.min(ref.current.clientWidth * 0.86, 520),
      behavior: "smooth",
    });
  };

  const switchLanguage = () => {
    setLanguage((current) => (current === "zh" ? "en" : "zh"));
  };

  return (
    <div className={pageClass}>
      {!embedded && (
        <header className="site-header">
          <a className="brand" href="#top" aria-label={t.brand}>
            <img src="/images/brand/logo.jpg" alt="" />
            <span>{t.brand}</span>
          </a>
          <nav aria-label="Primary navigation">
            <a href="#results">{t.navResults}</a>
            <a href="#cases">{t.navCases}</a>
            <a href="#steps">{t.navSteps}</a>
          </nav>
          <button className="language-switch" type="button" onClick={switchLanguage}>
            {t.language}
          </button>
        </header>
      )}

      {embedded && (
        <div className="embedded-bar">
          <div className="brand compact">
            <img src="/images/brand/logo.jpg" alt="" />
            <span>{t.brand}</span>
          </div>
          <button className="language-switch" type="button" onClick={switchLanguage}>
            {t.language}
          </button>
        </div>
      )}

      <main id="top">
        <section className="hero section-pad">
          <div className="hero-copy">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>{t.heroTitle}</h1>
            <p className="hero-body">{t.heroBody}</p>
            <ul className="hero-chips" aria-label="Assessment highlights">
              {t.chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
            <a className="text-link" href="#results">
              {t.navResults} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <figure className="hero-visual">
            <img src="/images/ai/front.jpg" alt={t.heroCaption} />
            <figcaption>
              <span className="scan-dot" aria-hidden="true" />
              {t.heroCaption}
            </figcaption>
          </figure>
        </section>

        <section className="section section-mint" id="results">
          <div className="section-heading with-controls">
            <div>
              <p className="eyebrow">{t.resultsEyebrow}</p>
              <h2>{t.resultsTitle}</h2>
              <p>{t.resultsBody}</p>
            </div>
            <ScrollButtons
              onPrevious={() => scroll(resultRef, -1)}
              onNext={() => scroll(resultRef, 1)}
              previousLabel={t.previous}
              nextLabel={t.next}
            />
          </div>
          <div className="result-track snap-track" ref={resultRef}>
            {aiImages.map((src, index) => (
              <article className="result-card" key={src}>
                <div className="card-label">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {t.resultLabels[index]}
                </div>
                <img src={src} alt={t.resultLabels[index]} loading={index === 0 ? "eager" : "lazy"} />
              </article>
            ))}
          </div>
          <div className="swipe-hint" aria-hidden="true">
            <span /> <span /> <span />
          </div>
        </section>

        <section className="section" id="cases">
          <div className="section-heading with-controls">
            <div>
              <p className="eyebrow">{t.casesEyebrow}</p>
              <h2>{t.casesTitle}</h2>
              <p>{t.casesBody}</p>
            </div>
            <ScrollButtons
              onPrevious={() => scroll(caseRef, -1)}
              onNext={() => scroll(caseRef, 1)}
              previousLabel={t.previous}
              nextLabel={t.next}
            />
          </div>
          <div className="case-track snap-track" ref={caseRef}>
            {caseImages.map((src, index) => (
              <article className="case-card" key={src}>
                <div className="case-image-wrap">
                  <img src={src} alt={`${t.casePeriods[index]} ${t.caseTags[index]}`} loading="lazy" />
                  <span className="period-tag">{t.casePeriods[index]}</span>
                </div>
                <div className="case-copy">
                  <p className="case-tag">{t.caseTags[index]}</p>
                  <blockquote>“{t.caseQuotes[index]}”</blockquote>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-soft" id="steps">
          <div className="section-heading centered">
            <p className="eyebrow">{t.stepsEyebrow}</p>
            <h2>{t.stepsTitle}</h2>
            <p>{t.stepsBody}</p>
          </div>
          <div className="process-grid">
            {processImages.map((src, index) => (
              <article className="process-card" key={src}>
                <img src={src} alt="" loading="lazy" />
                <span className="step-number" style={{ backgroundColor: stepColors[index] }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="process-fade" aria-hidden="true" />
                <h3>{t.stepTitles[index]}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="trust-section section-pad">
          <div className="trust-icon" aria-hidden="true">✓</div>
          <div>
            <h2>{t.trustTitle}</h2>
            <p>{t.trustBody}</p>
          </div>
        </section>
      </main>

      <footer>
        <div className="brand footer-brand">
          <img src="/images/brand/logo.jpg" alt="" />
          <span>{t.brand}</span>
        </div>
        <p>{t.footer}</p>
      </footer>

      <div className="sticky-cta" role="region" aria-label={t.cta}>
        <a href="/ai-posture/start">{t.cta}</a>
        <span>{t.ctaNote}</span>
      </div>
    </div>
  );
}
