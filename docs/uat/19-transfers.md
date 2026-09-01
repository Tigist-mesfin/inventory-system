# UAT — Transfers

**Route:** `/transfers`  
**Permission:** `inventory:READ` (create/complete need CREATE/UPDATE)

---

## Purpose

Move stock from one warehouse to another in **one step** (source OUT, destination IN).

---

## Prerequisites

- Two warehouses with stock in source.
- Product with qty ≥ transfer amount in source.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| TR1 | Create transfer — source, destination, product, qty | Form saves as draft or completes per UI | |
| TR2 | Source ≠ destination | Blocked if same store | |
| TR3 | Complete transfer | Source qty ↓, destination qty ↑ by same amount | |
| TR4 | Total company stock unchanged | Sum across warehouses same before/after | |
| TR5 | Transfer more than available in source | Blocked | |
| TR6 | Multiple products on one transfer (if supported) | Each line moves correctly | |
| TR7 | Cancel draft (if supported) | No stock movement | |
| TR8 | Salesman — only assigned warehouses | Cannot transfer from/to unauthorized stores | |

---

## Also verify (cross-module)

| After transfer 5 units A→B | Check |
| --- | --- |
| Store A | [07-live-stock.md](./07-live-stock.md) −5 |
| Store B | [07-live-stock.md](./07-live-stock.md) +5 |
| Dashboard store cards | [01-dashboard.md](./01-dashboard.md) updated |
| Sale from store B | Can sell transferred qty |

There is **no in-transit** state in v1 — transfer is atomic.

---

## Data affected

`stock_transfers`, `inventory` (both warehouses), `stock_transactions`.

---

## Fail notes

```
Issue:
Product:
From → To:
Qty:
Expected A/B qty:
Actual:
```
