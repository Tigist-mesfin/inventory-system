# UAT — Expenses

**Route:** `/expenses`  
**Permission:** `finance:READ` (create needs CREATE)

---

## Purpose

Record operating expenses: rent, salary, utilities, etc. Feeds income statement net profit.

---

## Prerequisites

- Finance permission.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| E1 | List expenses | Shows historical rows | |
| E2 | Add expense — amount, category/type, date, description | Saves and appears in list | |
| E3 | Edit expense (if allowed) | Updates row | |
| E4 | Delete expense (if allowed) | Removed from list and income statement | |
| E5 | Date filter | Correct subset for period | |
| E6 | Total for month | Matches [11-income-statement.md](./11-income-statement.md) expenses line | |
| E7 | Large amount 1,000,000.55 | Two decimal places | |
| E8 | Salesman without finance | Cannot access | |

---

## Also verify (cross-module)

| Action | Check |
| --- | --- |
| Add expense 5,000 in March | [11-income-statement.md](./11-income-statement.md) March net profit ↓ 5,000 |
| Does **not** affect | Stock, sales, debit & credit, VAT |

---

## Data affected

`expenses` table only.

---

## Fail notes

```
Issue:
Expense date/amount:
Expected in income statement:
Actual:
```
