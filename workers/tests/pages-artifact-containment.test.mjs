import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Pages deployment builds a static artifact that excludes sensitive and server-only files', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');

  assert.match(workflow, /Build safe static Pages artifact/);
  assert.match(workflow, /--exclude='\*\/\.env\*'/);
  assert.match(workflow, /--exclude='\.\/wrangler\.jsonc'/);
  assert.match(workflow, /--exclude='\.\/workers'/);
  assert.match(workflow, /test ! -e \.pages-artifact\/admin\/\.env/);
  assert.match(workflow, /pages deploy \.pages-artifact/);
});
