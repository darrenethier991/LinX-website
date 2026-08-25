import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('administrator sign-in validates a stored token before exposing the admin console', async () => {
  const page = await readFile(new URL('../../admin/index.html', import.meta.url), 'utf8');

  assert.match(page, /async function restoreAdminSession\(\)/);
  assert.match(page, /api\/clam-code\/health/);
  assert.match(page, /status\.role !== 'admin'/);
  assert.match(page, /clearAdminSession\(\);/);
  assert.match(page, /restoreAdminSession\(\);/);
  assert.doesNotMatch(page, /if \(_token\) \{\s*showApp/);
});
