import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

for (const file of ['index.html', 'data/catalog.json', '.nojekyll']) {
  if (!existsSync(join(output, file))) throw new Error(`Missing dist/${file}; run npm run build first.`);
}
const remote = git(['remote', 'get-url', '--push', 'origin']);
const authorName = git(['config', 'user.name']);
const authorEmail = git(['config', 'user.email']);
if (!authorName || !authorEmail) throw new Error('Configure git user.name and user.email before deploying.');
const remoteRef = git(['ls-remote', '--heads', remote, 'refs/heads/gh-pages']);
const tempRoot = resolve(tmpdir());
const deployment = mkdtempSync(join(tempRoot, 'openaimath-pages-'));

try {
  git(['init', '--initial-branch=gh-pages'], deployment);
  git(['config', 'user.name', authorName], deployment);
  git(['config', 'user.email', authorEmail], deployment);
  git(['config', 'core.autocrlf', 'false'], deployment);
  if (remoteRef) {
    git(['fetch', '--depth=1', remote, 'refs/heads/gh-pages'], deployment);
    git(['update-ref', 'refs/heads/gh-pages', 'FETCH_HEAD'], deployment);
    git(['read-tree', 'FETCH_HEAD'], deployment);
    // Pages caches HTML for ten minutes. Keep immutable hashed assets so an
    // already cached document remains usable during and after a release.
    if (git(['ls-tree', '--name-only', 'FETCH_HEAD', 'assets'], deployment) === 'assets') {
      git(['restore', '--source=FETCH_HEAD', '--worktree', '--', 'assets'], deployment);
    }
  }
  cpSync(output, deployment, { recursive: true, filter: path => basename(path) !== '.git' });
  git(['add', '--all'], deployment);
  const tree = git(['write-tree'], deployment);
  if (remoteRef && tree === git(['rev-parse', 'HEAD^{tree}'], deployment)) {
    console.log('The published files are already up to date.');
  } else {
    git(['commit', '-m', 'Publish OpenAI Math website'], deployment);
    git(['push', remote, 'HEAD:refs/heads/gh-pages'], deployment);
    console.log('Published build:', git(['rev-parse', '--short', 'HEAD'], deployment));
  }
  console.log('Website: https://foocker.github.io/openaimath/');
  console.log('GitHub Pages source: gh-pages / (root).');
} finally {
  const checked = resolve(deployment);
  if (dirname(checked) !== tempRoot || !basename(checked).startsWith('openaimath-pages-')) {
    throw new Error('Unexpected temporary deployment directory; cleanup refused.');
  }
  rmSync(checked, { recursive: true, force: true });
}
