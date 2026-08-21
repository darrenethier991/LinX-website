import assert from 'node:assert/strict';
import test from 'node:test';
import { deviceCategory, normalizeShortLinkInput, refererHost } from '../api/short-links.js';

test('short links require valid HTTP destinations and safe custom slugs', () => {
  assert.equal(normalizeShortLinkInput({ destination_url: 'https://example.com/a?b=1', slug: 'hello-2026' }).slug, 'hello-2026');
  assert.match(normalizeShortLinkInput({ destination_url: 'javascript:alert(1)' }).error, /Only HTTP/i);
  assert.match(normalizeShortLinkInput({ destination_url: 'https://example.com', slug: 'api' }).error, /reserved/i);
  assert.match(normalizeShortLinkInput({ destination_url: 'https://example.com', slug: 'x!' }).error, /Custom slugs/i);
});

test('short link analytics minimize client metadata into categories', () => {
  assert.equal(deviceCategory('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), 'mobile');
  assert.equal(deviceCategory('Mozilla/5.0 (X11; Linux x86_64)'), 'desktop');
  assert.equal(refererHost('https://sub.example.com/a?x=1'), 'sub.example.com');
  assert.equal(refererHost('not a url'), '');
});
