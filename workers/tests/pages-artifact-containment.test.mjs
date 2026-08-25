import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Pages deployment builds an allowlisted static artifact that excludes sensitive and server-only files', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  const ignore = await readFile(new URL('../../.gitignore', import.meta.url), 'utf8');

  assert.match(workflow, /Build allowlisted static Pages artifact/);
  assert.match(workflow, /find \. -maxdepth 1 -type f/);
  assert.match(workflow, /for directory in assets css js status status-assets white-label linxservices\.ca/);
  assert.match(workflow, /find admin -maxdepth 1 -type f/);
  assert.match(workflow, /test ! -e \.pages-artifact\/admin\/\.env/);
  assert.match(workflow, /test ! -e \.pages-artifact\/workers/);
  assert.match(workflow, /test ! -e \.pages-artifact\/package\.json/);
  assert.match(workflow, /test ! -e \.pages-artifact\/admin\/server\.js/);
  assert.doesNotMatch(workflow, /tar \\\n+            --exclude-vcs/);
  assert.match(workflow, /pages deploy \.pages-artifact/);
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\*\*\/\.env\.\*$/m);
  assert.match(ignore, /^\.pages-artifact\/$/m);
  assert.match(ignore, /^node_modules\/$/m);
  assert.match(ignore, /^\*\*\/node_modules\/$/m);
});
