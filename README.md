# EggFitness AI 体态评估入口

响应式落地页，同时适配 App 内 H5 和外部浏览器。

## 页面结构

1. AI 报告效果预览：正面、侧面、背面横向滑动。
2. 已授权学员改善案例：周期、问题类型与反馈。
3. 2×2 使用流程：填写信息、拍摄照片、AI 体态分析、获得建议。
4. 固定底部 CTA：`/ai-posture/start`。

产品数据板块已按最新需求移除。

## 响应式与语言

- 移动 H5 以 `390px` 为设计基准。
- 桌面端以 `1440px` 为设计基准。
- `?embedded=1`：App 内嵌模式，使用精简品牌栏。
- `?lang=zh-CN`：中文。
- `?lang=en`：英文。
- 未指定语言时跟随系统语言，页面右上角可手动切换。

建议 App 内入口：

`https://fitness.shareyourhealth.cn/ai-posture?source=ios_home_banner&lang=zh-CN&embedded=1`

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
```

该命令会完成生产构建并检查核心文案、四张流程卡与 CTA 路由。
