# User Acceptance Test Guide

**Product:** Inventory Management System (wholesale desk)  
**Audience:** User acceptance testers (not developers)  
**Currency:** Ethiopian Birr (ETB)  
**VAT:** 15% on sales and purchases (shown on documents; stock cost is stored without VAT)

Use this file to know **how the shop is supposed to work**, **what to test**, and **how to report a problem**. Tick the boxes as you go. Write fail notes under each section.

> **Per-tab UAT guides (recommended):** For detailed checklists with **expected results** and **cross-module data checks** (e.g. debit & credit must match sales unpaid and supplier payables), use the files in **[`docs/uat/`](./uat/README.md)** — one markdown file per sidebar menu.

---

## 1. What this system is

This is a **company desk for a building-materials / wholesale shop**. Staff:

1. Register items and stores  
2. Buy stock from suppliers (purchase)  
3. Receive goods into a store (only then does stock increase)  
4. Sell to walk-in or registered customers  
5. Print invoices and proformas  
6. Track unpaid balances, wallets, VAT, and profit  

It is **not** a public online shop. Customers do not place their own orders. Staff record everything after login.

---

## 2. How to start testing

Ask the project owner for the live URL. Typical local setup:

| What | Where |
| --- | --- |
| Web app | `http://localhost:5173` |
| Demo company login | username **`abdu`** · password **`123456`** |
| Demo company | Abdu Building Materials (Merkato) |

Use the demo company unless you were given a fresh company to register.

**Before you start**

- Use a desktop browser **and** a phone-sized window (or a real phone). The desk is used on both.  
- Keep a notebook or this file. For every fail, record: **page name**, **what you did**, **what you expected**, **what happened**, and a **screenshot**.  
- Prefer **new** items / customers you create, so you can see stock and money change. Demo data already exists; do not assume an empty shop.

**Sign out** from the top of the side menu (desktop) or **More → Sign out** (phone).

---

## 3. Things you must understand before testing

If you skip this section, many “bugs” will be misunderstandings.

### 3.1 Stock is added only when a purchase is delivered

Saving a purchase **does not** put goods on the shelf.

| Step | What happens to stock |
| --- | --- |
| Save purchase | Order is recorded. Quantity in store **does not** change. |
| Mark delivered / delivered to store | Stock **increases**. A purchase lot (price on that buy) is stored. |
| Sell | Stock **decreases** from the store you chose. |

**Pass rule:** After save-purchase, Live stock must stay the same. After delivery, Live stock must go up.

### 3.2 Selling price and purchase price are different

- **Purchase price** on an item is only a **default** for the next buy.  
- Each purchase keeps **its own** unit price. Older lots are not overwritten.  
- **Selling price** is what the customer pays. It is separate from lot cost.  
- Profit uses the cost of the goods that were actually sold (from lots / average cost), not a guess.

### 3.3 VAT is 15%

- Line amounts in the catalog are **without VAT**.  
- Invoices, proformas, sales lists, and VAT reports show **VAT** and **total with VAT**.  
- Inventory **cost** stays without VAT.

**Example:** Item sold at 1,000 ETB (ex-VAT) → VAT 150 → customer total **1,150 ETB**.

### 3.4 Customers vs walk-in

| | Registered customer | Walk-in |
| --- | --- | --- |
| Chosen from | Customers list | Name typed on the sale |
| Wallet | Yes (recharge, then deduct on sale) | No |
| Unpaid remainder | Stays on that customer (debit) | Stays on that invoice only |
| Proforma / order | Yes | Yes (name + phone) |

### 3.5 Wallet vs direct pay vs unpaid (debit)

On a **sale** for a registered customer you choose:

1. **Direct payment** — cash, Telebirr, bank, etc. (payment methods you maintain).  
2. **Deduct from wallet** — money already deposited to that customer’s wallet.  
3. **Partial pay** — they pay some now; the rest is **unpaid / debit**.

**Wallet** is prepaid credit the customer gave you earlier.  
**Debit / remaining** is money the customer still owes you after a sale.  
These are **not** the same.

### 3.6 Proforma vs invoice

| Document | When | Meaning |
| --- | --- | --- |
| **Proforma** | Customer order is saved | Quotation / order sheet. **Not** a tax invoice. Stock is **not** deducted until the order is **approved**. |
| **Invoice** | Sale is saved/completed | Real sale. Stock is deducted. VAT, paid, and remaining are shown. |

### 3.7 One product per purchase / sale line

You cannot put the same item twice on one purchase or one sale. Use one line and increase quantity.

### 3.8 Roles (what a tester may not see)

The owner (`abdu`) sees almost everything.

A **salesman** may only see stores they are assigned to, and only menus they were given (for example sales but not purchasing).

**Company profile** and **Salesmen (team)** are owner-only.

If a menu is missing, check the login role before calling it a bug.

### 3.9 What this version does **not** do

Do not log these as bugs:

- Customer self-service / public catalog checkout  
- Returns and refunds of completed sales (cancel may exist for drafts / some completed sales; there is no “return goods” workflow)  
- Serial numbers  
- Stock sitting “in transit” between stores (transfer is one step: out of A, into B)  
- Negative stock (sale must fail if not enough available in that store)

---

## 4. Suggested test order (happy path)

Do this once end-to-end with **new** names so numbers are easy to follow.

1. Sign in as `abdu`.  
2. Set **Company profile** (name, phone, address, TIN if used).  
3. Confirm **Warehouses** (at least one store).  
4. Confirm **Payment methods** (Cash, Telebirr, transfer, …).  
5. Register a **Product** (name, unit, selling price, default purchase price).  
6. Register a **Supplier** (Customers & suppliers → type Supplier).  
7. **Buy** that item from the supplier → **Save purchase** → confirm stock **unchanged**.  
8. **Mark delivered** → confirm **Live stock** increased.  
9. Register a **Customer**.  
10. **Recharge wallet** (amount, payment method, reason, date).  
11. **New sale**: registered customer, **deduct from wallet**, complete → invoice shows VAT and Wallet.  
12. **New sale**: same or other customer, **direct pay**, partial amount → remaining on debit.  
13. **Customer order** → proforma **print** and **copy share link** → open link without being logged in (or in a private window).  
14. **Approve** the order → stock down, invoice created.  
15. Open **Sales** (this month / all sales), **Daily balance check**, **VAT**, **Reports**, **Income statement**.

Then test the extra cases in section 6.

---

## 5. Features to test (checklist)

Mark **Pass / Fail / Not tested**. Fail = unexpected behaviour after you understood section 3.

### A. Login, company, team

| # | Test | Pass? |
| --- | --- | --- |
| A1 | Login with correct username/password opens the dashboard | |
| A2 | Wrong password shows a clear error and does not enter the desk | |
| A3 | Sign out returns to login; back button does not show private data | |
| A4 | **Register your company** creates a new company and signs you in as owner | |
| A5 | **Company profile** name/phone/address/TIN appear on printed invoice and proforma | |
| A6 | **Salesmen**: create a staff user, assign store(s), set module access | |
| A7 | Login as that salesman: only allowed menus and stores appear | |
| A8 | Phone layout: bottom bar Home / Stock / Buy / Sell / More works | |

### B. Catalog (products)

| # | Test | Pass? |
| --- | --- | --- |
| B1 | Add item: name, unit, selling price, default purchase price | |
| B2 | Optional: brand, size, color, category | |
| B3 | Search / list shows the new item | |
| B4 | Edit selling price; next sale uses the new price (unless a customer special price exists) | |
| B5 | **Item history**: sales tab and purchases tab (when / qty / amounts) | |
| B6 | Cannot delete an item that already has purchases or sales (message, not a crash) | |

### C. Warehouses and live stock

| # | Test | Pass? |
| --- | --- | --- |
| C1 | Add a second store with a clear name | |
| C2 | **Live stock** shows quantity **per store** | |
| C3 | Stock is zero (or unchanged) until a purchase is **delivered** | |
| C4 | After a sale from store A, only store A quantity falls | |

### D. Purchasing (buy)

| # | Test | Pass? |
| --- | --- | --- |
| D1 | Create purchase: supplier, items, qty, unit price | |
| D2 | VAT summary on the purchase form is 15% | |
| D3 | Save purchase: list shows the order as **not delivered** (or equivalent) | |
| D4 | Live stock **did not** increase | |
| D5 | Mark **delivered to store**: choose warehouse; stock increases there | |
| D6 | Same item bought later at a **different** unit price: both prices remain in history / lot list | |
| D7 | Cannot receive more than ordered | |
| D8 | Partial payment to supplier; remaining payable shows on ledger / dashboard | |
| D9 | Cannot put the same product twice on one purchase | |

### E. Transfers

| # | Test | Pass? |
| --- | --- | --- |
| E1 | Transfer qty from store A to store B in one step | |
| E2 | A decreases, B increases by the same qty | |
| E3 | Cannot transfer more than available in A | |
| E4 | Source and destination stores must be different | |

### F. Customers, suppliers, wallets

| # | Test | Pass? |
| --- | --- | --- |
| F1 | Register customer (name, phone, address) | |
| F2 | Register supplier as a party (type Supplier) | |
| F3 | **Customer wallets**: recharge with **method + reason + date** | |
| F4 | Balance list shows the new wallet amount | |
| F5 | History row: date, customer, type Deposit, method, reason, amount | |
| F6 | Sale **deduct from wallet**: wallet falls by the paid amount | |
| F7 | History shows a **Sale deduct** (and invoice number if shown) | |
| F8 | Cannot deduct more than the wallet (clear error) | |
| F9 | Walk-in sale has **no** wallet option | |
| F10 | Record **debit payment** (customer pays remaining invoice) — debt goes down; this is **not** a wallet recharge | |

### G. Direct sales (Sell)

| # | Test | Pass? |
| --- | --- | --- |
| G1 | New sale: choose store, registered customer or walk-in | |
| G2 | Each line shows **available qty in that store** | |
| G3 | Cannot sell more than available | |
| G4 | **Direct payment**: choose method; enter amount paid | |
| G5 | Paid = full total → invoice **Paid in full** | |
| G6 | Paid < total (registered customer) → remaining on customer debit | |
| G7 | **Deduct from wallet** (registered, wallet > 0) | |
| G8 | Review screen: qty, price, amount, VAT, total with VAT | |
| G9 | After save: invoice opens; stock decreased | |
| G10 | Print invoice: company header, VAT columns, grand total, paid, remaining, footer *Designed by Abyssinia Software Inventory / 0951050364* | |

### H. Sales list, daily balance, VAT

| # | Test | Pass? |
| --- | --- | --- |
| H1 | Period tabs: Today, Yesterday, This week, This month, This year, All sales, Date range | |
| H2 | Default **This month** (Today can be empty if no sales today — that is OK) | |
| H3 | Totals by payment method; click a method to filter | |
| H4 | Line list: item, selling price, qty, without VAT, with VAT, purchase price, customer, salesman, method | |
| H5 | Filters: item, customer (including walk-in), payment method, salesman | |
| H6 | **Daily balance check**: today’s item totals, deposits by method, paid vs unpaid | |
| H7 | Click unpaid → customers, outstanding, what they bought | |
| H8 | **VAT** panel: sales VAT vs purchase VAT, monthly / each sale / each purchase, date range | |

### I. Customer orders and proforma

| # | Test | Pass? |
| --- | --- | --- |
| I1 | New order: registered or walk-in (name + phone), delivery date, items | |
| I2 | Save opens **proforma** (or Proforma button on the list does) | |
| I3 | Proforma shows company, customer, VAT lines, grand total | |
| I4 | Print layout is readable; footer credit and phone present | |
| I5 | **Copy share link** / WhatsApp / Share | |
| I6 | Open share link in a **private window** (no login): same proforma, VAT visible | |
| I7 | Invalid / broken link shows a clear error, not a blank crash | |
| I8 | Proforma text: this is **not** a tax invoice until approved | |
| I9 | **Approve**: warehouse, payment method, amount paid, on loading or delivered | |
| I10 | After approve: stock deducted; a sale/invoice exists | |
| I11 | Pending order does **not** reduce stock | |
| I12 | Mark delivered later if approved as on loading | |

### J. Debit & credit (ledger)

| # | Test | Pass? |
| --- | --- | --- |
| J1 | Credit tab: customers who still owe | |
| J2 | Collect payment against customer or a specific invoice | |
| J3 | Debit tab: amounts still owed to suppliers | |
| J4 | Pay a purchase remaining balance | |
| J5 | Dashboard “customer credit” / “supplier payables” move in the same direction | |

### K. Reports, profit, income, expenses, AI

| # | Test | Pass? |
| --- | --- | --- |
| K1 | **Reports**: sales and purchases by date / item / lines; VAT columns | |
| K2 | Profit/margin uses purchase cost and selling price | |
| K3 | Print report if a Print button is shown | |
| K4 | **Expenses**: add rent/salary/other; appears in the list | |
| K5 | **Income statement**: sales, cost of goods, expenses, net profit for a period | |
| K6 | **AI desk**: ask a simple question in English (and optionally Amharic / Afaan Oromo) about today’s sales or stock; answer is plausible, not a crash | |
| K7 | Dashboard cards load (today/week sales, credit, payables, low stock if any) | |

### L. Payment methods

| # | Test | Pass? |
| --- | --- | --- |
| L1 | Add a method (e.g. Telebirr) | |
| L2 | It appears on sale, wallet recharge, and supplier payment | |
| L3 | Inactive method no longer offered on new payments | |

---

## 6. Extra cases (try to break it)

These are more important than happy-path clicks.

| # | Try this | Expected |
| --- | --- | --- |
| X1 | Sell with qty 0 or blank | Blocked, clear message |
| X2 | Sell more than stock | Blocked |
| X3 | Wallet pay with wallet 0 | Blocked; told to recharge |
| X4 | Pay more than invoice remaining | Blocked |
| X5 | Duplicate product on one sale | Blocked |
| X6 | Transfer same store → same store | Blocked |
| X7 | Deliver purchase twice | Should not double stock |
| X8 | Two browsers: two staff selling the last 1 unit | One succeeds; the other gets “not enough stock” |
| X9 | Refresh in the middle of a sale form | You may lose unsaved lines (note if that is acceptable) |
| X10 | Phone: long item names, many lines, print preview | Usable, not cut off |
| X11 | Very large amount (e.g. 1,000,000.55) | Two decimal places, no float garbage like `1.1500000001` |
| X12 | Customer name in Amharic | Saves and prints |

---

## 7. What “correct” looks like (quick numbers)

Use a calculator. VAT rate is **15%**.

| Without VAT | VAT | With VAT |
| ---: | ---: | ---: |
| 100.00 | 15.00 | 115.00 |
| 1,000.00 | 150.00 | 1,150.00 |
| 333.33 | 50.00 | 383.33 |

After a **wallet deposit of 5,000** and a **wallet sale of 1,150** (1,000 + VAT): wallet should be **3,850**.

After **buy 10** delivered, then **sell 3**: live stock **7** in that store.

---

## 8. Screens the tester should open at least once

| Menu | UAT file | Why |
| --- | --- | --- |
| Dashboard (Home) | [uat/01-dashboard.md](./uat/01-dashboard.md) | Today’s picture |
| AI desk | [uat/02-ai-desk.md](./uat/02-ai-desk.md) | AI summaries & insights |
| AI assistant | [uat/03-ai-assistant.md](./uat/03-ai-assistant.md) | Ask questions |
| Sales | [uat/04-sales.md](./uat/04-sales.md) | History, VAT, daily balance |
| Customer orders | [uat/05-customer-orders.md](./uat/05-customer-orders.md) | Proforma |
| Purchasing (Buy) | [uat/06-purchasing.md](./uat/06-purchasing.md) | Orders and delivery |
| Live stock | [uat/07-live-stock.md](./uat/07-live-stock.md) | On-hand after buy/sell/transfer |
| Debit & credit | [uat/08-debit-credit.md](./uat/08-debit-credit.md) | Unpaid — **match sales & purchases** |
| Customers & suppliers | [uat/09-customers-suppliers.md](./uat/09-customers-suppliers.md) | Parties |
| Customer wallets | [uat/10-customer-wallets.md](./uat/10-customer-wallets.md) | Deposits (not invoice debt) |
| Income statement | [uat/11-income-statement.md](./uat/11-income-statement.md) | Period profit |
| Salesmen | [uat/12-salesmen-team.md](./uat/12-salesmen-team.md) | Staff access |
| Products | [uat/13-products-catalog.md](./uat/13-products-catalog.md) | Item master + history |
| VAT data | [uat/14-vat-data.md](./uat/14-vat-data.md) | VAT reconciliation |
| Reports | [uat/15-reports.md](./uat/15-reports.md) | Date / item / profit |
| Expenses | [uat/16-expenses.md](./uat/16-expenses.md) | Costs |
| Other income | [uat/17-other-income.md](./uat/17-other-income.md) | Non-sales income |
| Warehouses | [uat/18-warehouses.md](./uat/18-warehouses.md) | Stores |
| Transfers | [uat/19-transfers.md](./uat/19-transfers.md) | Move between stores |
| Payment methods | [uat/20-payment-methods.md](./uat/20-payment-methods.md) | Cash / mobile / bank |
| Company profile | [uat/21-company-profile.md](./uat/21-company-profile.md) | Print header |
| Login / register | [uat/00-auth-login-register.md](./uat/00-auth-login-register.md) | Access |

---

## 9. How to report a finding

Copy this for each issue:

```text
Title:
Severity: Blocker / Major / Minor / Suggestion
Page / menu:
Login used: (abdu / salesman name)
Device: (desktop Chrome / phone …)
Steps:
1.
2.
3.
Expected:
Actual:
Screenshot: (yes/no)
```

**Blocker** — cannot complete buy → deliver → sell, or money/stock is wrong.  
**Major** — a main screen is empty when it should have data, print missing VAT, wallet not deducting.  
**Minor** — wording, layout, slow but correct.  
**Suggestion** — nicer UX, not a defect.

---

## 10. Sign-off

Tester name: _______________________  
Date: _______________________  
Environment / URL: _______________________  

| Area | Result |
| --- | --- |
| Login & company | Pass / Fail |
| Catalog & stock | Pass / Fail |
| Purchasing & delivery | Pass / Fail |
| Sales (direct + wallet) | Pass / Fail |
| Orders & proforma | Pass / Fail |
| Debit, VAT, reports | Pass / Fail |
| Print & share | Pass / Fail |
| Roles (if tested) | Pass / Fail / N/A |

Overall: **Ready for users** / **Ready with minor issues** / **Not ready**

Comments:

________________________________________________________________

________________________________________________________________
