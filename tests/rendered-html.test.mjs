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
  const styles = await source("app/globals.css");

  assert.match(flow, /const poseIds: PoseId\[\] = \["front", "side", "back"\]/);
  assert.match(flow, /正面、侧面和背面/);
  assert.match(flow, /writeDraft/);
  assert.match(flow, /removeDraft/);
  assert.match(flow, /type UploadPhase = "idle" \| "optimizing" \| "uploading" \| "uploaded" \| "error"/);
  assert.match(flow, /正在上传中/);
  assert.match(flow, /前往登录/);
  assert.match(flow, /\(!sessionResponse\.ok \|\| !session\.authenticated\) && legacyToken/);
  assert.match(flow, /imageKeysRef\.current/);
  assert.match(flow, /1600 \/ longestEdge/);
  assert.match(flow, /canvas\.toBlob\(resolve, "image\/jpeg", 0\.82\)/);
  assert.match(styles, /\.upload-status/);
});

test("build contains the H5 routes and the syh-server proxy contract", async () => {
  const requiredRoutes = [
    "app/ai-posture/login/page.tsx",
    "app/ai-posture/start/page.tsx",
    "app/api/auth/session/route.ts",
    "app/api/v1/users/[[...path]]/route.ts",
    "app/api/v1/ai-posture/assessments/[[...path]]/route.ts",
    "server.mjs",
    "dist/server/index.js",
  ];
  await Promise.all(requiredRoutes.map((pathname) => access(new URL(pathname, root))));

  const login = await source("app/ai-posture/login/page.tsx");
  const apiClient = await source("lib/syh-api-client.ts");
  const assessmentProxy = await source("app/api/v1/ai-posture/assessments/[[...path]]/route.ts");
  assert.match(login, /getSafeRedirect/);
  assert.match(login, /images\/brand\/logo\.jpg/);
  assert.match(login, />蛋壳跟练</);
  assert.match(login, /window\.location\.assign\(redirectTo\)/);
  assert.doesNotMatch(login, /localStorage\.setItem\("ai_posture_token"/);
  assert.doesNotMatch(login, /params\.set\("token"/);
  assert.match(apiClient, /typeof value\.id === "string" && \/\^\\d\+\$\//);
  assert.match(assessmentProxy, /isAllowedRoute/);
  assert.match(assessmentProxy, /clearAuthCookies/);
  assert.match(assessmentProxy, /responseStatus = 401/);
  assert.doesNotMatch(assessmentProxy, /export const DELETE/);

  const dockerfile = await source("Dockerfile");
  const worker = await source("worker/index.ts");
  assert.match(dockerfile, /COPY --from=builder \/app\/dist \.\/dist/);
  assert.match(dockerfile, /ENV ENFORCE_HTTPS=false/);
  assert.doesNotMatch(dockerfile, /dist\/standalone/);
  assert.match(worker, /const enforceHttps = env \? env\.ENFORCE_HTTPS !== "false" : false/);
});
