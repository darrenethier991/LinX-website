import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import worker from "../api/index.js";

const publicEnv = {
  AI: {
    async run(model, body) {
      assert.equal(model, "@cf/meta/llama-3.1-8b-instruct-fast");
      assert.equal(body.messages.at(-1).content, "How can LINX help?");
      return { response: "LINX can help organize your project request." };
    },
  },
};

test("public Clam Code chat uses the Worker model and returns the unified envelope", async () => {
  const response = await worker.fetch(new Request("https://api.linxservices.ca/api/clam-code/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://linxservices.ca" },
    body: JSON.stringify({ messages: [{ role: "user", content: "How can LINX help?" }] }),
  }), publicEnv);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.role, "public");
  assert.equal(body.provider, "cloudflare-workers-ai");
  assert.equal(body.model, "@cf/meta/llama-3.1-8b-instruct-fast");
  assert.equal(body.message.content, "LINX can help organize your project request.");
});

test("public Clam Code rejects empty conversations before model invocation", async () => {
  const response = await worker.fetch(new Request("https://api.linxservices.ca/api/clam-code/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [] }),
  }), publicEnv);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { ok: false, error: "At least one user message is required." });
});

test("administrator login token selects the administrator Clam Code mode", async () => {
  const env = {
    ...publicEnv,
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD_HASH: createHash("sha256").update("safe-password").digest("hex"),
    JWT_SECRET: "a-long-enough-test-secret-for-signing-tokens",
    OPENROUTER_API_KEY: "test-key",
  };
  const loginResponse = await worker.fetch(new Request("https://api.linxservices.ca/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "safe-password" }),
  }), env);
  const login = await loginResponse.json();

  assert.equal(loginResponse.status, 200);
  const healthResponse = await worker.fetch(new Request("https://api.linxservices.ca/api/clam-code/health", {
    headers: { Authorization: `Bearer ${login.token}` },
  }), env);
  assert.deepEqual(await healthResponse.json(), {
    ok: true,
    interface: "clam-code",
    role: "admin",
    public_model_available: true,
    admin_model_available: true,
  });
});
