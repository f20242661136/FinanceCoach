# Finance Coach — Phase 13: AI Coach Polish

## Install

This update builds on your installed redesign, Phase 11 and Phase 12.

1. Back up or commit your working project.
2. Extract `finance-coach-phase13.zip`.
3. Merge the contents of `finance-coach-phase13/src` into your project's `src`, using the same paths. Replace matching files and add the new files.
4. Run from your project folder:

```bash
npx expo start -c
```

No package installation, migration or AI backend deployment is required. The app continues using your existing AI RPCs and Edge Function.

| File | Action |
| --- | --- |
| `src/app/(app)/(finance)/(tabs)/coach.tsx` | Replace |
| `src/features/ai-coach/ai-coach-screen.tsx` | Replace |
| `src/features/ai-coach/ai-chat-screen.tsx` | Replace |
| `src/features/ai-coach/coach-context-screen.tsx` | Replace |
| `src/features/ai-coach/coach-intelligence.ts` | Add |
| `src/features/ai-coach/coach-sender.ts` | Add |
| `src/features/ai-coach/use-coach-conversation.ts` | Add |
| `src/features/ai-coach/coach-ui.tsx` | Add |

## What changed

Coach is ready for a question immediately. A persistent composer sits below a context preview and three suggested questions. Suggestions fill a draft for review; they do not send automatically. A conversation is created when you press Send, and is titled from the question.

The context preview uses the existing `get_ai_financial_context` endpoint. Currency views stay separate. Income, spending and net values use existing currency precision data. When precision is unavailable, amounts display a dash until it loads. Missing context produces generic editable questions rather than invented insights.

Suggestions prioritize actual current-period budget warnings, negative recorded cash flow, active unfinished goals, and borrowed loans within the selected currency. Generic spending comparisons explicitly acknowledge that this month and last month cover different period lengths.

Home's Ask Coach actions still open the existing contextual entry route, with a prefilled question. That route now shares the same composer and context preview as Coach. Questions remain editable and require a Send press.

Chat presents the response summary once. Suggestions and cautions are visible, supporting facts/explanations can expand, and data limitations stay visible. Response text is selectable. Follow-up questions fill the composer so you can edit them before sending. A New chat action starts another question from Coach.

Scrolling follows new content while you are near the bottom, and preserves your position while you read earlier messages. Jump to latest returns to the bottom. Programmatic scrolling uses no animation. Loading, refresh failure and thinking states are explicit.

History contains recent conversations and saved insights. Existing insight generation remains available there. Ask about this turns a saved insight into an editable question for your latest data.

## Sending and retry behavior

- Repeated taps during one request are blocked by a synchronous guard.
- A failed conversation-create retry reuses its reserved conversation ID.
- A failed message retry reuses its user/assistant message IDs when the question is unchanged. This works with the backend's existing idempotency handling.
- Editing a failed question creates a different message request in the same conversation.
- Intentionally sending the same text again after success gets new message IDs.
- Drafts stay onscreen when a send fails.
- A screen that was left while awaiting a response does not navigate back into chat when the response arrives.

Retry identifiers and drafts are held in the mounted screen's memory. They are not a durable outbox across app restarts or navigation away. Coach requires a server connection. Chat/context caches are in memory; this update does not create a persistent offline chat store or promise that a failed request was never accepted by the server.

Financial records are unchanged by the Coach screens. The backend still supplies trusted financial context and controls AI responses. No money actions were added.

## Validation completed

- Full `npx tsc --noEmit` against the extracted app plus Phases 11–13: passed.
- Full `npx expo lint`: zero errors; three pre-existing warnings in unrelated local-first/gamification files.
- All eight delivered source files lint with zero warnings allowed: passed.
- Sixteen executable regression tests: passed. They cover lazy conversation creation, validation before writes, concurrent taps, create/send timeout retries, successful repeated sends, edited failed questions, existing conversation follow-ups, response ID verification, precise budget thresholds, currency separation, missing context, goal/debt filtering and follow-up prompts.
- TypeScript/TSX syntax scan: passed.

AI request tests use mocked services. No live AI calls, device builds or Android/iOS visual tests were performed here. The original redesign overlay is not present in the attachment, so its current navigation/theme runtime still needs the phone walkthrough below.

## Check on your phone

1. Open Coach. Verify the context matches your synced data; switch currency if available.
2. Tap a suggestion. It should fill the composer without sending. Edit it and send.
3. Confirm the conversation opens, your question appears once, and the response displays clearly.
4. Expand facts/explanation. Check any data limitations remain visible.
5. Tap a follow-up, edit it and send. It should stay in the same conversation.
6. Open New chat, send another question, then check that History lists distinct conversations.
7. Open Home's Ask Coach action. Verify its question is prefilled and editable.
8. In History, check saved insights and the Generate an insight action if you use it.
9. Test a failed send if practical: your draft should remain. Retry the unchanged question while staying on that screen.
10. Check the keyboard, a small phone, increased system text size, and scrolling through an older conversation.

Optional regression command, with Node 24 from the extracted folder:

```bash
node tests/coach.test.mjs
```

To roll back, restore the four replaced files from your backup and remove the four new helper files.
