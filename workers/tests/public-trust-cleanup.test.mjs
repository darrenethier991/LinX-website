import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public pages contain no legacy demo contractor identities or fabricated marketplace sales counts', async () => {
  const [home, contractorData, directory, profile] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../js/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../find-contractors.html', import.meta.url), 'utf8'),
    readFile(new URL('../../contractor-profile.html', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(home, /847 sold|512 sold|391 sold|628 sold/);
  assert.doesNotMatch(contractorData, /Mike T\.|Carlos R\.|Tom B\.|reviews:\s*87/);
  assert.match(contractorData, /const CONTRACTORS = \[\];/);
  assert.match(directory, /does not display demo contractors, ratings, or reviews/i);
  assert.match(profile, /does not use demo contractor identities, ratings, or review counts/i);
});
