# UAT — Debit & Credit (Ledger)

**Route:** `/ledger`  
**Permission:** `sales:READ` and/or `purchasing:READ`

---

## Purpose

Track **money owed to you** (customer credit / receivables) and **money you owe** (supplier payables). Collect customer payments and pay suppliers.

---

## Prerequisites

- At least one sale with **partial payment** (customer still owes).
- At least one purchase with **partial supplier payment** (you still owe).

---

## Features to test

### Credit tab (customers owe you)

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| L1 | Credit list shows open invoices | Customer name, invoice #, remaining balance | |
| L2 | Credit total | Sum of all `remaining` rows | |
| L3 | Matches Sales unpaid | Each row = `totalWithVat − paid` on that invoice in **Sales** | |
| L4 | Collect payment — pick customer | Amount defaults to total owed (or editable) | |
| L5 | Collect full remaining | Invoice remaining → 0; row disappears or shows paid | |
| L6 | Collect partial | Remaining reduced by payment amount | |
| L7 | Overpay blocked | Cannot pay more than remaining | |
| L8 | Payment method required | Same methods as sales | |
| L9 | Walk-in unpaid | Only specific invoices; not mixed into wrong customer | |

### Debit tab (you owe suppliers)

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| L10 | Debit list shows unpaid purchases | Supplier, PO #, remaining | |
| L11 | Debit total | Sum of supplier payables | |
| L12 | Matches Purchasing unpaid | Same amounts as purchase `total − paid` | |
| L13 | Pay supplier — partial | Payable reduced | |
| L14 | Pay supplier — full | Row cleared | |
| L15 | Overpay blocked | Clear error | |

---

## Also verify (cross-module) — **most important tab for accuracy**

| Ledger figure | Must equal |
| --- | --- |
| Credit total | [01-dashboard.md](./01-dashboard.md) customer credit |
| Each customer remaining | Sum of their open invoices in [04-sales.md](./04-sales.md) |
| Debit total | [01-dashboard.md](./01-dashboard.md) supplier payables |
| Each PO remaining | [06-purchasing.md](./06-purchasing.md) unpaid balance |
| After customer payment | **Not** wallet balance ([10-customer-wallets.md](./10-customer-wallets.md)) |

### Wallet vs debit (do not confuse)

| Type | Meaning | Where recorded |
| --- | --- | --- |
| **Wallet** | Customer prepaid you | Customer wallets — Deposit |
| **Debit / credit** | Customer still owes on invoice | Debit & credit — Credit tab |
| **Wallet recharge** | Increases wallet | Does **not** reduce invoice debt |
| **Invoice payment** | Reduces invoice debt | Does **not** increase wallet |

### Worked example

1. Sale 1,150 total, paid 500 → Credit shows **650**.
2. Customer pays 200 on ledger → Credit shows **450**.
3. Sales invoice shows paid 700, remaining 450.
4. Wallet unchanged unless separate wallet transaction.

---

## Data affected

| Action | Changes |
| --- | --- |
| Collect customer payment | `sales.paidAmount`, customer receivable |
| Pay supplier | `purchase_orders.paidAmount`, supplier payable |

---

## Fail notes

```
Issue:
Tab (credit/debit):
Invoice or PO #:
Payment amount:
Expected remaining:
Actual remaining:
Also check: Sales / Dashboard / Wallets
```
