# User Acceptance Testing — Per-Tab Guides

**Product:** Inventory Management System (wholesale desk)  
**Audience:** UAT testers, shop owners, trainers  
**Currency:** Ethiopian Birr (ETB) · **VAT:** 15%

This folder contains **one markdown file per menu tab**. Use them together with the main overview in [`../USER_ACCEPTANCE_TEST_GUIDE.md`](../USER_ACCEPTANCE_TEST_GUIDE.md).

---

## How to use these files

1. Read the main guide first (sections 1–3): stock rules, wallet vs debit, VAT, roles.
2. Run the **happy path** once end-to-end (main guide section 4).
3. Open each tab file below and tick **Pass / Fail / N/A** as you go.
4. For every test, complete the **Also verify** section — numbers must match across tabs.
5. Report failures using the template in the main guide (section 9).

**Demo login (unless told otherwise):** username `abdu` · password `123456`

---

## Tab index (sidebar order)

| # | Menu tab | UAT file | Primary data touched |
| --- | --- | --- | --- |
| — | Login & register | [00-auth-login-register.md](./00-auth-login-register.md) | Users, company |
| 1 | Dashboard | [01-dashboard.md](./01-dashboard.md) | Aggregates from sales, purchases, stock, ledger |
| 2 | AI desk | [02-ai-desk.md](./02-ai-desk.md) | Read-only summaries (sales, stock, profit) |
| 3 | AI assistant | [03-ai-assistant.md](./03-ai-assistant.md) | Read-only SQL answers |
| 4 | Sales | [04-sales.md](./04-sales.md) | Sales, stock, VAT, customer debit, wallet |
| 5 | Customer orders | [05-customer-orders.md](./05-customer-orders.md) | Orders, proforma, stock (on approve) |
| 6 | Purchasing | [06-purchasing.md](./06-purchasing.md) | PO, stock (on deliver), supplier payable |
| 7 | Live stock | [07-live-stock.md](./07-live-stock.md) | Inventory quantities & cost |
| 8 | Debit & credit | [08-debit-credit.md](./08-debit-credit.md) | Customer receivables, supplier payables |
| 9 | Customers & suppliers | [09-customers-suppliers.md](./09-customers-suppliers.md) | Party master |
| 10 | Customer wallets | [10-customer-wallets.md](./10-customer-wallets.md) | Prepaid wallet balance |
| 11 | Income statement | [11-income-statement.md](./11-income-statement.md) | Sales, COGS, expenses, other income |
| 12 | Salesmen | [12-salesmen-team.md](./12-salesmen-team.md) | Users, roles, permissions |
| 13 | Products | [13-products-catalog.md](./13-products-catalog.md) | Product master, item history |
| 14 | VAT data | [14-vat-data.md](./14-vat-data.md) | Sales & purchase VAT |
| 15 | Reports | [15-reports.md](./15-reports.md) | Sales, purchases, profit |
| 16 | Expenses | [16-expenses.md](./16-expenses.md) | Operating expenses |
| 17 | Other income | [17-other-income.md](./17-other-income.md) | Non-sales income |
| 18 | Warehouses | [18-warehouses.md](./18-warehouses.md) | Store locations |
| 19 | Transfers | [19-transfers.md](./19-transfers.md) | Stock between warehouses |
| 20 | Payment methods | [20-payment-methods.md](./20-payment-methods.md) | Cash, Telebirr, bank, etc. |
| 21 | Company profile | [21-company-profile.md](./21-company-profile.md) | Print header, TIN |

---

## Cross-module dependency matrix

When you test a feature, **always reconcile numbers** in the related tabs.

| You change… | Must also check… | What must match |
| --- | --- | --- |
| **Purchase saved** | Live stock | Stock **unchanged** until delivered |
| **Purchase delivered** | Live stock, Products → history, Reports, VAT, Income statement | Qty ↑, purchase cost, purchase VAT |
| **Sale completed** | Live stock, Sales list, Invoice, VAT, Dashboard, Income statement, Reports | Qty ↓, revenue, VAT, profit |
| **Sale partial pay** | Debit & credit (Credit tab), Sales unpaid filter, Dashboard customer credit | `remaining = total − paid` per invoice |
| **Customer payment collected** | Debit & credit, Sales invoice remaining, Dashboard credit | Customer total debt ↓ by payment amount |
| **Wallet recharge** | Customer wallets balance & history | Balance ↑; **not** customer debit |
| **Sale — deduct wallet** | Customer wallets, Invoice | Wallet ↓; sale shows wallet method |
| **Supplier payment** | Debit & credit (Debit tab), Purchasing unpaid | Supplier payable ↓ |
| **Customer order approved** | Live stock, Sales, Invoice, Proforma | Stock ↓; sale created |
| **Transfer completed** | Live stock (both warehouses) | Source ↓, destination ↑, same qty |
| **Expense recorded** | Income statement, Dashboard (if shown) | Expense total in period |
| **Other income recorded** | Income statement | Other income in period |
| **Product price edit** | Next sale / order line default | New sales use new price |
| **Salesman role/warehouse** | Menus visible, data scoped to assigned stores | No cross-store leakage |

---

## Number accuracy rules (all tabs)

Use a calculator. All money should show **two decimal places**.

| Rule | Example |
| --- | --- |
| VAT = 15% of ex-VAT amount | 1,000.00 → VAT 150.00 → total 1,150.00 |
| Invoice remaining | `totalWithVat − paidAmount` |
| Customer credit total | Sum of all open invoice `remaining` for that customer |
| Supplier debit total | Sum of unpaid purchase balances |
| Wallet balance | Deposits − sale deductions ± adjustments |
| Stock after buy 10, sell 3 | On-hand = **7** in that warehouse |
| Profit (line) | Selling price − cost of goods sold (from lots / average) |

---

## Role-based testing (minimum)

| Login | Test at least |
| --- | --- |
| **Owner** (`abdu`) | All tabs |
| **Salesman** (limited) | Only assigned menus; only assigned warehouse stock/sales |

Create a salesman with: Sales READ+CREATE, one warehouse, **no** purchasing — confirm purchasing and company profile are hidden and stock in other stores is not visible.

---

## Sign-off checklist

| Area | File | Pass / Fail / N/A |
| --- | --- | --- |
| Auth | 00 | |
| Dashboard | 01 | |
| AI desk | 02 | |
| AI assistant | 03 | |
| Sales | 04 | |
| Customer orders | 05 | |
| Purchasing | 06 | |
| Live stock | 07 | |
| Debit & credit | 08 | |
| Customers & suppliers | 09 | |
| Customer wallets | 10 | |
| Income statement | 11 | |
| Salesmen | 12 | |
| Products | 13 | |
| VAT data | 14 | |
| Reports | 15 | |
| Expenses | 16 | |
| Other income | 17 | |
| Warehouses | 18 | |
| Transfers | 19 | |
| Payment methods | 20 | |
| Company profile | 21 | |

**Tester:** _______________ **Date:** _______________ **Overall:** Ready / Not ready
