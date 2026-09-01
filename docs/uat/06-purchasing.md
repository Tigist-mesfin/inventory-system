# UAT — Purchasing

**Routes:** `/buy`, `/buy/import`  
**Permission:** `purchasing:READ` (create needs CREATE)

---

## Purpose

Create purchase orders from suppliers, record delivery to warehouse (stock in), partial supplier payments.

---

## Prerequisites

- Supplier registered ([09-customers-suppliers.md](./09-customers-suppliers.md)).
- Product in catalog.
- At least one warehouse.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| P1 | New purchase — supplier, lines, qty, unit price | Form saves | |
| P2 | VAT on purchase form | 15% summary shown | |
| P3 | Save purchase (not delivered) | Listed as pending / not delivered | |
| P4 | **Stock unchanged after save** | **Live stock same as before** | |
| P5 | Mark delivered — choose warehouse | Stock **increases** in that warehouse only | |
| P6 | Cannot deliver more than ordered | Blocked | |
| P7 | Cannot deliver same PO twice for full qty | No double stock | |
| P8 | Second buy same item at different price | Both lot prices in history; WAC/average updates | |
| P9 | Duplicate product on one PO | Blocked | |
| P10 | Partial payment to supplier | Remaining payable on ledger | |
| P11 | Full payment | Supplier balance zero for that PO | |
| P12 | Cancel PO (nothing received) | Allowed; no stock impact | |
| P13 | Salesman with purchasing READ | Sees company purchases; CREATE only if granted | |
| P14 | Import purchases (if used) | Valid rows create POs | |

---

## Also verify (cross-module)

| Purchase action | Check |
| --- | --- |
| After save only | [07-live-stock.md](./07-live-stock.md) — **no change** |
| After deliver | [07-live-stock.md](./07-live-stock.md) — qty ↑; [13-products-catalog.md](./13-products-catalog.md) history |
| Unpaid balance | [08-debit-credit.md](./08-debit-credit.md) Debit tab |
| Purchase VAT | [14-vat-data.md](./14-vat-data.md) |
| Dashboard purchases | [01-dashboard.md](./01-dashboard.md) |
| Income statement COGS | [11-income-statement.md](./11-income-statement.md) (when goods sold) |

### Example

Buy 10 units @ 100 ETB, deliver to Store A → Live stock +10 in Store A. Supplier unpaid 1,000 (+ VAT if shown) → Debit tab shows payable until paid.

---

## Data affected

| Action | Changes |
| --- | --- |
| Save PO | `purchase_orders`, `purchase_order_items` |
| Deliver | `inventory` ↑, `stock_transactions`, `stock_batches`/lots, PO received qty |
| Supplier payment | PO `paidAmount` ↑, payable ↓ |

---

## Fail notes

```
Issue:
PO #:
Steps:
Expected:
Actual:
```
