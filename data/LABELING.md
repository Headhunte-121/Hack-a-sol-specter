# Labelling guide

Two labels per message: **scam (1)** or **genuine (0)**, and for scams a category from the shared list: `kyc_bank`, `otp`, `digital_arrest`, `courier_customs`, `lottery_prize`, `loan_app`, `investment_job`, `phishing_link`, `payment_request`, `fake_qr`, `other`.

## Edge cases

- A genuine bank OTP message is **genuine**, even though it mentions OTP. So is a message that tells you not to share your OTP.
- A genuine bank debit or credit alert is **genuine**, even when it says "if this was not you, call...".
- Delivery notices, bills, appointment reminders and receipts are **genuine**.
- A promotion from a real brand is not a scam unless it asks for a payment, a code, or an app or file from a stranger.
- A message that asks you to click a link to "update KYC", to share an OTP, to pay a fee before a loan, job or prize, or to install an app is a **scam**.
- A message claiming to be police, CBI, customs or a courier demanding money is a **scam**.

## Process

- At least 10 percent of messages are labelled by two people. Discuss disagreements and add the rule here.
- Report the agreement rate in the evaluation.
- Remove duplicates and near-duplicates before splitting (the pipeline does this on a masked form of the text).
- Hinglish has no standard spelling: collect real variants, but never put spelling-variant augmentation into validation or test sets.
