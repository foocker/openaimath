(() => {
  const { duration, chapters, cues } = window.EXPLAINER_TIMING;
  const tl = gsap.timeline({ paused: true });
  const q = selector => document.querySelector(selector);
  const at = index => chapters[index].start;
  const fade = (target, from, to, start, length = .55) => tl.fromTo(target, { opacity: from }, { opacity: to, duration: length, ease: 'power1.inOut', immediateRender: false }, start);
  chapters.forEach((chapter, i) => {
    if (i === 0) tl.set('#phase-0', { opacity: 1 }, 0);
    else {
      fade(`#phase-${i}`, 0, 1, chapter.start - .4, .4);
      tl.fromTo(`#phase-${i} .editorial`, { y: 12 }, { y: 0, duration: .4, ease: 'power2.out', immediateRender: false }, chapter.start - .4);
    }
    if (i < chapters.length - 1) fade(`#phase-${i}`, 1, 0, chapter.end - .65, .25);
  });
  document.querySelectorAll('.draw').forEach((path, i) => {
    const length = path.getTotalLength();
    tl.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out' }, .2 + i * .8);
  });
  fade('#rational-points', 0, 1, 1.7);
  fade('#analytic-rank', 0, 1, at(1) + 3);
  fade('.rank-link', 0, 1, at(1) + 8);
  fade('.condition-focus', 0, 1, at(2) + 2);
  document.querySelectorAll('.condition-details>div').forEach((element, i) => fade(element, 0, 1, at(2) + 4 + i * .6));
  fade('#bsd-equation', 0, 1, at(3) + .3);
  document.querySelectorAll('.legend-item').forEach((element, i) => fade(element, 0, 1, at(3) + 3 + i * .7));
  document.querySelectorAll('.prime').forEach((element, i) => fade(element, 0, 1, at(4) + .5 + i * .5));
  fade('.valuations', 0, 1, at(4) + 7);
  fade('#ratio-result', 0, 1, at(4) + 11);
  document.querySelectorAll('.conclusion-row').forEach((element, i) => fade(element, 0, 1, at(5) + .5 + i * 1.1));
  const state = { time: 0 };
  const current = (entries, time) => entries.findLast(entry => entry.start <= time) || entries[0];
  const stamp = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  let lastCaption, lastChapter;
  function update() {
    const chapter = current(chapters, state.time), caption = current(cues, state.time).text;
    if (chapter !== lastChapter) { q('#chapter-label').textContent = `${String(chapters.indexOf(chapter) + 1).padStart(2, '0')} / ${chapter.title}`; lastChapter = chapter; }
    if (caption !== lastCaption) { q('#caption-text').textContent = caption; lastCaption = caption; }
    q('#film-time').textContent = stamp(state.time);
    q('#film-progress-fill').style.transform = `scaleX(${state.time / duration})`;
  }
  tl.to(state, { time: duration, duration, ease: 'none', onUpdate: update }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['bsd'] = tl;
  window.explainerSeek = time => { tl.totalTime(Math.max(0, Math.min(duration, time)), false); update(); };
  window.explainerSeek(0);
})();
