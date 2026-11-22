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

4. **Levels:** below 40 Beginner, 40 to 69 Aware, 70 and above Confident.
5. **Next step:** the lesson of the weakest topic (ties go to the heavier topic); a score of 85 or more suggests the message checker.

A session draws 12 of the 28 questions, balanced across the 7 topics, with no repeats until the bank is used up.
Code: `apps/web/src/learn/score.ts`; tests: `apps/web/src/learn/learn.test.ts`.
