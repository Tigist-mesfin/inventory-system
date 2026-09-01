# UAT — Reports

**Route:** `/reports`  
**Permission:** sales, purchasing, insights, or finance READ

---

## Purpose

Analytical reports: sales by period/item, purchases, profit/margin, trade summaries. Accessible from Sales area tabs.

---

## Prerequisites

- Sales and purchases in multiple periods.
- Items sold at different margins.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| R1 | Page loads | Report types / tabs available | |
| R2 | Sales by date range | Total matches [04-sales.md](./04-sales.md) for same range | |
| R3 | Sales by item | Qty and revenue per product correct | |
| R4 | Purchase report | Matches [06-purchasing.md](./06-purchasing.md) | |
| R5 | Profit / margin report | Selling − cost per line; totals reasonable | |
| R6 | VAT columns in reports | Align with [14-vat-data.md](./14-vat-data.md) | |
| R7 | Filter by warehouse (if shown) | Only that store's transactions | |
| R8 | Filter by salesman (if shown) | Only that user's sales | |
| R9 | Print report (if button exists) | Readable output | |
| R10 | Empty range | Empty state, not error | |

---

## Also verify (cross-module)

| Report total | Cross-check |
| --- | --- |
| Revenue | [04-sales.md](./04-sales.md), [01-dashboard.md](./01-dashboard.md) |
| Purchase spend | [06-purchasing.md](./06-purchasing.md) |
| Gross profit | [11-income-statement.md](./11-income-statement.md) |
| Top sellers | [02-ai-desk.md](./02-ai-desk.md) insights (directional) |

Profit uses **actual cost** from lots/average at time of sale, not catalog default purchase price alone.

---

## Data affected

Read-only.

---

## Fail notes

```
Issue:
Report type:
Period:
Expected:
Actual:
```
