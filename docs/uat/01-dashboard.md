# UAT — Dashboard

**Route:** `/` (Home)  
**Permission:** All logged-in users (purchase cards may hide for users without purchasing READ)

---

## Purpose

Company-wide snapshot: stock totals, today/week sales & purchases, profit, customer credit, supplier payables, low stock alerts.

---

## Prerequisites

- Some purchases delivered and sales completed for meaningful numbers.
- Know your test period (today / this week).

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| D1 | Page loads without error | Cards and sections render | |
| D2 | Total stock | Matches sum of **Live stock** across warehouses | |
| D3 | Per-warehouse stock cards | Each store qty matches **Live stock** filter for that warehouse | |
| D4 | Today sales total & count | Matches **Sales** → Today tab totals | |
| D5 | Week sales | Matches **Sales** → This week | |
| D6 | Today / week purchases | Matches **Purchasing** list for same period (if you have purchasing access) | |
| D7 | Gross profit today / week | Consistent with **Reports** / **Income statement** for same period (approximate; timing may differ by completion time) | |
| D8 | Customer credit total | Matches **Debit & credit** → Credit tab total | |
| D9 | Supplier payables | Matches **Debit & credit** → Debit tab total | |
| D10 | Low stock list | Items at or below reorder level in **Products** / **Live stock** | |
| D11 | Quick links | New purchase, Live stock, Income statement navigate correctly | |
| D12 | Mobile Home tab | Same dashboard loads on phone layout | |

---

## Also verify (cross-module)

| Dashboard figure | Reconcile with |
| --- | --- |
| Customer credit | [08-debit-credit.md](./08-debit-credit.md) — sum of customer `remaining` |
| Supplier payables | [08-debit-credit.md](./08-debit-credit.md) — sum of unpaid purchases |
| Stock totals | [07-live-stock.md](./07-live-stock.md) |
| Sales totals | [04-sales.md](./04-sales.md) |
| Profit | [11-income-statement.md](./11-income-statement.md), [15-reports.md](./15-reports.md) |

**After any sale with unpaid balance:** Dashboard customer credit must increase by the **remaining** amount.  
**After collecting customer payment:** Dashboard credit must decrease by payment amount.

---

## Data affected

Dashboard is **read-only** — it aggregates data from sales, purchases, inventory, ledger. Fixing a mismatch means the source tab is wrong, not the dashboard.

---

## Fail notes

```
Issue:
Steps:
Expected:
Actual:
Screenshot:
```
