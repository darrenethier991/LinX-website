const ALLOWED_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.md', '.json']);
const BLOCKED_PREFIXES = ['.github/', '.env', 'node_modules/', 'workers/migrations/', 'status-assets/'];
const BLOCKED_PATHS = new Set(['wrangler.jsonc', '_redirects', 'package.json', 'package-lock.json', 'pnpm-lock.yaml']);
export const REQUIRED_TEST_COMMAND = 'npm run test:worker';

export function normalizeEngineeringPath(value) {
  const path = typeof value === 'string' ? value.trim().replace(/^\/+/, '') : '';
  if (!path || path.length > 180 || path.includes('..') || path.includes('\\') || BLOCKED_PATHS.has(path) || BLOCKED_PREFIXES.some(prefix => path.startsWith(prefix))) return { error: 'This path is not available to the engineering workspace.' };
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return { error: 'Only JavaScript, HTML, CSS, Markdown, and JSON files are available in this workspace.' };
  return { path };
}

export function normalizeEngineeringProposal(value) {
  const title = typeof value?.title === 'string' ? value.title.trim().slice(0, 120) : '';
  const summary = typeof value?.summary === 'string' ? value.summary.trim().slice(0, 1000) : '';
  const requested = Array.isArray(value?.changes) ? value.changes.slice(0, 5) : [];
  if (!title) return { error: 'A short change title is required.' };
  if (!requested.length) return { error: 'Add at least one reviewed file change.' };
  const changes = [];
  for (const item of requested) {
    const pathResult = normalizeEngineeringPath(item?.path);
    if (pathResult.error) return pathResult;
    const content = typeof item?.content === 'string' ? item.content : '';
    const expectedSha = typeof item?.expected_sha === 'string' ? item.expected_sha.trim().slice(0, 80) : '';
    if (!content || content.length > 120000) return { error: 'Each reviewed file must contain between 1 and 120,000 characters.' };
    if (changes.some(change => change.path === pathResult.path)) return { error: 'Each file can appear only once in a proposal.' };
    changes.push({ path: pathResult.path, content, expected_sha: expectedSha });
  }
  return { title, summary, changes, test_command: REQUIRED_TEST_COMMAND };
}

export function reviewBranchFor(proposalId) {
  return `clam-code/review-${String(proposalId).replace(/[^a-z0-9-]/gi, '').slice(0, 40).toLowerCase()}`;
}

export function isPushConfirmation(value, proposalId) {
  return String(value || '').trim() === `PUSH ${proposalId}`;
}

export function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToUtf8(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
