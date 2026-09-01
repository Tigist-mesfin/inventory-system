# UAT — Live Stock

**Route:** `/stock`, `/stock/import`  
**Permission:** `inventory:READ` (import needs CREATE/UPDATE)

---

## Purpose

View on-hand quantity and value per product per warehouse; import opening stock (if permitted).

---

## Prerequisites

- At least one delivered purchase and one completed sale for movement tests.
- Multiple warehouses for per-store checks.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| ST1 | List loads | Products with qty per warehouse (or filter by store) | |
| ST2 | After purchase **saved only** | Qty **unchanged** | |
| ST3 | After purchase **delivered** | Qty **increased** by received amount | |
| ST4 | After sale completed | Qty **decreased** in sale warehouse only | |
| ST5 | After transfer A→B | A down, B up, same quantity | |
| ST6 | Available qty on sale form | Matches live stock for that warehouse | |
| ST7 | Cannot go negative | Sale/transfer blocked if insufficient | |
| ST8 | Average cost / value columns (if shown) | Reasonable after receipts; frozen logic at zero qty | |
| ST9 | Low stock / reorder highlight (if shown) | Matches product reorder settings | |
| ST10 | Search / filter by name, warehouse | Correct subset | |
| ST11 | Salesman — assigned warehouse only | Does not see other stores' qty | |
| ST12 | Stock import (if used) | Opening balances set; ledger transactions created | |

---

## Also verify (cross-module)

| Stock figure | Source of change |
| --- | --- |
| +qty | [06-purchasing.md](./06-purchasing.md) deliver, [19-transfers.md](./19-transfers.md) in, adjustment (if any) |
| −qty | [04-sales.md](./04-sales.md), [05-customer-orders.md](./05-customer-orders.md) approve, transfer out |
| Dashboard total stock | [01-dashboard.md](./01-dashboard.md) — sum of warehouses |
| AI / Reports stock questions | [03-ai-assistant.md](./03-ai-assistant.md), [15-reports.md](./15-reports.md) |

### Reconciliation formula

```
Current qty = Opening + all IN − all OUT
```

For a single item in one warehouse after buy 10 and sell 3: **on-hand = 7**.

---

## Data affected

Live stock is **derived** from `inventory` table. Changes happen only via purchasing delivery, sales, transfers, adjustments, import — never by editing this screen directly (unless adjustment module exists elsewhere).

---

## Fail notes

```
Issue:
Product:
Warehouse:
Steps:
Expected qty:
Actual qty:
```
