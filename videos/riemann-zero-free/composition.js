/* A continuous mathematical diagram, driven only by a paused, seekable timeline. */
(() => {
  const { duration, chapters, cues } = window.RIEMANN_TIMING;
  const tl = gsap.timeline({ paused: true });
  const q = s => document.querySelector(s);
  const at = index => chapters[index].start;
  const fade = (target, from, to, start, length = .65) => tl.fromTo(target, { opacity: from }, { opacity: to, duration: length, ease: 'power1.inOut', immediateRender: false }, start);
  document.querySelectorAll('.draw').forEach((path, i) => {
    const length = path.getTotalLength();
    tl.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: .9, ease: 'power2.out' }, .2 + i * .2);
  });
  chapters.forEach((chapter, i) => {
    if (i === 0) tl.set('#phase-0', { opacity: 1, y: 0 }, 0);
    else {
      fade(`#phase-${i}`, 0, 1, chapter.start - .4, .4);
      tl.fromTo(`#phase-${i}`, { y: 12 }, { y: 0, duration: .4, ease: 'power2.out', immediateRender: false }, chapter.start - .4);
    }
    if (i < chapters.length - 1) fade(`#phase-${i}`, 1, 0, chapter.end - .65, .25);
  });
  document.querySelectorAll('.zero').forEach((point, i) => fade(point, 0, 1, at(2) + 1.3 + i * .45, .45));
  fade('#zero-callout', 0, 1, at(2) + 5.2);
  fade('#zero-callout', 1, 0, at(3));
  fade('#boundary', 0, 1, at(3) + .4);
  tl.fromTo('#boundary', { x: 0 }, { x: -75, duration: 2.4, ease: 'power2.inOut', immediateRender: false }, at(3) + 1);
  ['#right-region', '#right-hatch'].forEach(selector => {
    fade(selector, 0, 1, at(3) + .4);
    tl.fromTo(selector, { attr: { x: 760, width: 140 } }, { attr: { x: 685, width: 215 }, duration: 2.4, ease: 'power2.inOut', immediateRender: false }, at(3) + 1);
  });
  fade('#boundary-label', 0, 1, at(3) + 3.4);
  fade('#region-label', 0, 1, at(3) + 3.4);
  fade('#pole', 0, 1, at(3) + 6.2);
  fade('#plot-base', 1, .13, at(4));
  fade('#proof', 0, 1, at(4) + .6);
  ['#proof-a', '#proof-b', '#proof-c'].forEach((s, i) => fade(s, 0, 1, at(4) + .6 + i * 2.4));
  ['#proof-link-a', '#proof-link-b'].forEach((s, i) => {
    const length = q(s).getTotalLength();
    tl.fromTo(s, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: .7, ease: 'power2.out', immediateRender: false }, at(4) + 2.3 + i * 2.4);
  });
  fade('#proof', 1, 0, at(5) - .5, .5);
  fade('#plot-base', .13, 1, at(5));
  ['#left-region', '#mirror-boundary', '#mirror-label'].forEach(s => fade(s, 0, 1, at(5) + 1, 1.1));
  fade('#band-label', 1, 0, at(5));
  fade('#interval-bracket', 0, 1, at(5) + 1.8);
  fade('#interval-label', 0, 1, at(5) + 2.5);
  const state = { time: 0 };
  const stamp = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const current = (entries, time) => entries.findLast(entry => entry.start <= time) || entries[0];
  let previousCaption, previousChapter;
  function update() {
    const chapter = current(chapters, state.time);
    const caption = current(cues, state.time).text;
    if (previousChapter !== chapter) {
      q('#chapter-label').textContent = `${String(chapters.indexOf(chapter) + 1).padStart(2, '0')} / ${chapter.title}`;
      q('#plot-note').textContent = chapters.indexOf(chapter) >= 2 ? '六个数值例子 · 仅示有限窗口' : '仅示上半平面的有限窗口';
      previousChapter = chapter;
    }
    if (caption !== previousCaption) { q('#caption-text').textContent = caption; previousCaption = caption; }
    q('#film-time').textContent = stamp(state.time);
    q('#film-progress-fill').style.transform = `scaleX(${state.time / duration})`;
  }
  tl.to(state, { time: duration, duration, ease: 'none', onUpdate: update }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['riemann'] = tl;
  window.riemannSeek = time => { tl.totalTime(Math.max(0, Math.min(duration, time)), false); update(); };
  window.riemannSeek(0);
})();
