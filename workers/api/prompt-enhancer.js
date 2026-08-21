const PROMPT_TYPES = Object.freeze(['image_generation', 'coding', 'writing', 'chat']);

const TYPE_INSTRUCTIONS = Object.freeze({
  image_generation: 'Optimize for an image-generation model. Specify subject, visual medium, composition, lighting, palette, and mood only when the input provides them. Use bracketed placeholders for missing critical visual details.',
  coding: 'Optimize for a coding model. Specify the requested task, technology choices supplied by the user, requirements, edge cases, and expected output. Never select a language, framework, library, or deployment target that the user did not provide; use bracketed placeholders instead.',
  writing: 'Optimize for a writing model. Specify the requested format, audience, tone, perspective, length, and constraints only when supplied. Use bracketed placeholders for material missing details.',
  chat: 'Optimize for a conversational model. Specify the role, context, desired outcome, tone, constraints, and response format only when supplied. Use bracketed placeholders for material missing details.',
});

export function normalizePromptEnhancementInput(body) {
  const idea = typeof body?.idea === 'string' ? body.idea.trim() : '';
  const promptType = typeof body?.prompt_type === 'string' ? body.prompt_type.trim().toLowerCase() : '';
  if (!idea) return { error: 'Enter an idea or draft prompt before enhancing it.' };
  if (idea.length > 1200) return { error: 'Keep the draft prompt to 1,200 characters or fewer.' };
  if (!PROMPT_TYPES.includes(promptType)) return { error: 'Select a supported prompt type.' };
  return { idea, promptType };
}

export function promptEnhancerSystemMessage(promptType) {
  return `You are LinX Amplify, a precise prompt-enhancement engine. Transform the user’s rough idea into one ready-to-use prompt.

Rules:
- Output only the enhanced prompt. Do not add a preamble, analysis, markdown title, or claims about execution.
- Do not assume, fabricate, or invent facts, capabilities, names, technical requirements, visual details, or data that the user did not provide.
- When a critical detail is missing, retain it as a concise bracketed placeholder such as [target audience] or [programming language] rather than guessing.
- Preserve the user’s intent, safety boundaries, and any explicit constraints.
- Use clear, actionable language and keep the result under 220 words.
- ${TYPE_INSTRUCTIONS[promptType]}`;
}

function extractWorkerText(payload) {
  if (typeof payload === 'string') return payload.trim();
  if (typeof payload?.response === 'string') return payload.response.trim();
  if (typeof payload?.result?.response === 'string') return payload.result.response.trim();
  return '';
}

export async function enhancePrompt(env, { idea, promptType }) {
  if (!env?.AI || typeof env.AI.run !== 'function') throw new Error('The prompt-enhancement model is not configured.');
  const model = env.PUBLIC_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast';
  const result = await env.AI.run(model, {
    messages: [
      { role: 'system', content: promptEnhancerSystemMessage(promptType) },
      { role: 'user', content: idea },
    ],
  });
  const content = extractWorkerText(result);
  if (!content) throw new Error('The prompt-enhancement model returned an empty response.');
  return { provider: 'cloudflare-workers-ai', model, content, estimatedTokens: Math.max(1, Math.ceil(content.length / 4)) };
}
