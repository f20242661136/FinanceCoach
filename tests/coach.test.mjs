import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCoachSender } from '../src/features/ai-coach/coach-sender.ts';
import { coachPrompts, contextCurrencies, followUpPrompts, validConversationId } from '../src/features/ai-coach/coach-intelligence.ts';

const response = { summary: 'A useful answer', sections: [], data_limitations: [] };
function harness({ create, send, initial = '' } = {}) {
  let counter = 0;
  const creates = [], sends = [];
  const sender = createCoachSender({
    randomId: () => `id-${++counter}`,
    createConversation: async (id, title) => { creates.push({ id, title }); return create ? create(id, title, creates.length) : id; },
    sendMessage: async input => { sends.push(input); return send ? send(input, sends.length) : { conversation_id: input.conversationId, user_message_id: input.userMessageId, assistant_message_id: input.assistantMessageId, response }; },
  }, initial);
  return { sender, creates, sends, generatedIds: () => counter };
}
const context = (changes = {}) => ({ as_of_date: '2026-09-30', currency_summaries: [], budget_status: [], goal_progress: [], loan_summary: [], ...changes });
const budget = (changes = {}) => ({ budget_id: 'b', currency_code: 'PKR', category_name: 'Food', period_start: '2026-09-01', period_end: '2026-09-30', limit_minor: '10000', spent_minor: '8000', over_budget: false, ...changes });

test('opening Coach does not reserve IDs or create a conversation; empty/oversized questions do not write', async () => {
  const h = harness();
  assert.equal(h.generatedIds(), 0);
  await assert.rejects(h.sender.send('  ', 'UTC'));
  await assert.rejects(h.sender.send('a'.repeat(4001), 'UTC'));
  assert.equal(h.generatedIds(), 0);
  assert.equal(h.creates.length, 0);
  assert.equal(h.sends.length, 0);
});

test('first send creates once and titles a conversation from the question', async () => {
  const h = harness();
  await h.sender.send('  Explain\nmy spending  ', 'Asia/Karachi');
  assert.equal(h.creates[0].title, 'Explain my spending');
  assert.equal(h.sends[0].message, 'Explain\nmy spending');
  assert.equal(h.sends[0].timezone, 'Asia/Karachi');
});

test('retry after a creation timeout reuses the reserved conversation and message IDs', async () => {
  const h = harness({ create: async (id, title, count) => { if (count === 1) throw new Error('timeout'); return id; } });
  await assert.rejects(h.sender.send('Help me plan', 'UTC'));
  assert.equal(h.generatedIds(), 3);
  await h.sender.send('Help me plan', 'UTC');
  assert.equal(h.creates.length, 2);
  assert.equal(h.creates[0].id, h.creates[1].id);
  assert.equal(h.generatedIds(), 3);
});

test('retry after a message timeout reuses all request IDs without creating another conversation', async () => {
  const h = harness({ send: async (input, count) => {
    if (count === 1) throw new Error('timeout after server accepted the question');
    return { conversation_id: input.conversationId, user_message_id: input.userMessageId, assistant_message_id: input.assistantMessageId, response };
  } });
  await assert.rejects(h.sender.send('How can I save?', 'UTC'));
  await h.sender.send('How can I save?', 'UTC');
  assert.equal(h.creates.length, 1);
  assert.deepEqual(h.sends[0], h.sends[1]);
});

test('concurrent taps do not issue a second request', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = harness({ create: async id => { await gate; return id; } });
  const first = h.sender.send('Help', 'UTC');
  const second = await h.sender.send('Help', 'UTC');
  assert.equal(second, null);
  release();
  await first;
  assert.equal(h.creates.length, 1);
  assert.equal(h.sends.length, 1);
});

test('a deliberate repeated question after success gets new message IDs in the same conversation', async () => {
  const h = harness();
  await h.sender.send('Explain this', 'UTC');
  await h.sender.send('Explain this', 'UTC');
  assert.equal(h.creates.length, 1);
  assert.equal(h.sends[0].conversationId, h.sends[1].conversationId);
  assert.notEqual(h.sends[0].userMessageId, h.sends[1].userMessageId);
  assert.notEqual(h.sends[0].assistantMessageId, h.sends[1].assistantMessageId);
});

test('editing a failed draft is a different request while retaining the conversation', async () => {
  const h = harness({ send: async (input, count) => {
    if (count === 1) throw new Error('offline');
    return { conversation_id: input.conversationId, user_message_id: input.userMessageId, assistant_message_id: input.assistantMessageId, response };
  } });
  await assert.rejects(h.sender.send('Old question', 'UTC'));
  await h.sender.send('New question', 'UTC');
  assert.equal(h.creates.length, 1);
  assert.notEqual(h.sends[0].userMessageId, h.sends[1].userMessageId);
});

test('existing conversations support follow-ups without another create call', async () => {
  const h = harness({ initial: 'existing-conversation' });
  await h.sender.send('What is the next step?', 'UTC');
  assert.equal(h.creates.length, 0);
  assert.equal(h.sends[0].conversationId, 'existing-conversation');
});

test('mismatched response identifiers are rejected and remain retryable', async () => {
  const h = harness({ send: async input => ({ conversation_id: 'wrong', user_message_id: input.userMessageId, assistant_message_id: input.assistantMessageId, response }) });
  await assert.rejects(h.sender.send('Help', 'UTC'), /verified/);
  await assert.rejects(h.sender.send('Help', 'UTC'), /verified/);
  assert.deepEqual(h.sends[0], h.sends[1]);
});

test('suggestions prioritize actual budget warnings within the chosen currency and current period', () => {
  const c = context({ budget_status: [budget(), budget({ category_name: 'Travel', over_budget: true }), budget({ currency_code: 'USD', category_name: 'Other', over_budget: true }), budget({ category_name: 'Expired', period_end: '2026-08-31', over_budget: true })] });
  const prompts = coachPrompts(c, 'PKR');
  assert.equal(prompts.length, 3);
  assert.equal(prompts[0].id, 'budget');
  assert.match(prompts[0].detail, /Travel · PKR/);
  assert.doesNotMatch(prompts[0].question, /USD|Expired/);
});

test('80% detection uses exact integer arithmetic for large currency amounts', () => {
  const c = context({ budget_status: [budget({ limit_minor: '100000000000000000000', spent_minor: '80000000000000000000' })] });
  assert.equal(coachPrompts(c, 'PKR')[0].id, 'budget');
  const low = context({ budget_status: [budget({ limit_minor: '100000000000000000000', spent_minor: '79999999999999999999' })] });
  assert.equal(coachPrompts(low, 'PKR')[0].id, 'spending');
});

test('cash-flow wording never leaks another currency into the selected snapshot', () => {
  const c = context({ currency_summaries: [{ currency_code: 'PKR', monthly_net_minor: '100' }, { currency_code: 'USD', monthly_net_minor: '-100' }] });
  assert.equal(coachPrompts(c, 'PKR')[0].id, 'spending');
  assert.equal(coachPrompts(c, 'USD')[0].id, 'cash-flow');
});

test('paused or reached goals are excluded; borrowed debt is kept distinct from lent money', () => {
  const c = context({ goal_progress: [{ name: 'Paused', currency_code: 'PKR', status: 'paused', remaining_minor: '100', target_date: null }, { name: 'Reached', currency_code: 'PKR', status: 'active', remaining_minor: '0', target_date: null }], loan_summary: [{ currency_code: 'PKR', direction: 'given', remaining_minor: '100' }] });
  assert.equal(coachPrompts(c, 'PKR')[0].id, 'spending');
});

test('missing context yields editable generic questions rather than invented insights', () => {
  const prompts = coachPrompts();
  assert.deepEqual(prompts.map(item => item.id), ['spending', 'saving', 'planning']);
  assert.doesNotMatch(prompts.map(item => item.detail).join(' '), /exceed|over the limit|80%/);
});

test('follow-up prompts prioritize suggestions, factual explanation and missing information', () => {
  const prompts = followUpPrompts({ summary: 'Summary', sections: [{ kind: 'suggestion', text: 'Try a plan' }, { kind: 'fact', text: 'A recorded fact' }], data_limitations: ['Missing income'] });
  assert.equal(prompts.length, 3);
  assert.equal(prompts[2].title, 'What information is missing?');
  assert.match(prompts[1].question, /Keep currencies separate/);
});

test('context currencies remain unique labels and malformed conversation routes are rejected', () => {
  assert.deepEqual(contextCurrencies(context({ currency_summaries: [{ currency_code: 'PKR' }], budget_status: [budget(), budget({ currency_code: 'USD' })] })), ['PKR', 'USD']);
  assert.equal(validConversationId('not-a-conversation'), false);
  assert.equal(validConversationId('12345678-1234-1234-1234-123456789012'), true);
});
