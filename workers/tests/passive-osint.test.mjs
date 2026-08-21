import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePassiveTarget, runPassiveDomainObservation } from '../api/passive-osint.js';

test('passive OSINT accepts public registered domains and blocks local or IP targets', () => {
  assert.equal(normalizePassiveTarget('example.com').host, 'example.com');
  assert.match(normalizePassiveTarget('http://127.0.0.1').error, /not allowed/i);
  assert.match(normalizePassiveTarget('https://service.internal').error, /not allowed/i);
  assert.match(normalizePassiveTarget('ftp://example.com').error, /Only HTTP/i);
});

test('passive OSINT exposes bounded public observations without recording a scan', async () => {
  const fetchFn = async (url) => {
    if (url.includes('dns-query')) return new Response(JSON.stringify({ Answer: url.includes('type=A') ? [{ type: 1, data: '93.184.216.34' }] : [] }), { headers: { 'Content-Type': 'application/json' } });
    if (url.includes('rdap.org')) return new Response(JSON.stringify({ handle: 'EXAMPLE', events: [{ eventAction: 'registration', eventDate: '1995-08-14T00:00:00Z' }] }), { headers: { 'Content-Type': 'application/json' } });
    return new Response(null, { status: 301, headers: { location: 'https://www.example.com/', server: 'example' } });
  };
  const report = await runPassiveDomainObservation('https://example.com/path?ref=one', fetchFn);
  assert.equal(report.target, 'example.com');
  assert.equal(report.dns.a[0], '93.184.216.34');
  assert.equal(report.http.redirect_to, 'https://www.example.com/');
  assert.match(report.methodology, /No login/i);
});
