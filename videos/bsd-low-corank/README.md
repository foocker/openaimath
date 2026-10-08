# 002 · BSD：从两个秩，到一个完整公式

[在线播放](https://foocker.github.io/openaimath/explainers/bsd-low-corank/) · [论文阅读页](https://foocker.github.io/openaimath/?paper=Exact-Birch-Swinnerton-Dyer-Formula-from-Low-Selmer-Corank-October-3-2026#explainer)

95.826 秒，1920×1080，中文合成旁白、同步字幕和六章跳转。作品由 HTML、SVG、KaTeX 和 GSAP 在浏览器直接播放，音轨与字体在同一站点托管。

## 来源与范围

主论文为 *Exact Birch–Swinnerton-Dyer Formula from Low Selmer Corank*（OpenAI，2026-10-03），系列 002，共 94 页。固定来源提交 `adc7f1241b42e322a6451854ab7e4b4c146bf78a`，路径 `preprints/Exact-Birch-Swinnerton-Dyer-Formula-from-Low-Selmer-Corank-October-3-2026/exact-bsd-low-selmer-corank.pdf`。

视频根据摘要、正文 pp.2–5 编写：

- **p.3，定理 1.1**：E/ℚ 是椭圆曲线，存在素数 q，使完整 q 幂 Selmer 群的 ℤq 余秩 s_q(E) 属于 {0,1}。结论是 r(E)=a(E)=s_q(E)、Sha(E/ℚ) 有限，以及式 (1.2) 的完整首项公式。
- **同页末**：低 Selmer 余秩条件是适用范围的关键，不能直接换成 Mordell–Weil 秩的条件。视频不将其表述为所有椭圆曲线上的无条件结论。
- **pp.4–5，§1.3**：以各素数处的指数差衡量公式的差异。配套二部分结果以及奇素数的精确比较共同确定完整公式。视频中的正有理比值 R 是讲解记号，对应式 (1.3) 中 Q_E / #Sha(E/ℚ)，不是声称重现全部证明。
- 周期 Ω 包含全部实连通分支；Reg 采用原文的高度配对规范，秩零时取 1。视频写出公式，并明确这些规范以定理 1.1 为准。
- 该篇在当前官方目录没有 Lean 标记。视频是来源释读，未独立核验 94 页证明。

图示 y²=x³−x+1 与标出的 (0,1)、(3,5) 均可直接代入验证。图形只说明有理点的概念；未计算这条示例曲线的 L 函数、秩或 BSD 因子。旁边的 L 函数曲线是局部形状示意，页面已注明。

## 术语

依据 `tools/math-translator/dictionaries/merged.json`，本片使用的原条目、选义与来源散列见 `terminology.json`。

采用 Selmer group → 塞尔默群，corank → 余秩，analytic rank → 解析秩，regulator → 调整子，Tamagawa number → 玉河数，torsion subgroup → 挠子群。词典的 Tate-Shafarevich group 条目重复了一个“奇”字，因此采用完整的同义词条 Shafarevich-Tate group → 沙法列维奇–泰特群。rank 选择代数意义的“秩”，period 选择“周期”。

## 制作与维护

`content.json` 保存逐句旁白与字幕；`timing.json` 记录实际音轨时间；`assets/narration.mp3` 是冻结的成品声音。语音为 Edge TTS `zh-CN-XiaoxiaoNeural`，+5% 速率，无配乐，合并后响度目标 -18 LUFS。`narrate.py` 需要 Python 的 edge-tts 与 FFmpeg/ffprobe，仅修改旁白时才需要运行；普通站点构建不调用语音服务。

视觉源文件为 `composition.html.txt`、`composition.css`、`composition.js`。一个暂停的 GSAP 时间轴控制六个连续阶段，所有进入动画有显式初态，反向拖动后不会提前显示后续结论。数学 SVG 坐标和 KaTeX 标记在构建期生成。`../shared/player.js`、`../shared/player.css` 与 003 视频共用，`player.html.txt` 单独保存本片来源说明。

在站点根目录：

```powershell
npm run build
npm run test:explainers
npm test
```

在本目录：

```powershell
npm run check
npx --yes hyperframes@0.8.140 preview --background
```

正常构建生成本目录的 HyperFrames `index.html`，以及站点的 `public/explainers/bsd-low-corank/`；不应直接编辑生成文件。字体和 KaTeX 从锁定的 npm 依赖复制，保留许可证。

## 验证记录

HyperFrames 的 lint、runtime、layout、contrast 均通过，无错误。保留并审查两项提示：一个持续比较板的嵌套结构提示；DOM 测量提示为静态分析误报，getTotalLength 只在建时间轴时调用，更新回调仅按时间修改文本和进度。

浏览器检查覆盖实际音频播放、暂停、倍速、静音、字幕、章节、倒拖后的像素一致、提前显示结论的回归、完整 q 幂符号、五类 BSD 因子、手机布局、内嵌高度与论文绑定。002 和 003 均运行；网站原有阅读功能亦运行回归。六章截图位于根目录 `artifacts/bsd-video/`，实际公式排版和词条均已人工检查。
