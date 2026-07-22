import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(pathname) {
  return readFile(new URL(pathname, root), "utf8");
}

test("landing page includes the approved content and responsive entry contract", async () => {
  const page = await source("app/page.tsx");
  const layout = await source("app/layout.tsx");

  assert.match(layout, /蛋壳跟练 AI 体态评估/);
  assert.match(page, /2 分钟，看懂你的体态/);
  assert.match(page, /一眼看懂你的体态报告/);
  assert.match(page, /真实学员，真实改变/);
  assert.match(page, /简单几步，获得体态报告/);
  assert.match(page, /\/ai-posture\/start\?lang=/);
  assert.match(page, /embedded=\$\{embedded \? "1" : "0"\}/);
  assert.match(page, /className="hero-cta"/);
  assert.match(page, /showFloatingCta \? "is-visible"/);
});

test("assessment flow is limited to front, side, and back images", async () => {
  const flow = await source("app/ai-posture/start/page.tsx");

  assert.match(flow, /const poseIds: PoseId\[\] = \["front", "side", "back"\]/);
  assert.match(flow, /正面、侧面和背面/);
  assert.match(flow, /writeDraft/);
  assert.match(flow, /removeDraft/);
});

test("build contains the H5 routes and the syh-server proxy contract", async () => {
  const requiredRoutes = [
    "app/ai-posture/login/page.tsx",
    "app/ai-posture/start/page.tsx",
    "app/api/auth/session/route.ts",
    "app/api/v1/users/[[...path]]/route.ts",
    "app/api/v1/ai-posture/assessments/[[...path]]/route.ts",
    "dist/server/index.js",
  ];
  await Promise.all(requiredRoutes.map((pathname) => access(new URL(pathname, root))));

  const login = await source("app/ai-posture/login/page.tsx");
  const assessmentProxy = await source("app/api/v1/ai-posture/assessments/[[...path]]/route.ts");
  assert.match(login, /getSafeRedirect/);
  assert.doesNotMatch(login, /localStorage\.setItem\("ai_posture_token"/);
  assert.doesNotMatch(login, /params\.set\("token"/);
  assert.match(assessmentProxy, /isAllowedRoute/);
  assert.doesNotMatch(assessmentProxy, /export const DELETE/);
});
