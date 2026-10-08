import assert from 'node:assert/strict';
import { existsSync, readdirSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { chromium } from 'playwright';
import { preview } from 'vite';

mkdirSync('artifacts', { recursive: true });
const data = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'));
let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
if (!executablePath && !existsSync(chromium.executablePath())) {
  const cache = join(homedir(), 'AppData/Local/ms-playwright');
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))) {
      const candidate = join(cache, dir, 'chrome-win64/chrome.exe');
      if (existsSync(candidate)) { executablePath = candidate; break; }
    }
  }
}
const server = await preview({ preview: { host: '127.0.0.1', port: 4180, strictPort: true } });
const base = 'http://127.0.0.1:4180/';
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function go(query = '') { await page.goto(base + query); await page.locator('.footer-inner').waitFor(); await page.evaluate(() => document.fonts.ready); }
  async function noOverflow(label) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal page overflow`); }

  await go();
  assert.equal(await page.locator('.tile').count(), 17);
  assert((await page.locator('h1').innerText()).includes('722'));
  await noOverflow('desktop home');
  await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
  console.log('PASS home: 17 subjects, 722 manuscripts, local fonts');

  await page.locator('#q').fill('Riemann');
  await page.locator('.hero-search button').click();
  await page.waitForURL(/q=Riemann/);
  await page.locator('.paper').first().waitFor();
  assert((await page.locator('#result-status').innerText()).includes('找到'));
  assert(await page.locator('.paper').count() > 0);
  await page.locator('#q').fill('zz_no_such_manuscript_9897');
  await page.locator('.empty-state').waitFor();
  await page.locator('#empty-reset').click();
  assert((await page.locator('#result-status').innerText()).includes('722'));
  await page.locator('#lean-only').check();
  await page.waitForFunction(() => document.querySelector('#result-status').textContent.includes('162'));
  assert.equal(await page.locator('.paper').count(), await page.locator('.paper .lean-badge').count());
  await page.reload();
  await page.locator('.paper').first().waitFor();
  assert(await page.locator('#lean-only').isChecked());
  console.log('PASS search, empty state, reset, paper-level Lean filter, reloadable URL');

  await go('?subject=number-theory#f003');
  assert.equal(await page.locator('.family').count(), 31);
  assert.equal(await page.locator('#f003 .paper').count(), 3);
  assert.equal(await page.locator('#f003 .paper .lean-badge').count(), 2);
  assert(await page.locator('.katex').count() > 0);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/subject-desktop.png' });
  await page.locator('[data-group="flat"]').click();
  await page.locator('#sort').selectOption('new');
  const dates = await page.locator('.paper time').evaluateAll(items => items.map(i => i.dateTime));
  assert.deepEqual(dates, [...dates].sort().reverse());
  const before = await page.locator('.paper').count();
  await page.locator('#load-more').click();
  assert(await page.locator('.paper').count() > before);
  console.log('PASS subject families, exact Lean scope, math rendering, sorting, pagination');

  const citedId = await page.locator('[data-cite]').first().getAttribute('data-cite');
  await page.locator('[data-cite]').first().click();
  assert.equal(await page.locator('#citation-text').inputValue(), data.papers.find(p => p.id === citedId).bibtex);
  await page.locator('#copy-citation').click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n'), data.papers.find(p => p.id === citedId).bibtex.replaceAll('\r\n', '\n'));
  console.log('PASS original BibTeX and clipboard copy');

  const example = data.papers.find(p => p.family === '321');
  await go(`?paper=${encodeURIComponent(example.id)}`);
  await page.locator('#font-up').click();
  assert.equal(await page.locator('#main').evaluate(e => e.style.getPropertyValue('--reading-size')), '19px');
  await page.screenshot({ path: 'artifacts/reader-desktop.png', fullPage: true });
  await page.locator('#load-pdf').click();
  await page.waitForFunction(() => document.querySelector('.pdf-status')?.textContent.includes('可选中文字'), null, { timeout: 60000 });
  assert(await page.locator('.textLayer span').count() > 10);
  await page.locator('#pdf-next').click();
  await page.waitForFunction(() => document.querySelector('.pdf-status')?.textContent.startsWith('第 2 /'));
  await page.locator('#pdf-plus').click();
  await page.waitForFunction(() => document.querySelector('#pdf-zoom-value')?.textContent === '125%' && document.querySelector('.pdf-status')?.textContent.includes('可选中文字'));
  await page.locator('#pdf-fit').click();
  await page.waitForFunction(() => document.querySelector('#pdf-zoom-value')?.textContent === '100%' && document.querySelector('.pdf-status')?.textContent.includes('可选中文字'));
  await page.locator('#full-paper').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/pdf-desktop.png' });
  console.log('PASS reader font controls, live upstream PDF, text selection layer, pagination and zoom');

  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await go();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.screenshot({ path: 'artifacts/home-dark.png' });
  await page.locator('#theme-toggle').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await go();
  await noOverflow('mobile home');
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
  await page.locator('.tile').first().click();
  await page.locator('.family').first().waitFor();
  await noOverflow('mobile subject');
  await page.screenshot({ path: 'artifacts/subject-mobile.png' });
  await go(`?paper=${encodeURIComponent(example.id)}`);
  await noOverflow('mobile reader');
  await page.screenshot({ path: 'artifacts/reader-mobile.png', fullPage: true });
  await go('?paper=nonexistent');
  assert((await page.locator('h1').innerText()).includes('未找到'));
  console.log('PASS dark mode persistence, mobile layouts, missing-paper state');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('All smoke checks passed. Screenshots saved to artifacts/.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
