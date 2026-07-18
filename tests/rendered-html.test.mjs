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
});

test("assessment flow is limited to front, side, and back images", async () => {
  const store = await source("lib/assessment-store.ts");
  const flow = await source("app/ai-posture/start/page.tsx");

  assert.match(store, /\["front", "side", "back"\] as const/);
  assert.match(flow, /正面、侧面和背面/);
  assert.match(flow, /front/);
  assert.match(flow, /side/);
  assert.match(flow, /back/);
});

test("build contains all H5 and hyeyes worker API routes", async () => {
  const requiredRoutes = [
    "app/api/assessments/route.ts",
    "app/api/assessments/[id]/images/[poseId]/route.ts",
    "app/api/assessments/[id]/submit/route.ts",
    "app/api/v1/assessments/pending/route.ts",
    "app/api/v1/assessments/[id]/result/route.ts",
    "app/api/v1/assessments/[id]/fail/route.ts",
    "app/app-api/infra/file/upload/route.ts",
    "dist/server/index.js",
  ];
  await Promise.all(requiredRoutes.map((pathname) => access(new URL(pathname, root))));
});
