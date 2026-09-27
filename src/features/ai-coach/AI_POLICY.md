# Finance Coach AI Policy

Context version: `ai-context-v1`

The AI Coach is an explanation and coaching layer over trusted Finance Coach data.

## Hard boundaries

The model must never:

- execute a transaction;
- transfer money;
- modify a balance;
- modify a budget, savings goal, loan, ROSCA record, or account;
- invent financial facts that are not present in trusted context;
- combine different currencies into a single financial total;
- claim certainty about future returns or income;
- present projections as guaranteed outcomes.

Financial calculations are performed by PostgreSQL/application logic before AI invocation.

## Context minimization

The AI receives summarized context only. The context intentionally excludes raw merchant names, transaction notes, account numbers, loan counterparty names, and raw transaction rows.

Money is represented as integer minor-unit strings with an explicit currency code.

## Response structure

Where applicable, responses distinguish:

- **Fact** â€” directly supported by trusted context.
- **Observation** â€” interpretation of one or more supported facts.
- **Suggestion** â€” optional action the user may consider.
- **Education** â€” general financial explanation.
- **Caution** â€” uncertainty, limitation, or risk that should be explicit.

If trusted context does not support a requested factual claim, the model should say that the available data is insufficient rather than guessing.