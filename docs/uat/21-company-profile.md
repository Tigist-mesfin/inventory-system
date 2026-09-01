# UAT — Company Profile

**Route:** `/company-profile`  
**Permission:** **Company owner only**

---

## Purpose

Company legal/display info: name, phone, address, TIN, logo (if supported). Prints on invoices and proformas.

---

## Prerequisites

- Logged in as owner.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| CP1 | Open page as owner | Form loads with current data | |
| CP2 | Salesman cannot access | Redirect or forbidden | |
| CP3 | Edit company name | Saves; sidebar brand updates | |
| CP4 | Edit phone, address, TIN | Saves | |
| CP5 | Print invoice after edit | **New** header shows updated fields | |
| CP6 | Print proforma | Same header | |
| CP7 | Public invoice/proforma link | Company info visible | |
| CP8 | Logo upload (if available) | Shows on print | |
| CP9 | Invalid / empty required fields | Validation message | |

---

## Also verify (cross-module)

| Profile field | Visible on |
| --- | --- |
| Company name | Sidebar, [04-sales.md](./04-sales.md) invoice, [05-customer-orders.md](./05-customer-orders.md) proforma |
| TIN | VAT documents, [14-vat-data.md](./14-vat-data.md) context |
| Phone/address | Invoice footer/header |

Changes do **not** alter past transaction amounts — only document display.

---

## Data affected

`companies` record for logged-in company only.

---

## Fail notes

```
Issue:
Field changed:
Expected on print:
Actual on print:
```
