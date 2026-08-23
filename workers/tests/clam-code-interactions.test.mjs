import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Clam Code exposes local interactive controls without changing its guarded API model', async () => {
  const page = await readFile(new URL('../../clam-code.html', import.meta.url), 'utf8');
  assert.match(page, /id="new-chat"/);
  assert.match(page, /id="copy-latest"/);
  assert.match(page, /Ctrl\/⌘ \+ Enter to send/);
  assert.match(page, /navigator\.clipboard\.writeText/);
  assert.match(page, /form\.requestSubmit\(\)/);
  assert.match(page, /api\/clam-code\/chat/);
});
