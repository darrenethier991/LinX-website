import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePromptEnhancementInput, promptEnhancerSystemMessage } from '../api/prompt-enhancer.js';

test('Prompt Enhancer accepts only bounded supported enhancement requests', () => {
  assert.deepEqual(normalizePromptEnhancementInput({ idea: 'Draft an onboarding email', prompt_type: 'writing' }), { idea: 'Draft an onboarding email', promptType: 'writing' });
  assert.match(normalizePromptEnhancementInput({ idea: '', prompt_type: 'writing' }).error, /Enter an idea/);
  assert.match(normalizePromptEnhancementInput({ idea: 'Draft', prompt_type: 'unknown' }).error, /supported prompt type/);
  assert.match(normalizePromptEnhancementInput({ idea: 'x'.repeat(1201), prompt_type: 'chat' }).error, /1,200/);
});

test('Prompt Enhancer system instruction requires placeholders instead of unsupported assumptions', () => {
  const codingInstruction = promptEnhancerSystemMessage('coding');
  assert.match(codingInstruction, /Do not assume, fabricate, or invent/i);
  assert.match(codingInstruction, /bracketed placeholder/i);
  assert.match(codingInstruction, /Never select a language, framework, library, or deployment target/i);
});
