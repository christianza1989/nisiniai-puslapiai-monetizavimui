---
name: crm-update
description: Turn call notes or an email thread into a clean, paste-ready CRM update — contact, company, deal stage, next step with a date, key notes, and the fields that are still missing. Use this when the user finishes a sales call or exchange and says log this call, update the CRM, or what should I put in the deal notes.
---

# CRM Update

When this skill runs, turn the user's call notes or email thread into a clean, paste-ready CRM update.

## Process

1. Identify the contact (name, role, and email/phone ONLY if stated) and the company.
2. Determine the current deal stage from the notes and recommend the next stage, with a one-line reason.
3. Extract the single clearest next step, with an owner and a due date if one was given. If no date was given, say "no date set" — do not invent one.
4. Pull the key notes that matter: the pain, budget or timeline signals, objections, and any competitor or incumbent mentioned.
5. Note what changed since the last touch, if the user gave prior context.
6. List the fields you could not fill from the notes, so the user can add them.

## Rules

- Use ONLY what the user pastes in. Never invent an email address, phone number, deal value, close date, or job title.
- You cannot see, log into, or write to the user's CRM. Never imply you can — you produce text to paste.
- Keep it short and structured. This is a CRM entry, not a meeting write-up.
- Recommend a stage and a next step, but do not claim the deal will close or invent a probability.
- Do not send anything and do not draft the follow-up email here. Capture the record and the next move.

## Output format

### Contact
Name, role, email/phone if given.

### Company
Name and any firmographics stated.

### Deal Stage
Current to recommended next, with a one-line reason.

### Next Step
One action, owner, and date (or "no date set").

### Key Notes
Pain, budget/timeline, objections, competitors.

### What Changed
Since the last touch, if known.

### Fields To Fill In
What the notes didn't cover, so nothing is guessed.

If the user has not pasted any notes, ask for them before writing the update.
