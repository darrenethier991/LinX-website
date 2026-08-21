export const PUBLIC_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
export const ADMIN_MODEL = "anthropic/claude-sonnet-4.6";
export const OPENROUTER_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

const VALID_ROLES = new Set(["system", "user", "assistant"]);

export function normalizeMessages(value) {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .filter(message => message && VALID_ROLES.has(message.role) && typeof message.content === "string")
    .map(message => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
    .filter(message => message.content.length > 0)
    .slice(-8);

  return normalized.filter(message => message.role !== "system");
}

export function responseEnvelope({ requestId, role, provider, model, content, usage = null }) {
  return {
    ok: true,
    request_id: requestId,
    role,
    provider,
    model,
    message: { role: "assistant", content },
    usage,
  };
}

export function publicSystemMessage() {
  return {
    role: "system",
    content: "You are Clam Code, LINX Services' practical text assistant. Give clear, concise help about LINX Services, contractor workflows, and service requests. Do not invent pricing, availability, policies, account data, or legal, medical, or safety-critical advice. Ask a short follow-up question when the available information is insufficient.",
  };
}

export function adminSystemMessage(snapshot) {
  return {
    role: "system",
    content: `You are Clam Code, the guarded Claude-capable copilot for LINX Services administrators. Help with operational analysis, analytics interpretation, content and report drafting, technical troubleshooting, and file-level implementation planning. You can explain code, produce safe implementation plans, propose tests, and identify deployment or integration prerequisites in the style of a senior technical copilot.

Your authorized context is limited to the platform snapshot supplied below and the current conversation. Never claim access to source control, Cloudflare, Stripe, browser sessions, files, terminals, external APIs, credentials, personal data, raw prompts, or secrets unless that information is explicitly supplied in the current context. Do not imply that a planned change has been executed. For any request requiring an external action, identify the exact approval, credential, or integration needed. Separate confirmed facts from recommendations, call out uncertainty explicitly, and ask a focused follow-up when necessary.

Platform snapshot:\n${JSON.stringify(snapshot)}`,
  };
}

export function extractWorkerText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.result?.response === "string") return result.result.response;
  return "";
}

export function extractOpenAiText(result) {
  return result?.choices?.[0]?.message?.content?.trim() || "";
}

export function usageFromOpenAi(result) {
  const usage = result?.usage;
  if (!usage) return null;
  return {
    input_tokens: usage.prompt_tokens ?? null,
    output_tokens: usage.completion_tokens ?? null,
    total_tokens: usage.total_tokens ?? null,
    cost: usage.cost ?? null,
  };
}

export async function completePublicChat(env, messages) {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw new Error("The public AI binding is not configured.");
  }

  const model = env.PUBLIC_AI_MODEL || PUBLIC_MODEL;
  const result = await env.AI.run(model, {
    messages: [publicSystemMessage(), ...messages],
  });
  const content = extractWorkerText(result);

  if (!content) throw new Error("The public model returned an empty response.");
  return { provider: "cloudflare-workers-ai", model, content, usage: null };
}

export async function completeAdminChat(env, messages, snapshot, requester) {
  const key = env.CLAUDE_API_KEY || env.OPENROUTER_API_KEY;
  if (!key) throw new Error("The administrator AI provider is not configured.");

  const endpoint = env.CLAUDE_API_BASE || OPENROUTER_COMPLETIONS_URL;
  const model = env.CLAUDE_MODEL || ADMIN_MODEL;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://linxservices.ca",
      "X-OpenRouter-Title": "LINX Services Clam Code",
    },
    body: JSON.stringify({
      model,
      messages: [adminSystemMessage(snapshot), ...messages],
      temperature: 0.3,
      max_tokens: 1200,
      user: requester || "linx-admin",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "The administrator AI provider rejected the request.");
  }

  const content = extractOpenAiText(payload);
  if (!content) throw new Error("The administrator model returned an empty response.");
  return { provider: "openai-compatible-claude", model, content, usage: usageFromOpenAi(payload) };
}
