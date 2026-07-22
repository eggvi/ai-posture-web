# EggFitness AI 体态评估 H5

响应式产品介绍页与三视图 AI 体态评估流程，同时支持 App 内嵌和外部浏览器。

## 页面与交互

- 首页：报告示例、学员案例、使用流程和健康提示；
- 外部浏览器首屏显示醒目的“立即测试”，离开首屏后显示底部浮动按钮；
- 评估流程：填写资料 → 上传正面、侧面、背面照片 → 等待分析 → 查看报告；
- 登录：手机号和短信验证码；
- 中文：`?lang=zh-CN`，英文：`?lang=en`；
- App 内嵌：`?embedded=1`，隐藏重复的网页导航与浮动按钮。

当前产品是三张静态照片的 AI 评估，不是摄像头实时 AR。

## 后端与登录

H5 只访问同源 API Route，Route Handler 通过白名单转发到 `syh-server`：

- `POST /api/v1/users/login-mobile-code`
- `POST /api/v1/users/login-by-mobile`
- `POST /api/v1/ai-posture/assessments`
- `GET /api/v1/ai-posture/assessments/{id}`
- `POST /api/v1/ai-posture/assessments/{id}/upload-credentials`
- `POST /api/v1/ai-posture/assessments/{id}/submit`
- `POST /api/v1/ai-posture/assessments/{id}/feedback`

浏览器登录令牌保存在 HttpOnly、SameSite Cookie 中，不写入 URL 或新的 `localStorage`。旧版浏览器登录和 App URL 注入的令牌会通过 `/api/auth/session` 迁移到 Cookie，随后立即清理地址栏中的敏感参数。

## 草稿与图片

- 本次标签页使用 `sessionStorage` 保存评估 ID 对应的资料和三个对象 key；
- 刷新后只在本地 key 与服务端 DRAFT 同时存在时显示“已上传”；
- 大图在浏览器中缩放到最长边 1800px 并压缩后再上传；
- 服务端仍必须校验真实文件类型、大小、尺寸并清理 EXIF。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` 会执行生产构建并检查页面入口、三视图流程、登录安全约束和 API 白名单。

## 发布要求

- 生产域名必须使用有效 HTTPS 证书；非本地 HTTP 请求会被重定向到 HTTPS；
- 七牛上传地址必须为 HTTPS；
- 用户协议与隐私政策链接必须保持可访问；
- 可使用 `.openai/hosting.json` 对应的 Sites 项目发布，也可使用仓库内多阶段 Dockerfile 构建 `dist/standalone`。
