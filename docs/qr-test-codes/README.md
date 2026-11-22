# Test QR codes

Scan each image with the app. Expected result in the last column. The app must never call a code "safe".

| File | Content | Kind | Expected risk | Expected flags |
|---|---|---|---|---|
| shop_with_amount.png | `upi://pay?pa=ramesh.store@okhdfcbank&pn=Ramesh%20General%20Store&am=250&cu=INR&tn=Groceries` | upi | medium | preset_amount |
| shop_static.png | `upi://pay?pa=ramesh.store@okhdfcbank&pn=Ramesh%20General%20Store&cu=INR` | upi | none | - |
| tampered_refund.png | `upi://pay?pa=refund.desk@ybl&pn=Refund%20Desk&am=4999&tn=Refund%20reward%20claim` | upi | high | preset_amount, refund_note |
| odd_handle.png | `upi://pay?pa=shop123@paytmq&pn=City%20Mobiles` | upi | medium | odd_handle |
| no_name_big_amount.png | `upi://pay?pa=payee.demo@ybl&am=75000` | upi | medium | no_name, preset_amount, big_amount |
| malformed.png | `upi://pay?pn=Someone&am=100` | upi | high | malformed, preset_amount |
| lookalike_link.png | `http://hdfc-secure-login.xyz/verify` | url | high | - |
| official_link.png | `https://www.hdfcbank.com/personal` | url | none | - |
| plain_text.png | `Hello, this is a plain text QR code` | text | none | - |
| shortened_link.png | `https://bit.ly/3xYz9` | url | medium | - |
