# EggFitness H5 × hyeyes-python 接入说明

## 范围

本工程只处理 3 个固定视角，不复用旧版 App 的视频拍摄流程：

- `front`：正面
- `side`：侧面
- `back`：背面

每个评估任务必须上传齐这三张图片后才能提交。网页报告也只展示这三个视角。

## 运行架构

1. H5 创建评估任务并保存用户资料。
2. H5 分别上传正面、侧面、背面图片。
3. H5 提交任务，状态变为 `SUBMITTED`。
4. 独立部署的 `hyeyes-python` Worker 拉取任务，状态变为 `PROCESSING`。
5. Worker 下载三张图片，运行 YOLOX + RTMPose ONNX 推理和体态规则分析。
6. Worker 将三张标注图回传，并写回 JSON 报告，状态变为 `COMPLETED`。
7. H5 轮询任务状态，完成后显示三张标注图、12 个测量项及重点发现。

网页运行在 Cloudflare/Sites：D1 保存任务和 JSON 报告，R2 保存用户原图和标注图。
Python/ONNX 推理不能运行在 Sites Worker 内，因此 `hyeyes-python` 必须作为独立常驻服务部署。

## API 契约

面向 H5：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/assessments` | 创建草稿任务 |
| `POST` | `/api/assessments/{id}/images/front` | 上传正面图 |
| `POST` | `/api/assessments/{id}/images/side` | 上传侧面图 |
| `POST` | `/api/assessments/{id}/images/back` | 上传背面图 |
| `POST` | `/api/assessments/{id}/submit` | 校验三图并提交 |
| `GET` | `/api/assessments/{id}` | 查询状态和报告 |

上传、查询和结果图均需要创建任务时返回的客户端 token。原图和结果图不公开。

面向 `hyeyes-python` Worker：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/v1/assessments/pending?limit=N` | 领取待处理任务 |
| `POST` | `/app-api/infra/file/upload` | 上传标注图 |
| `POST` | `/api/v1/assessments/{id}/result` | 回写报告 |
| `POST` | `/api/v1/assessments/{id}/fail` | 回写失败原因 |

Worker 请求使用 `Authorization: Bearer $HYEYES_API_TOKEN`。

## Worker 配置

生产环境建议：

```bash
export HYEYES_WORKER_MODE=http
export HYEYES_API_BASE=https://<线上页面域名>
export HYEYES_API_TOKEN=<与 Sites HYEYES_WORKER_TOKEN 相同的密钥>
export HYEYES_POLL_INTERVAL_SEC=3
export HYEYES_POLL_LIMIT=2
export HYEYES_EVAL_WORKERS=1
export HYEYES_MAX_INFLIGHT=1
export HYEYES_MAX_UPLOAD_BYTES=900000
export HYEYES_WORK_DIR=/tmp/hyeyes-work
hyeyes worker
```

`HYEYES_MAX_UPLOAD_BYTES=900000` 会把大于阈值的标注结果缩到 1320px 宽，适合 H5 展示，
同时避免 multipart 上传体积过大。根据服务器内存逐步增加 `HYEYES_EVAL_WORKERS`；每个评估进程
都会加载一套 ONNX 模型。

## 已完成的真实验证

已使用 3072×4096 的正面、侧面、背面三张图片完成一次端到端测试：

- 三张图片全部检测到人体；
- 完成 3 个视角、12 个测量项；
- 三张标注图压缩为 1320×1760 并成功回传；
- 网页取得 `COMPLETED` 状态、3 张标注图和完整 JSON 报告；
- 390px、1440px、中文、英文、App 内嵌和外部浏览器模式均通过检查。

## 上线注意事项

- `HYEYES_WORKER_TOKEN` 只保存在 Sites 运行时环境变量和 Worker 密钥管理中，不写入仓库。
- 建议为 Worker 增加健康检查、失败重试、告警和进程守护。
- 建议明确原图与报告的保存期限，并实现到期删除任务、D1 记录和 R2 文件的机制。
- 页面结果是健康运动参考，不构成医疗诊断。
