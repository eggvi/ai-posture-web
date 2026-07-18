# EggFitness AI 体态评估入口

响应式落地页与 AI 体态评估流程，同时适配 App 内 H5 和外部浏览器。

## 页面结构

1. AI 报告效果预览：正面、侧面、背面横向滑动。
2. 已授权学员改善案例：周期、问题类型与反馈。
3. 2×2 使用流程：填写信息、拍摄照片、AI 体态分析、获得建议。
4. 外部浏览器固定底部 CTA：`/ai-posture/start`。
5. 评估流程：填写资料 → 上传正面、侧面、背面 3 张照片 → 等待 AI 分析 → 查看标注图与报告。

产品数据板块已按最新需求移除。

## 响应式与语言

- 移动 H5 以 `390px` 为设计基准。
- 桌面端以 `1440px` 为设计基准。
- `?embedded=1`：App 内嵌商品详情模式，不显示重复的顶部导航和底部固定 CTA。
- `?lang=zh-CN`：中文。
- `?lang=en`：英文。
- 未指定语言时跟随系统语言，页面右上角可手动切换。

建议 App 内入口：

`/?source=ios_home_banner&lang=zh-CN&embedded=1`

外部浏览器入口：

`/?source=web&lang=zh-CN`

评估流程入口：

`/ai-posture/start?lang=zh-CN&embedded=0|1&source=...`

## AI Worker

网页只接收任务、保存三张原图并展示结果；实际关键点识别和体态分析由独立的
[`hyeyes-python`](https://github.com/eggvi/hyeyes-python) Worker 执行。完整接口契约、
生产环境变量和运行方式见 [HYEYES_INTEGRATION.md](./HYEYES_INTEGRATION.md)。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run lint
```

生产构建检查核心文案、四张流程卡与 CTA 路由。真实链路还需同时运行
`hyeyes-python` Worker。
