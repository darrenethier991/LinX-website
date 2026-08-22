import assert from 'node:assert/strict';
import test from 'node:test';
import { base64ToUtf8, isPushConfirmation, normalizeEngineeringPath, normalizeEngineeringProposal, reviewBranchFor, utf8ToBase64 } from '../api/engineering-workspace.js';

test('engineering workspace permits bounded code paths and blocks deployment-sensitive files', () => {
  assert.equal(normalizeEngineeringPath('workers/api/example.js').path, 'workers/api/example.js');
  assert.match(normalizeEngineeringPath('workers/migrations/0008.sql').error, /not available/i);
  assert.match(normalizeEngineeringPath('wrangler.jsonc').error, /not available/i);
  assert.match(normalizeEngineeringPath('../secret.js').error, /not available/i);
});

test('engineering proposal requires reviewed bounded files and explicit push confirmation', () => {
  const proposal = normalizeEngineeringProposal({ title: 'Improve endpoint', summary: 'Reviewed change', changes: [{ path: 'workers/api/example.js', content: 'export default 1;', expected_sha: 'abc' }] });
  assert.equal(proposal.changes.length, 1);
  assert.match(normalizeEngineeringProposal({ title: 'Bad', changes: [{ path: '.github/workflows/a.yml', content: 'x' }] }).error, /not available/i);
  assert.equal(isPushConfirmation('PUSH abc-123', 'abc-123'), true);
  assert.equal(isPushConfirmation('push abc-123', 'abc-123'), false);
  assert.equal(reviewBranchFor('ABC-123'), 'clam-code/review-abc-123');
  assert.equal(base64ToUtf8(utf8ToBase64('LINX ✓')), 'LINX ✓');
});
