# UAT — Salesmen (Team)

**Route:** `/team`  
**Permission:** **Company owner only**

---

## Purpose

Create staff users (salesmen), assign **warehouses**, grant **module permissions** (READ, CREATE, UPDATE, DELETE, APPROVE).

---

## Prerequisites

- Logged in as company owner.
- At least two warehouses for scoping tests.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| T1 | List team members | Shows owner and staff | |
| T2 | Create salesman — username, password, name | User created under same company | |
| T3 | Assign warehouse(s) | One or more stores selected | |
| T4 | Set module permissions | e.g. sales READ+CREATE, no purchasing | |
| T5 | Grant APPROVE on sales | Can approve customer orders | |
| T6 | Login as new salesman | Only allowed sidebar menus visible | |
| T7 | Salesman sees only assigned warehouse stock | [07-live-stock.md](./07-live-stock.md), sale form | |
| T8 | Salesman cannot open `/company-profile` | Redirect or blocked | |
| T9 | Salesman cannot open `/team` | Blocked | |
| T10 | Salesman with purchasing READ | Sees company purchases (not other companies) | |
| T11 | Salesman without CREATE | New sale button hidden/disabled | |
| T12 | Edit permissions | Change takes effect on next login/session | |
| T13 | Deactivate user (if available) | Cannot login | |

---

## Also verify (cross-module)

| Permission | Effect on |
| --- | --- |
| `sales:READ` only | View sales, no new sale |
| `sales:CREATE` | [04-sales.md](./04-sales.md) new sale |
| `sales:APPROVE` | [05-customer-orders.md](./05-customer-orders.md) approve |
| `purchasing:READ` | [06-purchasing.md](./06-purchasing.md) view |
| `finance:READ` | [11-income-statement.md](./11-income-statement.md), profit columns |
| Warehouse assignment | All stock/sales scoped to those stores |

---

## Data affected

`users`, role permissions, user–warehouse links.

---

## Fail notes

```
Issue:
Salesman username:
Permission set:
Steps:
Expected:
Actual:
```
