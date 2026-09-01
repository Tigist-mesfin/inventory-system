# UAT — Payment Methods

**Route:** `/payment-methods`  
**Permission:** `sales:READ`

---

## Purpose

Maintain payment methods (Cash, Telebirr, Bank transfer, etc.) used on sales, wallet recharge, and supplier payments.

---

## Prerequisites

- Sales permission.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| PM1 | List methods | Active methods shown | |
| PM2 | Add new method — e.g. "Telebirr" | Saves | |
| PM3 | Appears on new sale | Payment method dropdown | |
| PM4 | Appears on wallet recharge | [10-customer-wallets.md](./10-customer-wallets.md) | |
| PM5 | Appears on supplier payment | [08-debit-credit.md](./08-debit-credit.md) | |
| PM6 | Deactivate / inactive method | Not offered on **new** payments; old records keep name | |
| PM7 | Sales totals by method | [04-sales.md](./04-sales.md) daily balance groups by method | |
| PM8 | Reactivate method | Available again on new transactions | |

---

## Also verify (cross-module)

| Method change | Effect |
| --- | --- |
| New method added | Immediately on sale/wallet/ledger forms |
| Inactive method | Hidden on new forms only; historical sales unchanged |

---

## Data affected

`payment_methods` configuration.

---

## Fail notes

```
Issue:
Method name:
Steps:
Expected:
Actual:
```
