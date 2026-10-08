import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const project = join(root, 'videos/riemann-zero-free');
const target = join(root, 'public/explainers/riemann-zero-free');
const assets = join(project, 'assets');
mkdirSync(assets, { recursive: true });
mkdirSync(target, { recursive: true });
const read = name => readFileSync(join(project, name), 'utf8');
const timing = JSON.parse(read('timing.json'));
const content = JSON.parse(read('content.json'));
if (!timing.duration || timing.chapters.length !== content.chapters.length) throw new Error('Regenerate narration and timings.');
const version = createHash('sha256').update(['composition.html.txt', 'composition.css', 'composition.js', 'player.html.txt', 'player.css', 'player.js', 'timing.json'].map(read).join('')).digest('hex').slice(0, 12);
const allText = ['composition.html.txt', 'player.html.txt', 'composition.js', 'player.js', 'timing.json'].map(read).join('');
const characters = new Set([...allText].map(char => char.codePointAt(0)));
const packageRoot = join(root, 'node_modules/@fontsource/noto-sans-sc');
let fontCss = '';
for (const weight of [400, 700]) {
  const css = readFileSync(join(packageRoot, `${weight}.css`), 'utf8');
  for (const block of css.matchAll(/@font-face\s*\{[^}]+\}/g)) {
    const range = block[0].match(/unicode-range:([^;]+)/)[1];
    const ranges = range.split(',').map(value => value.trim().slice(2).split('-').map(hex => parseInt(hex, 16)));
    if (!ranges.some(([min, max = min]) => [...characters].some(code => code >= min && code <= max))) continue;
    const file = block[0].match(/files\/([^')]+\.woff2)/)[1];
    cpSync(join(packageRoot, 'files', file), join(assets, file));
    fontCss += block[0].replace(/src:[^;]+;/, `src: url('./${file}') format('woff2');`).replace('font-display: swap', 'font-display: block') + '\n';
  }
}
for (const subset of ['latin', 'greek']) {
  const file = `source-serif-4-${subset}-400-normal.woff2`;
  cpSync(join(root, 'node_modules/@fontsource/source-serif-4/files', file), join(assets, file));
  fontCss += `@font-face{font-family:'Source Serif 4';font-style:normal;font-weight:400;font-display:block;src:url('./${file}') format('woff2');${subset === 'greek' ? 'unicode-range:U+0370-03FF;' : 'unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF,U+2212,U+2215;'}}\n`;
}
writeFileSync(join(assets, 'fonts.css'), fontCss);
cpSync(join(root, 'node_modules/gsap/dist/gsap.min.js'), join(assets, 'gsap.min.js'));
for (const [from, to] of [
  ['@fontsource/noto-sans-sc/LICENSE', 'Noto-Sans-SC-LICENSE.txt'],
  ['@fontsource/source-serif-4/LICENSE', 'Source-Serif-4-LICENSE.txt'],
  ['gsap/README.md', 'GSAP-README.md'],
]) cpSync(join(root, 'node_modules', from), join(assets, to));

const ys = [10, 20, 30, 40];
const y = value => 630 - value * 13;
const grid = ys.map(value => `<path d="M80 ${y(value)}H900"/>`).join('') + [310, 460, 610, 760].map(x => `<path d="M${x} 65V640"/>`).join('');
const yticks = ys.map(value => `<text x="142" y="${y(value) + 8}">${value}</text>`).join('');
// Positive ordinates of the first six nontrivial zeta zeros, rounded numerical examples.
const zeros = [14.1347251417, 21.0220396388, 25.0108575801, 30.4248761259, 32.9350615877, 37.5861781588];
const points = zeros.map((value, i) => `<circle id="zero-${i}" class="zero" cx="460" cy="${y(value).toFixed(4)}" r="7.5"><title>1/2 + ${value.toFixed(4)}i（数值近似）</title></circle>`).join('');
const versioned = html => html.replace(/((?:src|href)=")(assets\/[^"?]+|(?:composition|player)\.(?:css|js|html)|timing\.js)(")/g, `$1$2?v=${version}$3`);
const composition = read('composition.html.txt').replaceAll('{{DURATION}}', String(timing.duration)).replace('{{GRID}}', grid).replace('{{YTICKS}}', yticks).replace('{{ZEROS}}', points).replace('<script src="composition.js"></script>', () => `<script>\n${read('composition.js')}\n</script>`);
writeFileSync(join(project, 'index.html'), composition);
writeFileSync(join(project, 'timing.js'), `window.RIEMANN_TIMING = ${JSON.stringify(timing)};\n`);
cpSync(assets, join(target, 'assets'), { recursive: true });
for (const file of ['composition.css', 'composition.js', 'player.css', 'player.js', 'timing.js', 'timing.json']) cpSync(join(project, file), join(target, file));
writeFileSync(join(target, 'composition.html'), versioned(composition));
writeFileSync(join(target, 'index.html'), versioned(read('player.html.txt')));
writeFileSync(join(target, 'release.json'), JSON.stringify({ version, duration: timing.duration, paperId: content.paperId, sourceCommit: content.commit }) + '\n');
console.log(`Built explainer: ${timing.duration}s, 6 chapters, version ${version}`);
