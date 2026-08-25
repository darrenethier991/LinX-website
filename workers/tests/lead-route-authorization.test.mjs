import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import worker from "../api/index.js";

const jwtSecret = "lead-route-authorization-test-secret";

function subscriberToken() {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "subscriber-1", role: "subscriber", exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
  const signature = createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

test("subscriber tokens cannot access or mutate operational lead routes", async () => {
  const env = {
    JWT_SECRET: jwtSecret,
    DB: {
      prepare() {
        throw new Error("The subscriber request must be rejected before database access.");
      },
    },
  };
  const token = subscriberToken();
  const cases = [
    { path: "/api/leads/lead-1", method: "GET" },
    { path: "/api/leads/lead-1", method: "PATCH", body: { status: "archived" } },
    { path: "/api/leads/lead-1", method: "DELETE" },
    { path: "/api/leads/ingest", method: "POST", body: { leads: [] } },
    { path: "/api/leads/crawler-run", method: "POST", body: {} },
  ];

  for (const requestCase of cases) {
    const response = await worker.fetch(new Request(`https://api.linxservices.ca${requestCase.path}`, {
      method: requestCase.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(requestCase.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(requestCase.body ? { body: JSON.stringify(requestCase.body) } : {}),
    }), env);

    assert.equal(response.status, 403, `${requestCase.method} ${requestCase.path} must reject subscriber access`);
    assert.deepEqual(await response.json(), { error: "Administrator access is required." });
  }
});
