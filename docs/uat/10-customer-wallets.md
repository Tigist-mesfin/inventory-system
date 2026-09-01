# UAT — Customer Wallets

**Route:** `/customers/wallets`  
**Permission:** `customers:READ` (recharge may need CREATE/UPDATE)

---

## Purpose

Manage **prepaid wallet** balance per registered customer: deposits, sale deductions, history.

---

## Prerequisites

- Registered customer.
- Payment methods configured.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| W1 | Wallet balance list | Shows customers with current balance | |
| W2 | Recharge — amount, method, reason, date | Balance increases by deposit amount | |
| W3 | History row after recharge | Type Deposit; method; reason; amount; date | |
| W4 | Sale with "deduct from wallet" | Balance decreases by amount paid from wallet | |
| W5 | History after sale | Type Sale deduct; invoice reference if shown | |
| W6 | Cannot deduct more than balance | Clear error on sale form | |
| W7 | Walk-in sale | No wallet option | |
| W8 | Wallet recharge is **not** invoice payment | Debit & credit **unchanged** by recharge alone | |
| W9 | Multiple recharges | Balance = sum deposits − sum deductions | |
| W10 | Filter / search customer | Correct wallet shown | |

---

## Also verify (cross-module)

| Wallet action | Check |
| --- | --- |
| After recharge +5,000 | Balance +5,000; **Debit & credit unchanged** |
| Sale 1,150 paid from wallet | Balance −1,150; [04-sales.md](./04-sales.md) invoice shows wallet; [08-debit-credit.md](./08-debit-credit.md) no new debt if fully paid |
| Partial wallet + partial cash | Wallet −wallet portion; remaining on credit tab if any |

### Example

Deposit 5,000 → wallet 5,000.  
Sale 1,150 from wallet → wallet **3,850**.  
Customer still owes **0** on that sale if fully covered by wallet.

---

## Data affected

`customer_wallet_transactions`, customer wallet balance field.

**Not the same as** customer invoice debt ([08-debit-credit.md](./08-debit-credit.md)).

---

## Fail notes

```
Issue:
Customer:
Transaction type:
Expected balance:
Actual balance:
```
