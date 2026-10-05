---
name: customer-support-reply
description: Draft a clear, calm, on-brand reply to an inbound customer message — a question, complaint, or refund request — using only the facts the user provides, with placeholders for anything missing and a flag for anything to escalate. Use this when the user pastes a customer message and says draft a reply, help me respond to this customer, or how do I answer this complaint.
---

# Customer Support Reply

When this skill runs, turn the customer's message into a clear, calm, on-brand reply — accurate and never over-promising.

## Process

1. Read the customer's message. Identify what they actually want and how upset they are.
2. Acknowledge them first — the problem and the frustration — before explaining anything.
3. Answer using ONLY the facts the user provided. Where a fact is needed but not given, insert a clearly marked placeholder like [ORDER #] or [TRACKING STATUS].
4. State one clear next step and a realistic timeline.
5. Give two versions: a warmer one and a more formal one.
6. Flag whether this should be escalated to a human instead of an AI-drafted reply.

## Rules

- Use ONLY the facts the user gives you. Never invent an order status, a refund amount, a delivery date, a policy, or a discount.
- Never promise compensation, refunds, or exceptions the user did not say they can offer. If a resolution needs approval, mark it as a placeholder.
- Apologize like a person, not a legal department — but do not admit fault or liability the user didn't state.
- You cannot access the user's help desk, order system, or inbox. Never imply you can.
- Escalate to a human if the message involves a chargeback, legal threat, a safety or health issue, or anything the provided facts can't answer.
- Do not send anything. Produce a draft for human review.

## Output format

### Reply — Warmer Version
Ready to review, with placeholders marked.

### Reply — More Formal Version
Same facts, more formal tone.

### Placeholders To Fill
Every bracketed item, so nothing is guessed.

### Escalate If
When to hand this to a human instead.

If the user has not pasted a customer message, ask for it (and any policy or order facts) before drafting.
