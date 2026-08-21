import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeImportedLead, normalizeLeadSourceInput, parseApprovedFeed, sourceReadiness } from '../api/lead-pipeline.js';

test('lead source readiness uses manual intake until explicit approved-source conditions are met', () => {
  assert.equal(sourceReadiness({ mode: 'manual' }).pipeline, 'manual_csv');
  assert.equal(sourceReadiness({ mode: 'rss', approval_status: 'draft', feed_url: 'https://example.com/feed.xml' }).ready, false);
  assert.equal(sourceReadiness({ mode: 'rss', approval_status: 'approved', feed_url: 'https://example.com/feed.xml' }).ready, true);
  assert.equal(sourceReadiness({ mode: 'html_crawl', approval_status: 'approved', has_owner_permission: true, robots_allows_crawl: true }).pipeline, 'dedicated_crawler');
});

test('manual import validation requires lead identity and address or contact details', () => {
  assert.match(normalizeImportedLead({ title: 'Roof repair' }).error, /address or contact/i);
  const lead = normalizeImportedLead({ name: 'Alex', address: '10 Main St', job_type: 'Roof repair', notes: 'Leak after storm' });
  assert.equal(lead.title, 'Roof repair');
  assert.equal(lead.address, '10 Main St');
  assert.match(lead.description, /Leak/);
});

test('approved feeds accept bounded JSON and RSS item shapes without executing feed content', () => {
  assert.equal(parseApprovedFeed('{"leads":[{"title":"Deck repair"}]}', 'application/json')[0].title, 'Deck repair');
  assert.equal(parseApprovedFeed('<rss><channel><item><title>Fence repair</title><link>https://example.com/a</link></item></channel></rss>', 'application/rss+xml')[0].title, 'Fence repair');
  assert.match(normalizeLeadSourceInput({ name: 'Local feed', source_type: 'rss', mode: 'rss', approval_status: 'approved', feed_url: 'http://localhost/x' }).error, /public HTTPS/i);
});
