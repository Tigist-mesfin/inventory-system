# UAT — Customers & Suppliers

**Route:** `/customers`  
**Permission:** `customers:READ`

---

## Purpose

Register **customers** (buy from you) and **suppliers** (you buy from). Master data for sales, purchases, wallets, and ledger.

---

## Prerequisites

- None for basic CRUD.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| C1 | Add customer — name, phone, address | Saves; appears in list | |
| C2 | Add supplier — type Supplier | Saves; available on purchase form | |
| C3 | Search / list | Finds by name or phone | |
| C4 | Edit customer details | Updates; future sales use new info | |
| C5 | Customer appears on sale form | Registered customer picker | |
| C6 | Supplier appears on purchase form | Supplier picker | |
| C7 | Customer with open debit | Still listed; debt shown in ledger, not here necessarily | |
| C8 | Delete / deactivate (if available) | Blocked if has sales/orders, or soft-inactive | |
| C9 | Amharic / special characters in name | Saves and prints on invoice | |
| C10 | Duplicate phone (if restricted) | Policy enforced or allowed consistently | |

---

## Also verify (cross-module)

| Party type | Used in |
| --- | --- |
| Customer | [04-sales.md](./04-sales.md), [05-customer-orders.md](./05-customer-orders.md), [10-customer-wallets.md](./10-customer-wallets.md), [08-debit-credit.md](./08-debit-credit.md) |
| Supplier | [06-purchasing.md](./06-purchasing.md), [08-debit-credit.md](./08-debit-credit.md) |

Changing customer name does **not** change past invoice totals — only display on new documents.

---

## Data affected

`customers` table (party master). Does not by itself change stock or money.

---

## Fail notes

```
Issue:
Party name:
Steps:
Expected:
Actual:
```
