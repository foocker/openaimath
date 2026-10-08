---
workflow: general-video
flow: automation
storyboard: no
destination: website
aspect: 1920x1080
language: zh-CN
length: narration-driven, approximately 110 seconds
message: "在明确的低 Selmer 余秩条件下，论文给出包含所有素数因子的完整 BSD 首项公式。"
---

## Intent

用户指定成果系列 002 — The full BSD formula from low Selmer corank，作为第二个前端代码视频示例。延续已交付的网页播放方式、中文旁白、字幕、进度和章节控制，嵌入主论文阅读页，保留 003 视频。

## Assets

- 2026-10-03 主论文 Exact Birch–Swinnerton-Dyer Formula from Low Selmer Corank，共 94 页；来源版本 adc7f1241b42e322a6451854ab7e4b4c146bf78a。
- 核对摘要、正文 pp.2–5，尤其 p.3 Theorem 1.1 与该页末的适用范围说明。
- tools/math-translator/dictionaries/merged.json：采用“塞尔默群”“余秩”“解析秩”“玉河数”等；歧义词选择与损坏条目记录在 terminology.json。

## Notes

以一个持续存在的数学比较板为视觉主体，逐步从有理点、消失阶展开到条件、首项公式和素数分解。纸色与青绿延续网站；用蓝色表示解析侧、赭红表示算术侧。无背景音乐。真实中文旁白时长决定视觉时序。

数学内容是对来源的释读，不声称独立审定证明。低 Selmer 余秩条件不可省略；不声称所有椭圆曲线的 BSD 已解决。官方目录未给本篇 Lean 标记。精确规范引用原文定理 1.1，尤其周期和调整子的规范。

沿用已安装的 edge-tts 生成合成旁白并冻结；播放端不依赖语音服务。HyperFrames 用量未知（no_subscription_login），没有进行付费调用。
