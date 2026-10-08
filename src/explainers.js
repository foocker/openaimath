import content from '../videos/riemann-zero-free/content.json';
import timing from '../videos/riemann-zero-free/timing.json';
import bsdContent from '../videos/bsd-low-corank/content.json';
import bsdTiming from '../videos/bsd-low-corank/timing.json';

// Curated additions live outside the upstream catalogue and survive source syncs.
const explainers = new Map([[content.paperId, {
  title: content.title,
  url: `${import.meta.env.BASE_URL}explainers/riemann-zero-free/`,
  duration: Math.round(timing.duration),
  summary: '用一张复平面图，读懂论文的无零点区域与完整黎曼假设的区别。',
  note: '基于 2026 年 9 月 30 日论文的非官方解读。论文明确写明完整黎曼假设仍未解决；Lean 说明覆盖主结果，后续应用并未全部纳入。',
}], [bsdContent.paperId, {
  title: bsdContent.title,
  url: `${import.meta.env.BASE_URL}explainers/bsd-low-corank/`,
  duration: Math.round(bsdTiming.duration),
  summary: '从有理点与 L 函数，读懂低 Selmer 余秩条件和完整 BSD 首项公式。',
  note: '基于 2026 年 10 月 3 日论文的非官方解读。结论以完整 q 幂 Selmer 群的余秩为 0 或 1 为前提；官方目录未给本篇 Lean 标记。',
}]]);

export function hasExplainer(paperId) { return explainers.has(paperId); }
export function explainerDuration(paperId) { return explainers.get(paperId)?.duration; }

export function explainerSection(paperId) {
  const video = explainers.get(paperId);
  if (!video) return '';
  return `<section class="reader-section explainer-section" id="explainer"><div class="section-heading"><h2>视频讲解 <span>VISUAL EXPLAINER</span></h2><a href="${video.url}" target="_blank" rel="noopener">单独打开 ↗</a></div>
    <h3>${video.title}</h3><p class="explainer-intro">${video.duration} 秒 · 中文旁白与字幕 · 六个章节。${video.summary}</p>
    <iframe class="explainer-frame" src="${video.url}?embed=1" title="${video.title}：论文视频讲解" loading="lazy" allow="fullscreen" allowfullscreen></iframe>
    <p class="explainer-note">${video.note}<a href="${video.url}#transcript" target="_blank" rel="noopener">文字稿与来源 ↗</a></p></section>`;
}

window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.data?.type !== 'openaimath-explainer-height') return;
  const frame = document.querySelector('.explainer-frame');
  if (!frame || event.source !== frame.contentWindow) return;
  const height = Number(event.data.height);
  if (Number.isFinite(height) && height >= 200 && height <= 2400) frame.style.height = `${Math.ceil(height)}px`;
});
