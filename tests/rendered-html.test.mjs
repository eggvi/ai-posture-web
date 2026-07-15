import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the EggFitness posture landing page", async () => {
  const response = await render("/?lang=zh-CN&embedded=1");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>蛋壳跟练 AI 体态评估 \| EggFitness<\/title>/i);
  assert.match(html, /2 分钟，看懂你的体态/);
  assert.match(html, /一眼看懂你的体态报告/);
  assert.match(html, /真实学员，真实改变/);
  assert.match(html, /简单几步，获得体态报告/);
  assert.match(html, /立即测试/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("includes the fixed assessment route and all four process cards", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /href="\/ai-posture\/start"/);
  assert.match(html, /填写信息/);
  assert.match(html, /拍摄照片/);
  assert.match(html, /AI 体态分析/);
  assert.match(html, /获得建议/);
});
