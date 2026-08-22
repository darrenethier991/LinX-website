import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('administrator Clam Code handoff prefers the explicit admin token and requires authenticated health confirmation', async () => {
  const page = await readFile(new URL('../../clam-code.html', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../../admin/index.html', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../api/index.js', import.meta.url), 'utf8');
  assert.match(page, /sessionStorage\.getItem\("linx_admin_token"\)/);
  assert.match(page, /if \(!response\.ok \|\| !status\.authenticated\) continue/);
  assert.match(admin, /localStorage\.setItem\('linx_admin_token', _token\)/);
  assert.match(worker, /authenticated: Boolean\(identity\)/);
});
