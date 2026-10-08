(() => {
  const $ = selector => document.querySelector(selector);
  const timing = window.EXPLAINER_TIMING;
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  document.documentElement.classList.toggle('embed', embedded);
  const frame = $('#composition'), player = $('#player'), progress = $('#progress');
  let audio, film, playing = false, ready = false, frameRequest, captions = true;
  const stamp = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const current = (list, time) => list.findLast(entry => entry.start <= time) || list[0];
  const duration = timing.duration;
  progress.max = String(duration);
  function reportHeight() {
    if (embedded && parent !== window) parent.postMessage({ type: 'openaimath-explainer-height', height: Math.ceil(document.body.getBoundingClientRect().height) }, location.origin);
  }
  function resize() {
    frame.style.transform = `scale(${$('#canvas').clientWidth / 1920})`;
    if (film) film.document.querySelector('#captions').style.opacity = captions && innerWidth > 700 ? '1' : '0';
    reportHeight();
  }
  new ResizeObserver(resize).observe($('#canvas'));
  new ResizeObserver(reportHeight).observe(document.body);
  function draw(time) {
    if (!ready) return;
    (film.explainerSeek || film.riemannSeek)(time);
    progress.value = time;
    const display = `${stamp(time)} / ${stamp(duration)}`;
    $('#clock').textContent = display;
    progress.setAttribute('aria-valuetext', display);
    const chapter = timing.chapters.indexOf(current(timing.chapters, time));
    $('#chapters').querySelectorAll('button').forEach((button, index) => button.setAttribute('aria-current', String(index === chapter)));
    const text = current(timing.cues, time).text;
    if ($('#live-caption').textContent !== text) $('#live-caption').textContent = text;
  }
  function state(isPlaying) {
    playing = isPlaying;
    $('#play').innerHTML = isPlaying ? 'Ⅱ <span>暂停</span>' : '▶ <span>播放</span>';
    $('#play').setAttribute('aria-label', isPlaying ? '暂停' : '播放');
    player.dataset.playing = String(isPlaying);
  }
  function tick() {
    draw(Math.min(duration, audio.currentTime));
    if (playing) frameRequest = requestAnimationFrame(tick);
  }
  function pause() {
    if (!ready) return;
    audio.pause(); state(false); cancelAnimationFrame(frameRequest); draw(audio.currentTime);
  }
  async function play() {
    if (!ready) return;
    if (audio.currentTime >= duration - .08 || audio.ended) audio.currentTime = 0;
    $('#cover-play').hidden = true;
    try { await audio.play(); $('#player-status').textContent = ''; }
    catch { state(false); $('#player-status').textContent = '声音暂未加载成功，请重试播放。也可以先拖动进度查看画面和字幕。'; }
  }
  function seek(time) {
    if (!ready) return;
    const value = Math.max(0, Math.min(duration, time));
    audio.currentTime = value; draw(value); $('#cover-play').hidden = true;
  }
  function jump(time) { seek(time); }
  timing.chapters.forEach((chapter, index) => {
    const button = document.createElement('button');
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')} · ${stamp(chapter.start)}</span>${chapter.short}`;
    button.title = chapter.title;
    button.addEventListener('click', () => jump(chapter.start));
    $('#chapters').append(button);
  });
  timing.cues.forEach(cue => {
    const button = document.createElement('button');
    const time = document.createElement('time'); time.textContent = stamp(cue.start);
    const text = document.createElement('span'); text.textContent = cue.text;
    button.append(time, text); button.addEventListener('click', () => { jump(cue.start); player.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    $('#transcript').append(button);
  });
  async function onFrameReady() {
    if (ready) return;
    film = frame.contentWindow;
    if (!film.explainerSeek && !film.riemannSeek) { $('#player-status').textContent = '画面未能加载，请刷新页面重试。'; return; }
    audio = film.document.querySelector('#narration');
    audio.addEventListener('play', () => { state(true); cancelAnimationFrame(frameRequest); tick(); });
    audio.addEventListener('pause', () => { state(false); cancelAnimationFrame(frameRequest); draw(Math.min(duration, audio.currentTime)); });
    audio.addEventListener('ended', () => { state(false); cancelAnimationFrame(frameRequest); draw(duration); $('#player-status').textContent = '讲解结束。可以选择章节回看，或继续阅读原论文。'; });
    audio.addEventListener('error', () => { pause(); $('#player-status').textContent = '旁白加载失败，请刷新后重试。进度条仍可用于查看画面。'; });
    await film.document.fonts.ready;
    ready = true; player.dataset.ready = 'true'; $('#play').disabled = false;
    $('#player-status').textContent = ''; draw(.9); progress.value = 0; $('#clock').textContent = `00:00 / ${stamp(duration)}`; resize();
  }
  frame.addEventListener('load', onFrameReady);
  if (frame.contentDocument?.readyState === 'complete' && (frame.contentWindow.explainerSeek || frame.contentWindow.riemannSeek)) onFrameReady();
  $('#cover-play').addEventListener('click', play);
  $('#play').addEventListener('click', () => playing ? pause() : play());
  $('#restart').addEventListener('click', () => { seek(0); play(); });
  progress.addEventListener('input', () => seek(Number(progress.value)));
  $('#speed').addEventListener('change', event => { if (audio) audio.playbackRate = Number(event.target.value); });
  $('#mute').addEventListener('click', () => { if (audio) { audio.muted = !audio.muted; $('#mute').setAttribute('aria-pressed', String(audio.muted)); $('#mute').setAttribute('aria-label', audio.muted ? '取消静音' : '静音'); } });
  $('#cc').addEventListener('click', () => { captions = !captions; $('#cc').setAttribute('aria-pressed', String(captions)); player.classList.toggle('captions-off', !captions); resize(); });
  if (!document.fullscreenEnabled) $('#fullscreen').hidden = true;
  $('#fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await player.requestFullscreen(); }
    catch { $('#player-status').textContent = '此浏览器暂不支持全屏，可以单独打开讲解页面。'; }
  });
  player.addEventListener('keydown', event => {
    if (event.target.closest('button, input, select, a')) return;
    if (event.code === 'Space' || event.key.toLowerCase() === 'k') { event.preventDefault(); playing ? pause() : play(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); seek((audio?.currentTime || 0) + 5); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seek((audio?.currentTime || 0) - 5); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  if (location.hash === '#transcript') $('#transcript').closest('details').open = true;
  resize();
})();
