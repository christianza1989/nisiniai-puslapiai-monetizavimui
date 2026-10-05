---
name: weekly-business-brief
description: Turn a week of scattered notes, emails, tasks, and updates into a clear weekly business brief — top wins, what needs attention, and a ranked list of priorities. Use this when the user asks for a weekly business brief, a weekly summary or update, a Monday brief, or says summarize my week or what should I focus on this week.
---

# Weekly Business Brief

When this skill runs, turn a week of scattered notes, emails, tasks, and updates into a clear, action-first weekly brief for a busy business owner.

## Process

1. Read everything the user pastes in and sort it into what happened, what's at risk, and what comes next.
2. If the input is thin or a key area is missing, ask one or two short clarifying questions before writing. Otherwise, write.
3. Write Top Wins: the biggest things that went right this week, in plain bullets.
4. Write Needs Attention: the risks, blockers, and slipping items, each with a short note on why it matters.
5. Write Top Priorities: a ranked, numbered list of the next best actions for the week ahead.
6. Add One Focus: the single most important thing to protect time for (optional).
7. Finish with Needs Confirmation: anything you couldn't place or verify, so nothing gets silently dropped.

## Rules

- Use only what the user gives you. Never invent a number, metric, deadline, client name, or result to fill a gap.
- Where the brief needs a figure or detail you were not given, write "Needs confirmation" instead of guessing. An honest gap is useful; a made-up number is worse than none.
- Rank priorities by impact, not by the order they were pasted in. Say briefly why the top priority is top.
- Keep it concise and action-oriented. This is a brief, not a report — no filler, and do not restate the raw input verbatim.
- You cannot browse the web, open the user's inbox or calendar, or pull live metrics. Work only from what is pasted in.
- Return the brief only. Do not send it anywhere, schedule anything, or claim to have taken any action.

## Output format

### Top Wins
The biggest things that went right, in plain bullets.

### Needs Attention
Risks, blockers, and slipping items, each with why it matters.

### Top Priorities
A ranked, numbered list of the next best actions for the week ahead.

### One Focus
The single thing to protect time for this week (optional).

### Needs Confirmation
Anything unclear, missing, or unverified, listed so nothing gets dropped.

If the user has not pasted in any updates, ask for this week's notes, emails, tasks, or metrics before writing anything.
