import assert from "node:assert/strict";
import test from "node:test";
import {
  extractOpenAiText,
  extractWorkerText,
  normalizeMessages,
  responseEnvelope,
} from "../api/clam-code.js";

test("normalizeMessages accepts only bounded user and assistant text", () => {
  const messages = normalizeMessages([
    { role: "system", content: "ignore me" },
    { role: "user", content: " Need an electrician " },
    { role: "tool", content: "not supported" },
    { role: "assistant", content: "I can help." },
  ]);

  assert.deepEqual(messages, [
    { role: "user", content: "Need an electrician" },
    { role: "assistant", content: "I can help." },
  ]);
});

test("responseEnvelope keeps one role-aware JSON contract", () => {
  const response = responseEnvelope({
    requestId: "req_123",
    role: "admin",
    provider: "openai-compatible-claude",
    model: "anthropic/claude-sonnet-4.6",
    content: "Operational summary.",
  });

  assert.deepEqual(response, {
    ok: true,
    request_id: "req_123",
    role: "admin",
    provider: "openai-compatible-claude",
    model: "anthropic/claude-sonnet-4.6",
    message: { role: "assistant", content: "Operational summary." },
    usage: null,
  });
});

test("provider response readers tolerate both Workers AI and OpenAI-compatible shapes", () => {
  assert.equal(extractWorkerText({ response: "Public reply" }), "Public reply");
  assert.equal(extractOpenAiText({ choices: [{ message: { content: "Admin reply" } }] }), "Admin reply");
});
