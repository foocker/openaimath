---
workflow: general-video
flow: automation
storyboard: no
message: "7/8 无零点区域与要求所有非平凡零点位于 1/2 的黎曼假设，是不同的数学断言。"
destination: website
aspect: 1920x1080
language: zh-CN
length: narration-driven, approximately 100 seconds
---

## Intent

用户希望为 openai/math 中有关黎曼猜想的论文制作一个视频示例；上文明确讨论的是前端代码形式的视频，在现有 GitHub Pages 阅读网站中播放。交付中文旁白、同步字幕、可拖动进度和章节导航的前端作品，嵌入对应论文详情页。

## Assets

- The Quasi-Riemann Hypothesis, September 30, 2026，系列 003。
- 来源版本 adc7f1241b42e322a6451854ab7e4b4c146bf78a，PDF 摘要、正文第 4–7 页与 lean/docs/003.md。
- 术语源 tools/math-translator/dictionaries/merged.json。

## Notes

一张连续的复平面图，六个讲解阶段，无硬切换。时长以生成的实际旁白为准。自主采用纸色、青绿、赭红视觉和中文合成旁白，无背景音乐，保持数学讲解清晰。该选择仅用于本项目，不记录为用户通用偏好。

本作品释读来源中的数学断言，不声称独立核验论文证明。论文明确写明黎曼假设仍未解决。有限个已知零点仅作数值示意，不作证明。主结果适用范围与 Lean 覆盖范围在来源说明中列出。

HyperFrames 账户用量返回 no_subscription_login；本地技能存在，在线刷新因 GitHub 连接失败未完成。旁白由现有 edge-tts 的 zh-CN-XiaoxiaoNeural 合成，冻结为本地音频并纳入媒体记录；播放器不依赖在线语音服务。未使用付费生成接口。
