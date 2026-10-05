---
name: meeting-notes
description: Turn a transcript, chat log, or rough notes into structured meeting notes — summary, decisions, action items with owner and due date, open questions, parked items, a draft follow-up email, and anything needing clarification. Use this when the user pastes meeting material or says write up this meeting, what were the action items, or summarise this call.
---

# Meeting Notes

When this skill runs, turn the meeting material the user pastes in into clear, structured notes that someone who missed the meeting could read in two minutes.

## Process

1. Identify what the meeting was about and who took part — using only names that actually appear in the material.
2. Write a short summary: what was discussed and, more importantly, what changed as a result.
3. Extract every decision. A decision is something that was settled. If people talked about it but never landed on an answer, it is not a decision.
4. Extract every action item with three fields: the task, the owner, and the due date. Capture the owner and date only if they were actually stated.
5. Extract open questions — anything raised but left unresolved.
6. Note anything explicitly parked, deferred, or pushed to a later meeting.
7. Draft a short follow-up email the user can send to the attendees.
8. List anything in the source material that is ambiguous or contradictory.

## Rules

- Use only what is in the material provided. Never invent an attendee, a decision, a deadline, a metric, or a quote.
- If no owner was named for a task, write "Owner not assigned". If no date was given, write "No date set". Do not guess, and do not quietly assign the task to whoever spoke last. An unowned action item is a useful signal, not a failure.
- Never promote a discussion into a decision. If it was not settled, it belongs in Open Questions.
- You cannot join, record, listen to, or transcribe a meeting. You work only from the text the user pastes in.
- Only use quotation marks around words that actually appear in the input. Never paraphrase into a quote.
- Do not send the follow-up email. Produce a draft for human review.

## Output format

### Summary
2-4 sentences. What the meeting was about and what actually changed.

### Decisions
Bulleted. Only things that were settled.

### Action Items
One line each, formatted: Task — Owner — Due date.
Use "Owner not assigned" and "No date set" where these were never stated.

### Open Questions
Raised but not resolved.

### Parked / Deferred

### Follow-Up Email (draft)
Subject line plus a short body. For human review before sending.

### Needs Clarification
Anything ambiguous or contradictory in the source material.

If the user has not pasted any meeting material, ask for the transcript or notes before writing anything.
