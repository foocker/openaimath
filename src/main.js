import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-600.css';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/contrib/auto-render';
import DOMPurify from 'dompurify';
import './style.css';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const main = $('#main');
const icons = {
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.2 15.4A8.7 8.7 0 0 1 8.6 3.8a8.7 8.7 0 1 0 11.6 11.6Z"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  document: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Zm0 0v5h5M8 12h8m-8 4h6"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const html = (s) => DOMPurify.sanitize(s, { ALLOWED_TAGS: ['i', 'em', 'b', 'strong', 'sub', 'sup', 'br', 'code'], ALLOWED_ATTR: [] });
const text = (s) => { const d = document.createElement('div'); d.innerHTML = html(s); return d.textContent; };
const norm = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const subjectUrl = (id) => `?subject=${encodeURIComponent(id)}`;
const paperUrl = (id) => `?paper=${encodeURIComponent(id)}`;
const external = 'target="_blank" rel="noopener noreferrer"';
let catalog, subjects, families, papers;

function math(root = main) {
  renderMathInElement(root, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '$', right: '$', display: false }],
    throwOnError: false, strict: 'ignore', trust: false,
  });
}

function source(path, type = 'blob') { return `${catalog.repository}/${type}/${catalog.commit}/${path}`; }
function raw(path) { return `https://raw.githubusercontent.com/openai/math/${catalog.commit}/${path}`; }
function date(d) { return d.replaceAll('-', '.'); }
function theme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#theme-toggle').innerHTML = icon(dark ? 'sun' : 'moon');
  $('#theme-toggle').setAttribute('aria-label', `切换为${dark ? '浅' : '深'}色模式`);
}
theme();
$('#theme-toggle').addEventListener('click', () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('math-theme', document.documentElement.dataset.theme); } catch { /* Reading still works without storage. */ }
  theme();
});
let toastTimer;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2500);
}

function badge(p, withSubject = true) {
  const s = subjects.get(p.subject);
  return `<div class="paper-meta"><time datetime="${p.date}">${date(p.date)}</time>
    ${withSubject ? `<a class="badge subject-badge" style="--hue:${s.hue}" href="${subjectUrl(s.id)}">${s.zh}</a>` : ''}
    <a class="badge family-badge" href="${subjectUrl(s.id)}#f${p.family}" title="查看成果系列">No. ${p.family}</a>
    ${p.lean ? `<a class="badge lean-badge" href="${source(families.get(p.family).leanPath || 'lean/formalization.yaml')}" ${external} title="官方目录标记主结果有 Lean 形式化；点此查看覆盖范围">✓ Lean</a>` : ''}</div>`;
}

function card(p, compact = false, withSubject = true) {
  return `<article class="paper${compact ? ' compact' : ''}" data-paper="${escape(p.id)}">
    <h3 class="paper-title"><a href="${paperUrl(p.id)}">${html(p.title)}</a></h3>
    ${badge(p, withSubject)}
    <div class="abstract" id="abstract-${escape(p.id)}">${html(p.abstract)}</div>
    <div class="paper-actions"><a class="action primary-action" href="${paperUrl(p.id)}">${icon('document')} 阅读论文</a>
      <a class="action" href="${source(p.path)}" ${external}>PDF ↗</a>
      <a class="action" href="${source(`preprints/${p.id}`, 'tree')}" ${external}>源码</a>
      <button class="action" data-cite="${escape(p.id)}">BibTeX</button>
      <button class="action expand" aria-expanded="false" aria-controls="abstract-${escape(p.id)}">展开摘要 <span aria-hidden="true">＋</span></button>
    </div></article>`;
}

function searchForm(value = '', hero = false) {
  return `<form class="search${hero ? ' hero-search' : ''}" role="search" ${hero ? 'action=""' : ''}>
    ${hero ? '<input type="hidden" name="view" value="all">' : ''}${icon('search')}
    <label class="sr-only" for="q">搜索论文标题、摘要或成果系列</label>
    <input id="q" name="q" type="search" value="${escape(value)}" placeholder="搜索标题、摘要或系列编号，如 Riemann、matroid、003" autocomplete="off">
    ${hero ? '<button type="submit">搜索 <span aria-hidden="true">→</span></button>' : '<kbd aria-hidden="true">/</kbd>'}</form>`;
}

function home() {
  const c = catalog.counts;
  const dates = catalog.papers.map(p => p.date).sort();
  main.className = 'home';
  main.innerHTML = `<section class="hero"><div class="eyebrow"><span class="live-dot"></span> OPENAI / MATH COLLECTION</div>
    <h1>${c.papers} 篇数学研究手稿，<br>按学科分类。</h1>
    <p class="lede">为 <a href="${catalog.repository}" ${external}>openai/math</a> 构建的阅读索引。<br class="mobile-break">${c.families} 个成果系列，横跨 ${c.subjects} 个数学领域，<br class="desktop-break">其中 ${c.lean} 篇手稿的主结果附有 Lean 形式化。</p>
    ${searchForm('', true)}
    <div class="search-hints"><span>试试搜索</span><a href="?view=all&q=Riemann">Riemann</a><a href="?view=all&q=spin+glass">spin glass</a><a href="?view=all&q=matroid">matroid</a></div>
    <dl class="stats"><div><dt>研究手稿</dt><dd>${c.papers}</dd></div><div><dt>成果系列</dt><dd>${c.families}</dd></div><div><dt>Lean 形式化</dt><dd>${c.lean}<span class="stat-dot"></span></dd></div><div class="date-stat"><dt>手稿日期</dt><dd>${date(dates[0])} <span>—</span> ${date(dates.at(-1))}</dd></div></dl>
  </section>
  <section class="subjects-section" aria-labelledby="subjects-title"><div class="section-heading"><h2 id="subjects-title">按学科浏览 <span>BROWSE BY SUBJECT</span></h2><span>${c.subjects} 个领域</span></div>
    <div class="tiles">${catalog.subjects.map(s => `<a class="tile" href="${subjectUrl(s.id)}" style="--hue:${s.hue}"><span class="tile-arrow" aria-hidden="true">↗</span><h3>${s.zh}</h3><div class="tile-en" lang="en">${s.name}</div><p title="${escape(s.descriptionEn || '')}">${s.description}</p><div class="tile-stats"><span><b>${s.papers}</b> 篇论文</span><span><b>${s.families}</b> 个系列</span><span><b>${s.lean}</b> Lean</span></div></a>`).join('')}</div>
  </section>
  <section class="recent" aria-labelledby="recent-title"><div class="section-heading"><h2 id="recent-title">最近的手稿 <span>RECENT MANUSCRIPTS</span></h2><a href="?view=all&sort=new">查看全部 ${icon('arrow')}</a></div><div class="recent-grid">${[...catalog.papers].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)).slice(0, 6).map(p => card(p, true)).join('')}</div></section>
  <aside class="source-note"><span class="note-mark">i</span><div><strong>关于这份索引</strong><p>标题、摘要与成果描述保留官方原文，分类来自仓库总览。根据仓库说明，结果处于不同验证阶段；Lean 标记的具体覆盖范围请查看相应形式化说明。</p><a href="${source('README.md')}" ${external}>阅读官方说明 ↗</a></div></aside>`;
}

function sidebar(selected) {
  return `<aside class="sidebar"><nav class="subject-nav" aria-label="数学学科"><h2>浏览学科</h2><a href="?view=all" class="subject-nav-item" ${!selected ? 'aria-current="page"' : ''}><span class="all-symbol">∑</span>全部论文<span class="nav-count">${catalog.counts.papers}</span></a>
    ${catalog.subjects.map(s => `<a href="${subjectUrl(s.id)}" class="subject-nav-item" style="--hue:${s.hue}" ${s.id === selected?.id ? 'aria-current="page"' : ''}><span class="subject-dot"></span>${s.zh}<span class="nav-count">${s.papers}</span></a>`).join('')}</nav>
    ${selected ? `<nav class="toc" aria-label="成果系列目录"><h2>本学科的成果系列</h2>${catalog.families.filter(f => f.subject === selected.id).map(f => `<a href="#f${f.id}" data-family-nav="${f.id}"><span>${f.id}</span><span>${html(f.title)}</span></a>`).join('')}</nav>` : ''}</aside>`;
}

function familyBlock(f, members) {
  const s = subjects.get(f.subject);
  return `<section class="family" id="f${f.id}" style="--hue:${s.hue}"><div class="family-head"><span class="family-number">成果系列 ${f.id}</span><h2>${html(f.title)}</h2><p class="family-description">${html(f.description)}</p>
    <div class="family-links"><span>${members.length} 篇手稿</span>${f.leanPath ? `<a class="badge lean-badge" href="${source(f.leanPath)}" ${external}>Lean 形式化说明 ↗</a>` : ''}${f.tracePath ? `<a class="badge trace-badge" href="${source(f.tracePath)}" ${external}>推理摘要 ↗</a>` : ''}</div></div>
    <div class="family-papers">${members.map(p => card(p, false, false)).join('')}</div></section>`;
}

function listing() {
  const selected = subjects.get(params.get('subject'));
  if (params.has('subject') && !selected) return notFound('未找到这个学科');
  const groupDefault = selected ? 'family' : 'flat';
  const state = { q: params.get('q') || '', lean: params.get('lean') === '1', sort: ['catalog', 'new', 'old', 'title'].includes(params.get('sort')) ? params.get('sort') : 'catalog', group: ['flat', 'family'].includes(params.get('group')) ? params.get('group') : groupDefault, limit: 36 };
  const scope = catalog.papers.filter(p => !selected || p.subject === selected.id);
  const index = new Map(scope.map(p => [p.id, norm([text(p.title), text(p.abstract), p.family, text(families.get(p.family).title), text(families.get(p.family).description), subjects.get(p.subject).name, subjects.get(p.subject).zh].join(' '))]));
  document.title = `${selected ? selected.zh : '全部论文'} — OpenAI Math`;
  $('[data-nav="all"]').setAttribute('aria-current', selected ? 'false' : 'page');
  main.className = 'layout';
  main.innerHTML = `${sidebar(selected)}<div class="content"><div class="breadcrumbs"><a href="?">首页</a><span>/</span>${selected ? '按学科浏览' : '手稿索引'}</div>
    <header class="subject-head" style="--hue:${selected?.hue || 160}"><div class="eyebrow">${selected?.name || 'ALL MANUSCRIPTS'}</div><h1>${selected?.zh || '全部论文'}</h1><p>${selected?.description || '从标题、摘要和成果系列中，找到你关心的数学问题。'}</p>${selected?.descriptionEn ? `<p class="subject-topics-en" lang="en">${escape(selected.descriptionEn)}</p>` : ''}<div class="collection-meta">${scope.length} 篇手稿<span>·</span>${new Set(scope.map(p => p.family)).size} 个系列<span>·</span>${scope.filter(p => p.lean).length} 篇附 Lean 形式化</div></header>
    <div class="controls">${searchForm(state.q)}<div class="control-row"><div class="segments" role="group" aria-label="列表显示方式"><button data-group="family" aria-pressed="${state.group === 'family'}">按系列</button><button data-group="flat" aria-pressed="${state.group === 'flat'}">论文列表</button></div><label class="checkbox"><input id="lean-only" type="checkbox" ${state.lean ? 'checked' : ''}>仅看 Lean</label><label class="sort-label"><span class="sr-only">排序</span><select id="sort"><option value="catalog">目录顺序</option><option value="new">日期：由新到旧</option><option value="old">日期：由旧到新</option><option value="title">标题 A–Z</option></select></label><button class="text-button" id="reset-filters">重置</button></div><div class="result-status" id="result-status" role="status" aria-live="polite"></div></div>
    <div id="results"></div><div id="load-more-wrap"></div></div>`;
  $('#sort').value = state.sort;
  function apply(updateUrl = true) {
    const terms = [...norm(state.q).matchAll(/"([^"]+)"|(\S+)/g)].map(m => m[1] || m[2]);
    const found = scope.filter(p => (!state.lean || p.lean) && terms.every(t => index.get(p.id).includes(t)));
    if (state.sort === 'new') found.sort((a, b) => b.date.localeCompare(a.date));
    if (state.sort === 'old') found.sort((a, b) => a.date.localeCompare(b.date));
    if (state.sort === 'title') found.sort((a, b) => text(a.title).localeCompare(text(b.title)));
    const grouped = new Map();
    found.forEach(p => { if (!grouped.has(p.family)) grouped.set(p.family, []); grouped.get(p.family).push(p); });
    const result = $('#results');
    const shownFamilies = selected ? [...grouped] : [...grouped].slice(0, state.limit);
    result.innerHTML = !found.length ? `<div class="empty-state">${icon('search')}<h2>没有找到匹配的论文</h2><p>试试英文关键词、系列编号，或清除筛选条件。</p><button class="button" id="empty-reset">清除筛选</button></div>` : state.group === 'family' ? shownFamilies.map(([id, members]) => familyBlock(families.get(id), members)).join('') : `<div class="papers">${found.slice(0, state.limit).map(p => card(p, false, !selected)).join('')}</div>`;
    const shown = state.group === 'flat' ? Math.min(found.length, state.limit) : shownFamilies.reduce((sum, [, members]) => sum + members.length, 0);
    $('#result-status').textContent = `找到 ${found.length} 篇手稿 · ${grouped.size} 个成果系列${shown < found.length ? ` · 已显示 ${shown} 篇` : ''}`;
    $('#load-more-wrap').innerHTML = shown < found.length ? `<button class="button load-more" id="load-more">继续浏览 <span>已显示 ${shown} / ${found.length}</span> ↓</button>` : found.length ? '<p class="end-note">已显示全部结果</p>' : '';
    $('#load-more')?.addEventListener('click', () => { state.limit += 36; apply(false); });
    $('#empty-reset')?.addEventListener('click', reset);
    $$('[data-group]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.group === state.group)));
    $$('[data-family-nav]').forEach(a => { a.classList.toggle('dim', !grouped.has(a.dataset.familyNav)); });
    if (updateUrl) {
      const q = new URLSearchParams();
      if (selected) q.set('subject', selected.id); else q.set('view', 'all');
      if (state.q.trim()) q.set('q', state.q.trim());
      if (state.lean) q.set('lean', '1');
      if (state.sort !== 'catalog') q.set('sort', state.sort);
      if (state.group !== groupDefault) q.set('group', state.group);
      history.replaceState(null, '', `?${q}${location.hash}`);
    }
    math(result);
    updateExpand();
  }
  function reset() { state.q = ''; state.lean = false; state.sort = 'catalog'; state.limit = 36; $('#q').value = ''; $('#lean-only').checked = false; $('#sort').value = 'catalog'; apply(); }
  let timer;
  $('#q').addEventListener('input', e => { state.q = e.target.value; state.limit = 36; clearTimeout(timer); timer = setTimeout(apply, 140); });
  $('.search').addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); apply(); });
  $('#lean-only').addEventListener('change', e => { state.lean = e.target.checked; state.limit = 36; apply(); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; apply(); });
  $$('[data-group]').forEach(b => b.addEventListener('click', () => { state.group = b.dataset.group; state.limit = 36; apply(); }));
  $('#reset-filters').addEventListener('click', reset);
  $$('[data-family-nav]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    state.group = 'family'; reset();
    history.replaceState(null, '', `${location.search}#f${a.dataset.familyNav}`);
    document.getElementById(`f${a.dataset.familyNav}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  apply(false);
}

function detail(p) {
  const s = subjects.get(p.subject), f = families.get(p.family);
  document.title = `${text(p.title)} — OpenAI Math`;
  main.className = 'reader';
  main.innerHTML = `<nav class="breadcrumbs" aria-label="位置"><a href="?">首页</a><span>/</span><a href="${subjectUrl(s.id)}">${s.zh}</a><span>/</span><a href="${subjectUrl(s.id)}#f${f.id}">系列 ${f.id}</a></nav>
    <div class="reader-layout"><article class="reader-article"><header class="reader-head"><div class="eyebrow">RESEARCH MANUSCRIPT / ${f.id}</div><h1 lang="en">${html(p.title)}</h1><div class="reader-author">OpenAI <span>·</span> ${date(p.date)}</div>${badge(p)}<div class="reader-actions"><a class="button primary" href="#full-paper">${icon('document')} 阅读全文</a><a class="button" href="${raw(p.path)}" ${external}>下载 PDF ↗</a><button class="button" data-cite="${escape(p.id)}">引用 BibTeX</button><button class="button" id="copy-link">复制链接</button></div></header>
    <section class="reader-section" id="abstract"><h2>摘要 <span>ABSTRACT</span></h2><div class="reading-prose" lang="en">${html(p.abstract)}</div></section>
    <section class="reader-section" id="family-context"><h2>所属成果系列 <span>No. ${f.id}</span></h2><h3 class="context-title">${html(f.title)}</h3><div class="reading-prose" lang="en">${html(f.description)}</div><div class="family-links">${f.leanPath ? `<a class="badge lean-badge" href="${source(f.leanPath)}" ${external}>查看 Lean 覆盖范围 ↗</a>` : ''}${f.tracePath ? `<a class="badge trace-badge" href="${source(f.tracePath)}" ${external}>阅读推理摘要 ↗</a>` : ''}</div></section>
    <section class="reader-section full-paper" id="full-paper"><div class="section-heading"><h2>论文全文 <span>ORIGINAL PDF</span></h2><a href="${source(p.path)}" ${external}>在 GitHub 打开 ↗</a></div><div id="pdf-reader" data-url="${raw(p.path)}"><div class="pdf-placeholder">${icon('document')}<h3>在这里，继续阅读原论文</h3><p>保留原始数学排版，支持翻页、缩放与文字选择。</p><button class="button primary" id="load-pdf">打开 PDF 阅读器</button><span>从官方仓库加载 · 无需离开页面</span></div></div></section>
    ${catalog.papers.filter(item => item.family === p.family && item.id !== p.id).length ? `<section class="reader-section"><h2>同系列论文 <span>RELATED MANUSCRIPTS</span></h2><div class="papers">${catalog.papers.filter(item => item.family === p.family && item.id !== p.id).map(item => card(item, false, false)).join('')}</div></section>` : ''}</article>
    <aside class="reader-aside"><div class="reader-aside-inner"><h2>本页目录</h2><nav aria-label="论文阅读目录"><a href="#abstract">摘要</a><a href="#family-context">成果系列</a><a href="#full-paper">论文全文</a></nav><div class="aside-divider"></div><h2>原始材料</h2><a href="${source(p.path)}" ${external}>论文 PDF ↗</a><a href="${source(`preprints/${p.id}`, 'tree')}" ${external}>LaTeX 与构建说明 ↗</a>${p.lean ? `<a href="${source(f.leanPath || 'lean/formalization.yaml')}" ${external}>Lean 形式化说明 ↗</a>` : ''}<div class="aside-note">本页保留官方英文原文。${p.lean ? '主结果的形式化标记来自官方目录，具体范围见 Lean 说明。' : '官方目录未将本篇标记为主结果已形式化。'}</div><div class="reader-type-controls"><span>摘要字号</span><button id="font-down" class="icon-button" aria-label="减小摘要字号">A−</button><button id="font-up" class="icon-button" aria-label="增大摘要字号">A＋</button></div></div></aside></div>`;
  let fontSize = 18;
  try { fontSize = Math.max(16, Math.min(24, Number(localStorage.getItem('math-font-size')) || 18)); } catch { /* Optional preference. */ }
  main.style.setProperty('--reading-size', `${fontSize}px`);
  function font(delta) { fontSize = Math.max(16, Math.min(24, fontSize + delta)); main.style.setProperty('--reading-size', `${fontSize}px`); try { localStorage.setItem('math-font-size', fontSize); } catch { /* Optional preference. */ } }
  $('#font-down').addEventListener('click', () => font(-1));
  $('#font-up').addEventListener('click', () => font(1));
  $('#copy-link').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); toast('阅读链接已复制'); } catch { toast('无法访问剪贴板，请复制浏览器地址栏中的链接'); } });
  $('#load-pdf').addEventListener('click', async () => {
    const btn = $('#load-pdf'); btn.disabled = true; btn.textContent = '正在打开阅读器…';
    try { const { openPdf } = await import('./pdf-reader.js'); await openPdf($('#pdf-reader')); }
    catch (error) { btn.disabled = false; btn.textContent = '重试打开阅读器'; toast('阅读器加载失败，可通过上方链接打开原始 PDF'); console.error(error); }
  });
}

function updateExpand() {
  requestAnimationFrame(() => $$('.paper').forEach(p => {
    const a = $('.abstract', p), b = $('.expand', p);
    if (b && !p.classList.contains('expanded')) b.hidden = a.scrollHeight <= a.clientHeight + 3;
  }));
}

function notFound(message = '未找到这篇论文') {
  main.className = 'home';
  main.innerHTML = `<div class="empty-state"><span class="brand-mark">∮</span><h1>${message}</h1><p>链接可能已过期，可以回到索引重新查找。</p><a class="button primary" href="?view=all">浏览全部论文</a></div>`;
}

document.addEventListener('click', async e => {
  const more = e.target.closest('.expand');
  if (more) { const expanded = more.closest('.paper').classList.toggle('expanded'); more.setAttribute('aria-expanded', String(expanded)); more.innerHTML = expanded ? '收起摘要 −' : '展开摘要 ＋'; }
  const cite = e.target.closest('[data-cite]');
  if (cite && papers) {
    const value = papers.get(cite.dataset.cite)?.bibtex;
    if (!value) return;
    $('#citation-text').value = value;
    $('#citation-dialog').showModal();
  }
});
$('#copy-citation').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#citation-text').value); toast('BibTeX 引用已复制'); $('#citation-dialog').close(); }
  catch { $('#citation-text').focus(); $('#citation-text').select(); toast('请按 Ctrl+C / ⌘C 复制选中的引用'); }
});
$('#citation-dialog').addEventListener('click', e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.currentTarget.close(); } });
document.addEventListener('keydown', e => {
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input, textarea, select, [contenteditable="true"]') && !$('#citation-dialog').open) {
    const input = $('#q'); if (input) { e.preventDefault(); input.focus(); }
  }
  if (e.key === 'Escape' && e.target.matches('#q')) { e.target.value = ''; e.target.dispatchEvent(new Event('input')); }
});
window.addEventListener('resize', updateExpand);

async function init() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/catalog.json?v=${__CATALOG_VERSION__}`);
    if (!response.ok) throw new Error(`Catalogue HTTP ${response.status}`);
    catalog = await response.json();
    subjects = new Map(catalog.subjects.map(s => [s.id, s]));
    families = new Map(catalog.families.map(f => [f.id, f]));
    papers = new Map(catalog.papers.map(p => [p.id, p]));
    if (params.has('paper')) { const p = papers.get(params.get('paper')); p ? detail(p) : notFound(); }
    else if (params.has('subject') || params.get('view') === 'all' || params.has('q')) listing();
    else home();
    $('#footer').innerHTML = `<div class="footer-inner"><div><a class="footer-brand" href="?"><span>∮</span> OpenAI Math</a><p>让数学手稿更容易找到，也更容易读。</p></div><div class="footer-meta"><p>非官方阅读映射 · 内容来源 <a href="${catalog.repository}" ${external}>openai/math ↗</a></p><p>数据版本 <a href="${catalog.repository}/commit/${catalog.commit}" ${external}>${catalog.commit.slice(0, 7)}</a><span>·</span><a href="${import.meta.env.BASE_URL}data/UPSTREAM-LICENSE.txt" ${external}>Apache-2.0</a></p></div></div>`;
    math(); updateExpand();
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
  } catch (error) {
    console.error(error);
    main.className = 'home';
    main.innerHTML = '<div class="empty-state"><h1>暂时无法打开手稿索引</h1><p>数据加载失败，请刷新页面重试。</p><button class="button primary" id="retry">重新加载</button><a class="text-button" href="https://github.com/openai/math/blob/main/CONTENTS.md">打开官方目录 ↗</a></div>';
    $('#retry').addEventListener('click', () => location.reload());
  }
}
init();
