import assert from 'node:assert/strict';
import { existsSync, readdirSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { chromium } from 'playwright';
import { preview } from 'vite';

const slug = process.argv[2] || 'riemann-zero-free';
assert(['riemann-zero-free', 'bsd-low-corank'].includes(slug));
const isBsd = slug === 'bsd-low-corank';
const timing = JSON.parse(readFileSync(`videos/${slug}/timing.json`, 'utf8'));
const content = JSON.parse(readFileSync(`videos/${slug}/content.json`, 'utf8'));
const artifact = isBsd ? 'artifacts/bsd-video' : 'artifacts/riemann-video';
mkdirSync(artifact, { recursive: true });
let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
if (!executablePath && !existsSync(chromium.executablePath())) {
  const cache = join(homedir(), 'AppData/Local/ms-playwright');
  for (const dir of readdirSync(cache).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const file = join(cache, dir, 'chrome-win64/chrome.exe');
    if (existsSync(file)) { executablePath = file; break; }
  }
}
const liveBase = process.env.EXPLAINER_TEST_BASE;
const server = liveBase ? null : await preview({ base: '/openaimath/', preview: { host: '127.0.0.1', port: 4182, strictPort: true } });
const base = liveBase || 'http://127.0.0.1:4182/openaimath/';
const url = `${base}explainers/${slug}/`;
let browser;
const errors = [], badRequests = [];
try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) badRequests.push(`${response.status()} ${response.url()}`); });
  await page.goto(url);
  await page.locator('#player[data-ready="true"]').waitFor({ timeout: 45000 });
  const composition = () => page.frames().find(frame => frame.url().includes('composition.html'));
  const film = composition();
  await film.waitForFunction(() => document.querySelector('#narration').readyState >= 1);
  assert.equal(await film.locator('#narration').evaluate(audio => audio.paused), true, 'No autoplay');
  assert.equal(await page.locator('#chapters button').count(), 6);
  assert.equal(await page.locator('#transcript button').count(), timing.cues.length);
  assert(Math.abs(await film.locator('#narration').evaluate(audio => audio.duration) - timing.duration) < .1);
  console.log('PASS local audio duration, chapters, transcript, no autoplay');

  await page.locator('#play').click();
  await film.waitForFunction(() => document.querySelector('#narration').currentTime > .7);
  await page.locator('#speed').selectOption('1.5');
  assert.equal(await film.locator('#narration').evaluate(audio => audio.playbackRate), 1.5);
  await page.locator('#mute').click();
  assert.equal(await film.locator('#narration').evaluate(audio => audio.muted), true);
  await page.locator('#play').click();
  const pauseTime = await film.locator('#narration').evaluate(audio => audio.currentTime);
  await page.waitForTimeout(250);
  assert.equal(await film.locator('#narration').evaluate(audio => audio.currentTime), pauseTime);
  console.log('PASS play, pause, playback speed, mute');

  async function seek(time) {
    await page.locator('#progress').fill(String(Math.round(time * 20) / 20));
    await film.evaluate(() => document.fonts.ready);
  }
  if (!isBsd) {
  await seek(48);
  assert.equal(await film.locator('#right-region').getAttribute('x'), '685');
  assert.equal(await film.locator('#right-region').getAttribute('width'), '215');
  assert.equal(await film.locator('#pole').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.match(await page.locator('#live-caption').innerText(), /极点|严格/);
  await seek(86);
  assert.equal(await film.locator('#mirror-label').evaluate(el => getComputedStyle(el).opacity), '1');
  await seek(32);
  assert.equal(await film.locator('#right-region').evaluate(el => getComputedStyle(el).opacity), '0');
  assert.equal(await film.locator('#mirror-label').evaluate(el => getComputedStyle(el).opacity), '0');
  assert.deepEqual(await film.locator('.zero').evaluateAll(elements => elements.map(el => el.getAttribute('cx'))), Array(6).fill('460'));
  } else {
    await seek(49);
    assert.equal(await film.locator('.katex-error').count(), 0);
    assert.equal(await film.locator('.formula-legend .legend-item').count(), 5);
    assert((await film.locator('#bsd-equation').innerText()).includes('Sha'));
    assert((await film.locator('#bsd-equation').innerText()).includes('tors'));
    assert((await film.locator('#phase-2 .selmer-definition').innerText()).includes('∞'));
    await seek(73);
    assert.equal(await film.locator('#ratio-result').evaluate(el => getComputedStyle(el).opacity), '1');
    await seek(65);
    assert.equal(await film.locator('#ratio-result').evaluate(el => getComputedStyle(el).opacity), '0', 'Later conclusion must stay hidden before its cue, including after reverse seek');
    await seek(32);
    assert.equal(await film.locator('#phase-2').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await film.locator('#phase-4').evaluate(el => getComputedStyle(el).opacity), '0');
  }
  const before = await page.locator('#canvas').screenshot();
  await seek(86); await seek(32);
  assert.deepEqual(await page.locator('#canvas').screenshot(), before, 'Same frame after reverse seek');
  console.log(isBsd ? 'PASS full q-power condition, five BSD factors, rational-ratio conclusion, deterministic backwards seek' : 'PASS exact 7/8 geometry, excluded pole, symmetric region, deterministic backwards seek');

  const sampleTimes = isBsd ? timing.chapters.map(chapter => (chapter.start + chapter.end) / 2) : [4, 17, 32, 48, 65, 86];
  for (const [index, time] of sampleTimes.entries()) {
    await seek(time);
    await page.locator('#canvas').screenshot({ path: `${artifact}/chapter-${index + 1}.png` });
    const overflow = await film.evaluate(() => [...document.querySelectorAll('.phase')].filter(el => Number(getComputedStyle(el).opacity) > .9).flatMap(el => [...el.querySelectorAll('h1,h2,p,.formula,.hero-fractions,.math')]).filter(el => el.getBoundingClientRect().bottom > 926 || el.getBoundingClientRect().right > 1841).map(el => el.textContent));
    assert.deepEqual(overflow, [], `Chapter ${index + 1}: safe content area`);
  }
  await page.locator('#chapters button').nth(3).click();
  assert(Math.abs(Number(await page.locator('#progress').inputValue()) - timing.chapters[3].start) < .1);
  await page.locator('#cc').click();
  assert.equal(await film.locator('#captions').evaluate(el => getComputedStyle(el).opacity), '0');
  await page.locator('#cc').click();
  await page.screenshot({ path: `${artifact}/player-desktop.png`, fullPage: true });
  console.log('PASS all chapter screenshots, safe typography, chapter controls, caption toggle');

  await page.setViewportSize({ width: 390, height: 844 });
  await seek(48);
  assert(await page.locator('#live-caption').isVisible());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: `${artifact}/player-mobile.png`, fullPage: true });
  await page.goto(`${base}?paper=${content.paperId}#explainer`);
  await page.locator('.explainer-frame').scrollIntoViewIfNeeded();
  const embedded = page.frameLocator('.explainer-frame');
  await embedded.locator('#player[data-ready="true"]').waitFor({ timeout: 45000 });
  await page.waitForFunction(() => document.querySelector('.explainer-frame').style.height !== '');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const iframeHeight = await page.locator('.explainer-frame').evaluate(el => el.clientHeight);
  const bodyHeight = await embedded.locator('body').evaluate(el => el.getBoundingClientRect().height);
  assert(Math.abs(iframeHeight - bodyHeight) < 4, `Frame height ${iframeHeight} must fit player ${bodyHeight}`);
  assert.equal(await page.locator('.reader-actions a[href="#explainer"]').count(), 1);
  assert((await page.locator('.explainer-intro').innerText()).includes(`${Math.round(timing.duration)} 秒`));
  assert((await page.locator('.reader-aside a[href="#explainer"]').innerText()).includes(`${Math.round(timing.duration)} 秒`));
  if (isBsd) {
    assert((await page.locator('.explainer-note').innerText()).includes('余秩为 0 或 1'));
    assert.equal(await page.locator('.reader-head .lean-badge').count(), 0);
  }
  await page.screenshot({ path: `${artifact}/paper-mobile.png`, fullPage: true });
  console.log('PASS GitHub Pages subdirectory URLs, mobile captions, embedded height and paper association');
  assert.deepEqual(errors, []);
  assert.deepEqual(badRequests, []);
  writeFileSync(`${artifact}/verification.json`, JSON.stringify({ base, duration: timing.duration, chapters: 6, errors, badRequests, passed: true }, null, 2));
} finally {
  await browser?.close();
  await server?.close();
}
