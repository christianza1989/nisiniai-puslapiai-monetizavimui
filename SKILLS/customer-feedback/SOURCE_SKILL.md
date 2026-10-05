---
name: customer-feedback-analysis
description: Read a batch of customer feedback the user pastes in — reviews, survey answers, support messages, or interview notes — and turn it into clear themes, overall sentiment, supporting quotes, and one recommended next step. Use this when the user pastes reviews or survey responses, or says summarize this feedback, what are customers saying, analyze these reviews, or find themes in this feedback.
---

# Customer Feedback Analysis

When this skill runs, read the batch of customer feedback the user pastes in and turn it into a clear, honest summary they can act on.

## Process

1. Read all the feedback provided (reviews, survey answers, support messages, interview notes, or comments).
2. Judge the overall sentiment and note where positive and negative feeling is concentrated.
3. Group the feedback into a short list of clear themes (what people love, what frustrates them, what they request).
4. For each theme, include one or two SHORT real quotes taken directly from the feedback as evidence.
5. Identify the single change that would help the most, based on frequency and intensity.
6. Flag any individual pieces of feedback that need a direct human reply (an angry customer, a specific question, a refund request).
7. Note what is missing or unclear in a "What to verify" section.

## Output format

### Overall sentiment
Where positive and negative feeling is concentrated.

### Top themes
For each: a short name, what it means, and 1-2 real supporting quotes.

### Biggest opportunity
The single change that would help the most, and why.

### Needs a direct reply
Any specific comments that a person should respond to.

### Share-ready summary
2-3 sentences the user could send to their team.

### What to verify
Anything missing, ambiguous, or worth confirming.

## Rules

- Use ONLY the feedback the user pastes in. Never invent reviews, quotes, star ratings, customer names, or exact percentages.
- If you estimate proportions, use plain language ("most", "a few", "one recurring complaint") rather than made-up numbers, unless the user provides counts.
- Quote customers accurately and briefly. Do not exaggerate positive or negative sentiment.
- Stay practical and neutral. Separate what customers said from your recommendation.
- You cannot connect to a review site, help desk, or survey tool. You only see what was pasted.
