# UAT — Login & Register

**Routes:** `/login`, `/register`  
**Who can access:** Everyone (public)

---

## Purpose

Staff sign in with **username + password**. New companies can self-register and become the **company owner**.

---

## Prerequisites

- Backend and frontend running.
- Demo account available, or ability to register a fresh company.

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| A1 | Login with correct username/password | Dashboard opens; company name shown in sidebar | |
| A2 | Wrong password | Clear error; stays on login; no private data shown | |
| A3 | Empty username or password | Validation message; cannot submit | |
| A4 | Sign out (sidebar or More → Sign out) | Returns to login; browser back does not show protected pages | |
| A5 | Register new company | Company created; logged in as owner; empty/minimal dashboard | |
| A6 | Register duplicate username | Clear error (username taken) | |
| A7 | Session refresh / reopen tab | Still logged in (cookie) until sign out or expiry | |
| A8 | Open `/sell` while logged out | Redirect to login | |

---

## Also verify (cross-module)

| After this action | Check |
| --- | --- |
| New company registered | Company profile empty; can add warehouse, products, payment methods |
| Owner login | All owner menus visible (Company profile, Salesmen) |
| Salesman login (see [12-salesmen-team.md](./12-salesmen-team.md)) | Only permitted menus; data scoped to company and assigned warehouses |

---

## Data affected

| Action | Affects |
| --- | --- |
| Register | `companies`, `users`, default role/permissions |
| Login | Session cookies only (no business data change) |

---

## Common mistakes (not bugs)

- Phone number is **contact only** — login is username, not phone.
- Salesman missing a menu = permissions, not a defect (see team setup).

---

## Fail notes

```
Issue:
Steps:
Expected:
Actual:
```
