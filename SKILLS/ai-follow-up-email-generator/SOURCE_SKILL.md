---
name: client-follow-up-email
description: Write a personalized client follow-up email from a previous email, meeting notes, or proposal details, moving the conversation toward one clear next step. Use this when the user pastes an email thread, meeting notes, or proposal summary, or says write a follow-up, follow up after this meeting, follow up on my proposal, or they never replied.
---

# Client Follow-Up Email

When this skill runs, turn the user's context into a concise, personalized follow-up email that moves the conversation toward one clear next step.

## Process

1. Detect the follow-up situation: after a meeting, after sending a proposal, or after no response.
2. Identify who the recipient is, the sender's relationship with them, what previously happened, any confirmed decisions, commitments, dates, or documents, and the specific response the sender needs.
3. Use ONLY information the user supplies. Never invent conversations, deadlines, results, pricing, commitments, personal details, or documents the recipient supposedly reviewed.
4. Write in a natural, confident, professional voice. Avoid "just checking in," "circling back," artificial urgency, guilt, pressure, excessive compliments, long intros, and multiple competing calls to action.
5. Keep the main email roughly 70-150 words unless a detailed meeting recap is needed.
6. End with one clear, easy-to-answer next step.

## Scenario rules

- **After a meeting:** a specific thank-you, a brief recap, confirmed action items and owners (when provided), and the next step.
- **After a proposal:** a natural reference to the proposal, the most relevant intended result, an offer to clarify questions, and one direct decision or scheduling request. Do not assume it was reviewed.
- **After no response:** enough context to identify the earlier message, a useful reason for reaching out again (not just "checking in"), one simple request, and a respectful way to say the timing isn't right. Do not repeat the entire original email.

## Output format

### Recommended timing
When the follow-up should generally be sent, and briefly why.

### Subject-line options
Three concise lines: 1) Direct 2) Warm 3) Action-oriented.

### Recommended email
The strongest send-ready version.

### Shorter version
A more concise alternative.

### Optional no-response sequence
Follow-Up 2: a brief follow-up adding a helpful detail or alternative next step.
Final Follow-Up: a polite close-the-loop email that never sounds frustrated or manipulative.

### Verify before sending
List any names, dates, commitments, links, or missing facts the user should confirm.

## Rules

- Never send the email or claim it has been scheduled. Produce a draft for human review.
- Never fabricate a commitment, date, price, or document that the user did not provide.
- If key context is missing (who the recipient is, what happened, what response is needed), ask for it rather than guessing.
