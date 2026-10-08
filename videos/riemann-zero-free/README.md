# 7/8，离 1/2 还有多远？

[在线播放](https://foocker.github.io/openaimath/explainers/riemann-zero-free/) · [对应论文](https://foocker.github.io/openaimath/?paper=The-Quasi-Riemann-Hypothesis-September-30-2026#explainer)

95.082 秒，1920 × 1080，六个章节，中文合成旁白。交付是 HTML / SVG / GSAP 动画和网页播放器，可部署到 GitHub Pages；本次未导出 MP4。音频、脚本和字体全部同站托管。用户主动播放后才开始发声。

## 内容依据

论文为 openai/math 的 *The Quasi-Riemann Hypothesis: A Zero-Free Half-Plane Re(s)>7/8*，日期 2026-09-30，固定来源版本 `adc7f1241b42e322a6451854ab7e4b4c146bf78a`。

- [原论文](https://github.com/openai/math/blob/adc7f1241b42e322a6451854ab7e4b4c146bf78a/preprints/The-Quasi-Riemann-Hypothesis-September-30-2026/paper.pdf)：摘要列出主结果；正文第 4 页明确说未解决黎曼假设；第 5—7 页介绍证明路线。Part I 得到 11/12，Part II 改进到 7/8。
- [形式化范围](https://github.com/openai/math/blob/adc7f1241b42e322a6451854ab7e4b4c146bf78a/lean/docs/003.md)：ζ 函数、所有 Dirichlet L 函数，以及 Q(√−3) 上有限阶 Hecke L 函数的 7/8 界。主特征的 s=1 极点被排除，论文后续应用并未全部形式化。
- 视频主要画 ζ(s)，并通过函数方程说明：按论文断言，非平凡零点只能留在 `1/8 ≤ Re(s) ≤ 7/8`，与完整黎曼假设要求的 `Re(s)=1/2` 有区别。此处是来源解读，未独立验证论文证明。
- 六个点是最小的六个正虚部非平凡零点的数值近似（精度只用于图示）。它们的横坐标不随动画变化；有限例子不被用作证明。图示只取上半平面有限窗口。
- 术语核对来自 `tools/math-translator/dictionaries/merged.json`；本片采用的条目记录在 `terminology.json`，不要求其他部署环境具有整份词典。Riemann hypothesis 采用词典的“黎曼假设”；Mellin transform 对应“梅林变换”，画面为避免自行扩展译名保留“Mellin 积分”。

## 文件与制作

`content.json` 是旁白与字幕；`timing.json` 是实际合成音频的句子/章节边界；`assets/narration.mp3` 是冻结音轨。音轨来自 Edge TTS 的 `zh-CN-XiaoxiaoNeural`，速率 +5%，无背景音乐，合并后响度目标 -18 LUFS。语音服务仅用于制作，线上播放无需语音服务或账户。

`composition.html.txt`、`composition.css`、`composition.js` 组成连续的复平面场景。只有一个暂停的 GSAP 时间轴，动画由绝对时间确定；没有随机数、墙上时钟或运行时外部数据请求。真实音频的 currentTime 驱动网页播放器的画面，旁白、字幕与图形共享同一时间源。

`player.html.txt`、`player.css`、`player.js` 提供播放控制、可访问的进度输入、章节和文字稿。手机外置字幕使用阅读字号。父页面只接受同源且来自指定 iframe 的尺寸消息，不固定裁切播放器。

在网站根目录运行：

```powershell
npm ci
npm run build:explainers
npm run dev
```

`build:explainers` 生成本项目的 `index.html`（HyperFrames 入口），并向 `public/explainers/riemann-zero-free/` 写入完整的独立播放器。`npm run build` 自动执行该步骤。GSAP 3.14.2、Noto Sans SC 5.2.9 和 Source Serif 4 来自锁定的 npm 依赖；只发布实际文本需要的中文字体分片，保留依赖版权信息。

修改旁白后，在本目录运行：

```powershell
python -m pip install edge-tts
python narrate.py
```

此步骤需要 FFmpeg / ffprobe 以及语音服务网络连接。音频按文本散列缓存于 `.cache/speech/`，重新测量生成 timing.json；随后重新构建和检查。只改视觉无需重新生成声音。音轨有意提交到 Git，因此正常部署无需 Python 语音依赖。

HyperFrames 编辑预览和检查：

```powershell
npm run check
npx --yes hyperframes@0.8.140 preview --background
```

## 本次验证

网站构建、原有浏览器测试和 `npm run test:explainers` 均通过。后者验证真音频播放/暂停、倍速、静音、字幕切换、章节跳转、倒拖后相同时间像素一致、7/8/1/8 几何范围，以及手机/嵌入尺寸。六个章节中点截图与联系表存于网站根目录 `artifacts/riemann-video/`。

HyperFrames 0.8.140 的 runtime、layout、contrast 检查均无错误。人工复核以下提示：

- 单个连续图景包含嵌套结构：本片六阶段没有硬切换，故保留单场景。
- 回调测量提示为静态分析误报：getTotalLength 只在构建时间轴时调用；update 回调只按时间更新内容，不测量几何。浏览器正反向定位的图像一致检查通过。
- 临界带边线被识别为脱离端点的连接器：该线是坐标区域的边界，本来不连接两个 UI 元素。路径始终在 SVG 用户坐标内。
- 证明路线阶段覆盖淡出的坐标标注，是有意的前景/背景关系。

动画映射检查覆盖 51 个 tween（50 个有采样，1 个瞬时设值）；同一面板同时进行透明度与位移会被标为 collision，垂直边界的零宽包围盒会被标为 degenerate，均已结合实际画面复核。没有把图形包围盒提示当作数学点位置的变化。

设计检查：纸色背景、青绿临界线、赭红排除区域与两种本地字体贯穿全部阶段；清除了首屏文字重叠及分隔符对比度不足。辅助灰绿颜色仅用于网格、边框和标签；字幕有独立安全区。
