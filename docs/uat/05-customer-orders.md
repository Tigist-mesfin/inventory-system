# UAT — Customer Orders & Proforma

**Routes:** `/orders`, `/orders/:id/proforma`, `/p/:token` (public)  
**Permission:** `sales:READ` (create/approve need CREATE/APPROVE/UPDATE)

---

## Purpose

Take customer orders before delivery, print/share **proforma** (quotation), approve to create real sale and deduct stock.

---

## Prerequisites

- Products in stock.
- Registered customer and walk-in test (name + phone).

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| O1 | New order — registered customer | Customer picker works | |
| O2 | New order — walk-in | Name + phone required | |
| O3 | Delivery date, items, qty, price | Lines calculate with VAT | |
| O4 | Save order | Appears in orders list as pending | |
| O5 | **Pending order does not reduce stock** | **Live stock unchanged** | |
| O6 | Open proforma | Company, customer, lines, VAT, grand total | |
| O7 | Proforma disclaimer | States not a tax invoice until approved | |
| O8 | Print proforma | Readable layout; footer designer credit | |
| O9 | Copy share link / WhatsApp | Link copied | |
| O10 | Public link (`/p/...`) without login | Same proforma; VAT visible | |
| O11 | Invalid token link | Clear error, not blank crash | |
| O12 | Approve order | Choose warehouse, payment method, amount paid, loading/delivered status | |
| O13 | After approve — stock | **Live stock decreased** in chosen warehouse | |
| O14 | After approve — sale exists | Appears in **Sales** list; invoice printable | |
| O15 | Partial pay on approve | Remaining on **Debit & credit** for registered customer | |
| O16 | Mark delivered later | Status updates if approved as "on loading" | |
| O17 | Salesman without APPROVE | Cannot approve (button hidden/disabled) | |

---

## Also verify (cross-module)

| Order action | Check |
| --- | --- |
| Before approve | [07-live-stock.md](./07-live-stock.md) — no change |
| After approve | [04-sales.md](./04-sales.md) — new sale; [07-live-stock.md](./07-live-stock.md) — qty down |
| Unpaid on approve | [08-debit-credit.md](./08-debit-credit.md) |
| VAT on proforma vs invoice | [14-vat-data.md](./14-vat-data.md) — invoice after approve |

---

## Data affected

| Action | Changes |
| --- | --- |
| Save order | `customer_orders`, lines — no stock |
| Approve | Creates `sale`, deducts `inventory`, may set customer debit |

---

## Fail notes

```
Issue:
Order #:
Steps:
Expected:
Actual:
```
