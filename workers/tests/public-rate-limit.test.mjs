import assert from "node:assert/strict";
import test from "node:test";
import worker from "../api/index.js";

class MemoryKV {
  values = new Map();

  async get(key) {
    return this.values.get(key) || null;
  }

  async put(key, value) {
    this.values.set(key, value);
  }
}

test("administrator login attempts are rate-limited per hashed client address", async () => {
  const env = {
    JWT_SECRET: "rate-limit-test-secret",
    LINX_KV: new MemoryKV(),
    ADMIN_USERNAME: "administrator",
    ADMIN_PASSWORD_HASH: "not-the-submitted-password",
  };
  const makeRequest = (ip) => new Request("https://api.linxservices.ca/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ username: "administrator", password: "wrong-password" }),
  });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await worker.fetch(makeRequest("198.51.100.24"), env);
    assert.equal(response.status, 401);
  }
  const limited = await worker.fetch(makeRequest("198.51.100.24"), env);
  assert.equal(limited.status, 429);
  assert.match(limited.headers.get("Retry-After") || "", /^\d+$/);
  assert.deepEqual(await limited.json(), { error: "Too many requests. Please try again later." });

  const separateClient = await worker.fetch(makeRequest("198.51.100.25"), env);
  assert.equal(separateClient.status, 401);
});
