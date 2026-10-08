import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './pdf-text-layer.css';

GlobalWorkerOptions.workerSrc = workerUrl;

export async function openPdf(root) {
  const url = root.dataset.url;
  root.innerHTML = `<div class="pdf-placeholder"><h3>正在加载原始 PDF…</h3><p role="status" id="pdf-load-status">连接官方仓库</p></div>`;
  let doc;
  const task = getDocument({ url, isEvalSupported: false });
  task.onProgress = ({ loaded, total }) => {
    const status = root.querySelector('#pdf-load-status');
    if (status) status.textContent = total ? `已加载 ${Math.min(100, Math.round(loaded / total * 100))}%` : `已加载 ${Math.round(loaded / 1024)} KB`;
  };
  try { doc = await task.promise; }
  catch {
    root.innerHTML = `<div class="pdf-placeholder"><h3>暂时无法加载 PDF</h3><p>请检查网络连接，或通过上方链接在 GitHub 阅读原文。</p><button class="button primary" id="retry-pdf">重新加载</button></div>`;
    root.querySelector('#retry-pdf').addEventListener('click', () => openPdf(root));
    return;
  }
  let pageNumber = 1, zoom = 1, renderTask, textLayer, generation = 0;
  root.innerHTML = `<div class="pdf-toolbar" aria-label="PDF 阅读控制"><button class="icon-button" id="pdf-prev" aria-label="上一页">←</button><label class="sr-only" for="pdf-page-number">页码</label><input type="number" id="pdf-page-number" min="1" max="${doc.numPages}" value="1"><span>/ ${doc.numPages}</span><button class="icon-button" id="pdf-next" aria-label="下一页">→</button><span class="zoom-label" id="pdf-zoom-value">100%</span><button class="icon-button" id="pdf-minus" aria-label="缩小">−</button><button class="icon-button" id="pdf-plus" aria-label="放大">＋</button><button class="button" id="pdf-fit">适应宽度</button></div><div class="pdf-scroll" tabindex="0" aria-label="PDF 页面，可滚动阅读"><div class="pdf-page"><canvas aria-label="论文页面"></canvas><div class="textLayer"></div></div></div><p class="pdf-status" aria-live="polite"></p>`;
  const $ = (s) => root.querySelector(s);
  async function render() {
    const version = ++generation;
    renderTask?.cancel();
    textLayer?.cancel();
    $('#pdf-page-number').value = pageNumber;
    $('#pdf-prev').disabled = pageNumber === 1;
    $('#pdf-next').disabled = pageNumber === doc.numPages;
    $('#pdf-minus').disabled = zoom <= 0.5;
    $('#pdf-plus').disabled = zoom >= 2.5;
    $('#pdf-zoom-value').textContent = `${Math.round(zoom * 100)}%`;
    $('.pdf-status').textContent = `正在渲染第 ${pageNumber} 页…`;
    try {
      const page = await doc.getPage(pageNumber);
      if (version !== generation) return;
      const base = page.getViewport({ scale: 1 });
      const available = $('.pdf-scroll').clientWidth - (window.innerWidth < 580 ? 18 : 34);
      const viewport = page.getViewport({ scale: available / base.width * zoom });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = $('canvas');
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const container = $('.pdf-page');
      container.style.width = `${viewport.width}px`;
      container.style.height = `${viewport.height}px`;
      container.style.setProperty('--scale-factor', viewport.scale);
      container.style.setProperty('--total-scale-factor', viewport.scale);
      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0] });
      await renderTask.promise;
      if (version !== generation) return;
      const content = await page.getTextContent();
      if (version !== generation) return;
      $('.textLayer').replaceChildren();
      textLayer = new TextLayer({ textContentSource: content, container: $('.textLayer'), viewport });
      await textLayer.render();
      if (version !== generation) return;
      $('.pdf-status').textContent = `第 ${pageNumber} / ${doc.numPages} 页 · 可选中文字并复制`;
    } catch (error) {
      if (error.name !== 'RenderingCancelledException' && error.name !== 'AbortException' && version === generation) {
        $('.pdf-status').textContent = '本页渲染失败，请重新选择页码，或在 GitHub 打开原文。';
        console.error(error);
      }
    }
  }
  function go(number) {
    pageNumber = Math.max(1, Math.min(doc.numPages, Math.floor(Number(number)) || 1));
    $('.pdf-scroll').scrollTop = 0;
    render();
  }
  $('#pdf-prev').addEventListener('click', () => go(pageNumber - 1));
  $('#pdf-next').addEventListener('click', () => go(pageNumber + 1));
  $('#pdf-page-number').addEventListener('change', e => go(e.target.value));
  $('#pdf-page-number').addEventListener('keydown', e => { if (e.key === 'Enter') go(e.target.value); });
  $('#pdf-minus').addEventListener('click', () => { zoom = Math.max(.5, zoom - .25); render(); });
  $('#pdf-plus').addEventListener('click', () => { zoom = Math.min(2.5, zoom + .25); render(); });
  $('#pdf-fit').addEventListener('click', () => { zoom = 1; render(); });
  let timer;
  let width = root.clientWidth;
  new ResizeObserver(() => {
    if (width === root.clientWidth) return;
    width = root.clientWidth;
    clearTimeout(timer); timer = setTimeout(render, 160);
  }).observe(root);
  await render();
}
