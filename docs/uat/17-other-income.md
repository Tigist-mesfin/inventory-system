# UAT — Other Income

**Route:** `/other-income`  
**Permission:** `finance:READ`

---

## Purpose

Record non-sales income (interest, scrap, miscellaneous). Included in income statement.

---

## Prerequisites

- Finance permission.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| OI1 | List other income | Historical entries | |
| OI2 | Add entry — amount, source/description, date | Saves | |
| OI3 | Edit / delete (if allowed) | List and totals update | |
| OI4 | Period total | Matches [11-income-statement.md](./11-income-statement.md) other income line | |
| OI5 | Does not create a sale | No stock change; not in Sales list | |
| OI6 | Salesman without finance | Cannot access | |

---

## Also verify (cross-module)

| Action | Check |
| --- | --- |
| Add other income 2,000 | Income statement net profit ↑ 2,000 |
| Does **not** affect | [04-sales.md](./04-sales.md), [07-live-stock.md](./07-live-stock.md), [14-vat-data.md](./14-vat-data.md) (unless VAT feature added later) |

---

## Data affected

`other_incomes` table.

---

## Fail notes

```
Issue:
Amount/date:
Expected:
Actual:
```
