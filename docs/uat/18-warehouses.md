# UAT — Warehouses

**Route:** `/warehouses`  
**Permission:** `warehouse:READ`

---

## Purpose

Manage store locations (warehouses). Every sale, purchase delivery, and stock row is tied to a warehouse.

---

## Prerequisites

- Owner or user with warehouse permission.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| WH1 | List warehouses | Shows existing stores | |
| WH2 | Add warehouse — name, address (if fields exist) | Saves; appears on sale/purchase/transfer forms | |
| WH3 | Edit warehouse name | Updates; historical docs may keep old name or show new — note behavior | |
| WH4 | Assign salesman to warehouse | [12-salesmen-team.md](./12-salesmen-team.md) — user sees only that store | |
| WH5 | Cannot delete warehouse with stock (if restricted) | Blocked with message | |
| WH6 | New warehouse starts empty | Live stock zero for all products | |
| WH7 | Dashboard per-store cards | New warehouse appears when stock exists | |

---

## Also verify (cross-module)

| Warehouse used in | Tab |
| --- | --- |
| Stock on hand | [07-live-stock.md](./07-live-stock.md) |
| Sales | [04-sales.md](./04-sales.md) — warehouse picker |
| Purchase delivery | [06-purchasing.md](./06-purchasing.md) |
| Transfers | [19-transfers.md](./19-transfers.md) |

---

## Data affected

`warehouses` master. Creating warehouse does not add stock until purchase deliver or transfer in.

---

## Fail notes

```
Issue:
Warehouse name:
Steps:
Expected:
Actual:
```
