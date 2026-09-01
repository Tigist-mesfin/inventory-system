# UAT — Products (Catalog)

**Routes:** `/catalog`, `/catalog/:id/history`  
**Permission:** `catalog:READ`

---

## Purpose

Product master: name, unit, selling price, default purchase price, category, brand, etc. Item history shows sales and purchase movements.

---

## Prerequisites

- Category/supplier optional.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| PR1 | Add product — name, unit, selling price, default purchase price | Saves | |
| PR2 | Optional fields — brand, size, color, category | Save and display | |
| PR3 | Search / list | Finds new item | |
| PR4 | Edit selling price | Next sale defaults to new price | |
| PR5 | Customer special price (if feature exists) | Overrides default on that customer | |
| PR6 | Item history — Sales tab | Shows qty, date, amounts after sales | |
| PR7 | Item history — Purchases tab | Shows receipts after deliver | |
| PR8 | Delete product with history | Blocked with message | |
| PR9 | Product on purchase/sale pickers | Searchable | |
| PR10 | Reorder level (if set) | Appears in low stock / dashboard alerts | |

---

## Also verify (cross-module)

| Catalog change | Effect |
| --- | --- |
| New product | Available on [06-purchasing.md](./06-purchasing.md) and [04-sales.md](./04-sales.md) after stock exists |
| Selling price edit | New sales only; past invoices unchanged |
| Default purchase price | Default on new PO lines; actual cost from [06-purchasing.md](./06-purchasing.md) delivery |
| History totals | Match [04-sales.md](./04-sales.md) and [06-purchasing.md](./06-purchasing.md) line details |

---

## Data affected

`products` master. Price changes do not retroactively alter completed documents.

---

## Fail notes

```
Issue:
Product name:
Steps:
Expected:
Actual:
```
