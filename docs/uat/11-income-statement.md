# UAT — Income Statement

**Route:** `/income-statement`  
**Permission:** `finance:READ`

---

## Purpose

Period profit & loss: sales revenue, cost of goods sold (COGS), gross profit, expenses, other income, net profit.

---

## Prerequisites

- Completed sales and delivered purchases in the test period.
- At least one expense and other income (optional but recommended).

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| IS1 | Page loads for date range | Default period shown | |
| IS2 | Sales revenue | Matches sum of completed sales (ex-VAT or as labeled) for period | |
| IS3 | Cost of goods sold | Reflects cost of items actually sold | |
| IS4 | Gross profit | Revenue − COGS | |
| IS5 | Expenses section | Matches [16-expenses.md](./16-expenses.md) total for same period | |
| IS6 | Other income | Matches [17-other-income.md](./17-other-income.md) for same period | |
| IS7 | Net profit | Gross profit − expenses + other income (per layout) | |
| IS8 | Change date range | Numbers update correctly | |
| IS9 | Empty period | Zeros or empty state, not error | |
| IS10 | Salesman without finance READ | Cannot access (redirect) | |

---

## Also verify (cross-module)

| Line item | Reconcile with |
| --- | --- |
| Sales | [04-sales.md](./04-sales.md), [15-reports.md](./15-reports.md) |
| COGS / margin | [15-reports.md](./15-reports.md) profit report |
| Expenses | [16-expenses.md](./16-expenses.md) |
| Other income | [17-other-income.md](./17-other-income.md) |
| Dashboard profit cards | [01-dashboard.md](./01-dashboard.md) — same direction, may differ by period definition |

---

## Data affected

Read-only aggregation. Fix source transactions if numbers wrong.

---

## Fail notes

```
Issue:
Period:
Line item:
Expected:
Actual:
```
