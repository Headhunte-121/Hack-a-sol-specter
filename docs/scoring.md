# Digital Financial Literacy Score: how it is computed

The score is a **learning aid, not a validated test**. It is deterministic (same answers, same score) and computed on the phone only.

1. **Question weight** by difficulty: easy 1, medium 1.5, hard 2.
2. **Topic score** = weighted share of correct answers in that topic, 0 to 100.
3. **Overall score** = weighted mean of the topic scores of the topics that were answered:

| Topic | Weight |
|---|---|
| OTP, PIN and card safety | 20 |
| UPI and QR safety | 20 |
| Fake KYC and bank calls | 15 |
| Digital arrest and police calls | 15 |
| Courier, customs and parcel scams | 10 |
| Fake links, apps and remote access | 10 |
| What to do if it happens | 10 |
| ATM PIN and your card | 10 |
| Your UPI PIN | 10 |
| Everyday habits that protect you | 10 |

4. **Levels:** below 40 Beginner, 40 to 69 Aware, 70 and above Confident.
5. **Next step:** the lesson of the weakest topic (ties go to the heavier topic); a score of 85 or more suggests the message checker.

A session draws 15 of the 150 questions, balanced across the 10 topics (every topic appears at least once), with no repeats until the bank is used up. Each topic has 15 questions, mixing multiple choice, true/false and short scenarios.

The order of the options on screen is shuffled with a seed, and true/false keeps its order. The shuffle only changes how the options look: every answer is scored by the option's original position, so the same answers always give the same score, whatever order the options were shown in (`displayOrder` in `quiz.ts`, tested in `learn.test.ts`).
Code: `apps/web/src/learn/score.ts`; tests: `apps/web/src/learn/learn.test.ts`.
