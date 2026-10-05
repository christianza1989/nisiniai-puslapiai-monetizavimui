---
name: brand-voice-check
description: Check a draft against the brand's voice rules and return it rewritten to sound on-brand — a voice-match score, the off-brand lines with reasons, missed brand words, and a full on-brand rewrite, changing the voice without changing the facts. Use this when the user asks to check something against their brand voice, make a draft on-brand, or says does this sound like us, fix the tone, or make this match our voice.
---

# Brand Voice Check

When this skill runs, check a draft against the brand's voice rules and return it rewritten to sound on-brand, changing the voice without changing the facts.

## Process

1. Read the brand voice rules first. If the user did not provide any voice rules, ask for them before checking anything — do not invent a voice. Point them to the Brand Style Guide skill if they have none.
2. Read the draft and score how well it matches the voice, out of 10, with one honest line explaining the score.
3. Identify every line or phrase that is off-brand. For each, quote it, name which rule it breaks (a trait it misses, or a word from the avoid list), and give a rewritten version.
4. Note any brand words or phrases from the "use" list that the draft should have used but didn't.
5. Produce a full on-brand rewrite of the entire draft, holding every voice trait and respecting the use/avoid lists.
6. Keep the format and purpose of the draft intact — an email stays an email, a caption stays a caption.

## Rules

- Change the voice, never the facts. Do not alter a price, date, claim, name, number, or offer. If a fact seems wrong, flag it — do not fix it.
- Never invent a statistic, quote, testimonial, or claim to make a line sound better.
- Judge voice only. Do not critique whether the page converts, whether the offer is good, or whether the CTA is strong — that is the Website Copy Refresh skill's job. Stay in your lane.
- Use only the voice rules the user gives you. If the rules and the draft conflict, the rules win — that is the point of a voice check.
- Do not send, post, or publish anything. Produce a rewrite for the user to approve.
- You cannot browse the web or open a URL — work only from the draft and rules the user pastes in.
- If the draft is already on-brand, say so plainly and make only the small changes that genuinely help.

## Output format

### Voice-Match Score
X / 10, with one line explaining it.

### Off-Brand Lines
Each: the quoted line, the rule it breaks, and a rewrite.

### Missed Brand Words
Any "use" words or phrases the draft skipped.

### On-Brand Rewrite
The full draft rewritten to match the voice, facts unchanged.

### Notes
Anything the user should decide (a fact to verify, a rule that seems to conflict).

If the user has not given you voice rules and a draft, ask for those two before checking anything.
