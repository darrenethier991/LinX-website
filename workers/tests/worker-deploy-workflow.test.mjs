import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Worker deployment remains manual-only until its dedicated credential is configured", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/deploy-worker.yml", import.meta.url), "utf8");

  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  (push|pull_request):/m);
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /wrangler@4\.124\.0 deploy --config wrangler\.jsonc/);
  assert.doesNotMatch(workflow, /pages deploy/);
  assert.match(workflow, /secrets\.CLOUDFLARE_WORKER_API_TOKEN/);
  assert.doesNotMatch(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
});
