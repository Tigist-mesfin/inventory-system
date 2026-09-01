# UAT — VAT Data

**Route:** `/vat`  
**Permission:** sales, purchasing, finance, or insights READ

---

## Purpose

VAT reporting: sales VAT collected vs purchase VAT paid, by month, by transaction, with date filters.

---

## Prerequisites

- Completed sales and delivered purchases with VAT at 15%.
- Know test amounts (ex-VAT × 0.15 = VAT).

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| V1 | Page loads | Sales VAT and purchase VAT sections | |
| V2 | Monthly summary | Each month shows sales VAT, purchase VAT, net (if shown) | |
| V3 | Per-sale detail | Each completed sale listed with ex-VAT, VAT, total | |
| V4 | Per-purchase detail | Each delivered purchase with VAT columns | |
| V5 | Date range filter | Totals recalculate for range only | |
| V6 | Single sale check | 1,000 ex-VAT → VAT **150**, total **1,150** | |
| V7 | Sum of line VAT | Matches section total | |
| V8 | Invoice print VAT | Same numbers as VAT page for that invoice | |
| V9 | Proforma VAT | Matches order lines before approve | |
| V10 | Stock cost without VAT | Inventory cost in [07-live-stock.md](./07-live-stock.md) excludes VAT | |

---

## Also verify (cross-module)

| VAT figure | Must match |
| --- | --- |
| Sale line VAT | [04-sales.md](./04-sales.md) same invoice |
| Purchase VAT | [06-purchasing.md](./06-purchasing.md) same PO |
| Reports VAT columns | [15-reports.md](./15-reports.md) |
| AI question "VAT today" | [03-ai-assistant.md](./03-ai-assistant.md) |

### Quick calculator

| Ex-VAT | VAT 15% | With VAT |
| ---: | ---: | ---: |
| 100.00 | 15.00 | 115.00 |
| 1,000.00 | 150.00 | 1,150.00 |
| 333.33 | 50.00 | 383.33 |

---

## Data affected

Read-only report.

---

## Fail notes

```
Issue:
Document #:
Expected VAT:
Actual VAT:
```
