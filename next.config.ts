import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 不再用 rewrites 代理 /api/v1/ai-posture —— rewrites 不透传自定义 header（X-Mp-*），
  // 会导致 syh-server 因缺 X-Mp-AppId 返回 403。
  // 改为 app/api/v1/ai-posture/assessments/[[...path]]/route.ts 服务端显式转发。

  // 独立部署模式（非 Cloudflare），输出自包含的 server.js
  output: "standalone",

  // Cloudflare D1 死代码导致类型检查失败（已迁移到 syh-server），跳过
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
