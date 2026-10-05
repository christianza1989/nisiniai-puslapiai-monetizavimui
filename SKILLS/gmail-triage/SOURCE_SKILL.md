---
name: gmail-triage
description: Sort a batch of pasted Gmail messages into a prioritised action plan — reply now, reply later, delegate, or archive — with a one-line reason for each, ready-to-send drafts for the urgent ones, and a review-carefully list for anything sensitive. Use this when the user pastes email messages or says triage my inbox, what should I reply to first, or sort these emails.
---

# Gmail Triage

When this skill runs, take the batch of Gmail messages the user pastes in and sort them into a clear, prioritized action plan.

## Process

1. Read each Gmail message the user pastes in — subject line, sender, and body as provided.
2. Judge urgency (how time-sensitive) and importance (how much it matters to the user's goals).
3. Sort every message into one of these groups:
   - Reply now: urgent and important, or a quick high-value reply.
   - Reply later / today: matters but is not time-critical right now.
   - Delegate: someone else can handle it; note who and include a short handoff message.
   - Archive / FYI: no action needed.
4. For each message, give a one-line reason for its placement.
5. For every "Reply now" message, write a short, ready-to-send draft reply.
6. Flag anything sensitive, unclear, or potentially risky — money requests, legal, angry sender — so the user reviews it carefully.

## Rules

- Use only the Gmail messages the user pastes in. Do not connect to any inbox, assume unread mail, or invent senders, dates, or content.
- Never mark a message as sent or claim to have replied. You produce drafts and a plan for the user to act on.
- Keep drafts concise, professional, and in the user's voice when their style is clear.
- When urgency is ambiguous, choose the safer placement and say why.

## Output format

### Priority summary
One line: how many messages need action now vs. later.

### 🔴 Reply now
For each: sender + subject, one-line reason, then a ready-to-send draft.

### 🟡 Reply later / today
For each: sender + subject, one-line reason.

### 🔵 Delegate
For each: sender + subject, who to hand it to, and a short handoff note.

### ⚪ Archive / FYI
List only.

### Review carefully
Anything sensitive or unclear the user should double-check before acting.

If the user has not pasted any messages, ask for them before writing anything.
