# UAT — Sales

**Routes:** `/sell`, `/sell/new`, `/sell/:id`, `/sell/:id/edit`, `/sell/import`  
**Permission:** `sales:READ` (create/edit need CREATE/UPDATE)

---

## Purpose

Record sales, view sales history, filter by period/payment/customer, daily balance check, open/print invoices.

---

## Prerequisites

- Products with stock in at least one warehouse.
- Payment methods configured.
- Registered customer (for wallet/debit tests) and walk-in test.

---

## Features to test

### New sale

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| S1 | New sale — choose warehouse | Only stock from selected store shown | |
| S2 | Registered customer | Customer list loads; wallet option if balance > 0 | |
| S3 | Walk-in | Type name; no wallet option | |
| S4 | Line: available qty shown | Cannot exceed available in that warehouse | |
| S5 | Sell more than stock | Blocked with clear message | |
| S6 | Duplicate product on same sale | Blocked | |
| S7 | Direct payment — full pay | Invoice: Paid in full; remaining = 0 | |
| S8 | Direct payment — partial (registered) | Remaining = total − paid; appears on debit | |
| S9 | Deduct from wallet | Wallet reduced; invoice shows wallet payment | |
| S10 | Wallet insufficient | Blocked; message to recharge | |
| S11 | Review screen | Qty, unit price, line amount, VAT 15%, total with VAT | |
| S12 | Complete sale | Invoice opens; stock decreased in that warehouse | |
| S13 | Print invoice | Company header, VAT columns, paid, remaining, footer credit | |
| S14 | Public invoice link (if shared) | Opens without login; same totals | |
| S15 | Edit draft sale (if supported) | Changes saved; stock not moved until complete | |
| S16 | Cancel draft | No stock impact | |

### Sales list & filters

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| S17 | Period tabs | Today, Yesterday, Week, Month, Year, All, Date range | |
| S18 | Default period | This month (or as designed) | |
| S19 | Totals by payment method | Sum matches line list for filtered period | |
| S20 | Click payment method filter | List filters correctly | |
| S21 | Filters: item, customer, walk-in, salesman | Results correct | |
| S22 | Columns: selling price, qty, ex-VAT, with VAT | Math: with VAT = ex-VAT × 1.15 (per line rules) | |
| S23 | Purchase price & profit columns | Visible for owner/finance READ; hidden for plain salesman if restricted | |
| S24 | Daily balance check | Today's item totals, deposits by method, paid vs unpaid | |
| S25 | Daily balance — unpaid drill-down | Lists customers with outstanding and what they bought | |

### Import (if used)

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| S26 | Import sales spreadsheet | Valid rows create sales; invalid rows reported | |

---

## Also verify (cross-module) — **critical**

| Sale action | Must match in |
| --- | --- |
| Stock −qty | [07-live-stock.md](./07-live-stock.md) — same warehouse |
| Unpaid remaining | [08-debit-credit.md](./08-debit-credit.md) Credit tab — same invoice & customer |
| Wallet deduction | [10-customer-wallets.md](./10-customer-wallets.md) — Sale deduct row |
| VAT amounts | [14-vat-data.md](./14-vat-data.md) — same sale in VAT report |
| Revenue & profit | [15-reports.md](./15-reports.md), [11-income-statement.md](./11-income-statement.md) |
| Dashboard sales cards | [01-dashboard.md](./01-dashboard.md) |
| Item movement | [13-products-catalog.md](./13-products-catalog.md) → Item history → Sales tab |

### Number reconciliation example

Sale: 1,000 ETB ex-VAT, customer pays 500 cash, registered customer.

| Field | Value |
| --- | --- |
| VAT | 150.00 |
| Total with VAT | 1,150.00 |
| Paid | 500.00 |
| Remaining | 650.00 |

Check: Debit & credit shows **650** for that invoice; customer total credit includes **650**.

---

## Data affected

| Action | Changes |
| --- | --- |
| Complete sale | `sales`, `sale_items`, `inventory` ↓, `stock_transactions`, customer `remaining` if partial, wallet if used |
| Record payment on invoice | `sales.paidAmount` ↑, `remaining` ↓ |

---

## Common mistakes (not bugs)

- Walk-in unpaid does not create a "customer" debit row — only that invoice.
- Wallet is prepaid credit, not the same as unpaid invoice balance.

---

## Fail notes

```
Issue:
Sale invoice #:
Steps:
Expected:
Actual:
```
