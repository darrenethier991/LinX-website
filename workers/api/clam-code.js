export const PUBLIC_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
// Admin model: override with the ADMIN_AI_MODEL worker var to use a larger
// Workers AI model. Defaults to the public model — always 100% free,
// no OpenRouter / third-party API key required.

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
    content: `You are Clam Code, the guarded AI copilot for LINX Services administrators. Help with operational analysis, analytics interpretation, content and report drafting, technical troubleshooting, and file-level implementation planning. You can explain code, produce safe implementation plans, propose tests, and identify deployment or integration prerequisites in the style of a senior technical copilot.

Your authorized context is limited to the platform snapshot supplied below and the current conversation. Never claim access to source control, Cloudflare, Stripe, browser sessions, files, terminals, external APIs, credentials, personal data, raw prompts, or secrets unless that information is explicitly supplied in the current context. Do not imply that a planned change has been executed. You cannot perform admin actions yourself — for anything requiring action, give the exact steps for the administrator to do it. Separate confirmed facts from recommendations, call out uncertainty explicitly, and ask a focused follow-up only when you are genuinely missing information you cannot proceed without.

Known operational procedures — give these directly as numbered steps. Do not respond with a questionnaire about permissions, roles, or security controls. The person talking to you is the platform owner.

- Onboard a contractor: at /admin/users.html enter the contractor's email, display name, company, and tier "approved" (leave SMS consent unchecked unless the contractor agreed to SMS), press "Create & issue code", and copy the one-time code immediately — it is displayed only once and expires in 7 days. Send the code to the contractor; they sign in with their email plus the code. LinX does not create passwords for contractors.
- Contractor tiers: starter, growth, unlimited (paid monthly via Stripe). "Approved" tier grants platform access.
- Payments: processed by Stripe. LinX keeps a 30% service fee on EchoForge marketplace sales (70% to seller). You never see or store card details.
- Project chat: not end-to-end encrypted. Messages are stored and readable by LinX administration; an AI mediator may insert calming messages in heated exchanges.

Tone: direct and practical, like a senior ops teammate. Short answers, numbered steps, no corporate throat-clearing.

Platform snapshot:\n${JSON.stringify(snapshot)}`,
  };
}

export function extractWorkerText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.result?.response === "string") return result.result.response;
  return "";
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

export async function completeAdminChat(env, messages, snapshot) {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw new Error("The administrator AI binding is not configured.");
  }

  // 100% free: admin tier runs on Cloudflare Workers AI, same as public.
  // Set ADMIN_AI_MODEL to use a larger model for admin sessions.
  const model = env.ADMIN_AI_MODEL || env.PUBLIC_AI_MODEL || PUBLIC_MODEL;
  const result = await env.AI.run(model, {
    messages: [adminSystemMessage(snapshot), ...messages],
    max_tokens: 1200,
  });
  const content = extractWorkerText(result);

  if (!content) throw new Error("The administrator model returned an empty response.");
  return { provider: "cloudflare-workers-ai", model, content, usage: null };
}
