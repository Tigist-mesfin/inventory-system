# Inventory Management System — Backend

Node.js + Express + Sequelize (MySQL) API for inventory, purchasing, sales, warehouses, and RBAC.

## Features (domain)

- **Auth / RBAC** — username + password, JWT in httpOnly cookies, Role → Permission authorization
- **Catalog** — categories, products, suppliers
- **Warehouse** — multi-warehouse stock locations
- **Inventory** — per product × warehouse balances, stock ledger, adjustments, transfers
- **Purchasing** — purchase orders and stock receipts
- **Sales** — sales / invoices with stock deduction
- **Audit** — business/security audit log

Business modules are scaffolded under `src/modules/` and implemented incrementally.

## Tech stack

Express 5 · Sequelize (MySQL) · JWT cookies · Joi · Multer · bcrypt · Nodemailer (optional)

## Project structure

```text
src/
├── app.js, server.js
├── config/                 env, DB, email, migrations CLI config
├── database/
│   ├── models/             IMS Sequelize models
│   ├── migrations/         sequelize-cli migrations
│   └── seeders/            admin + document sequences
├── shared/                 errors, helpers, middlewares, upload, email
└── modules/
    ├── auth/               user, role, permission, role-permission
    ├── catalog/            category, product, supplier
    ├── warehouse/
    ├── inventory/          inventory, stock-transaction, adjustment, transfer
    ├── purchasing/         purchase-order, stock-receipt
    ├── sales/
    └── audit/
```

## Getting started

```bash
npm install
cp .env.example .env
# set DB_*, JWT_*_SECRET, ADMIN_SEED_*
npm run migrate   # preferred for schema
npm run dev       # development also syncs models when NODE_ENV=development
```

Health check: `GET /health`. Root: `GET /`.

## Web app (React)

A mobile-first wholesale desk lives in `client/`.

```bash
npm run migrate
npm run dev          # API on PORT from .env (default 3000)
npm run client       # UI on http://localhost:5173
```

Sign in with the seeded admin username/password. The Vite proxy forwards `/api` to the backend and keeps httpOnly auth cookies.

## Environment

## Environment

| Group | Variables |
| --- | --- |
| App | `NODE_ENV`, `PORT`, `APP_URL`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, `COOKIE_SECURE` |
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` |
| Admin seed | `ADMIN_SEED_FULLNAME`, `ADMIN_SEED_USERNAME`, `ADMIN_SEED_PASSWORD`, `ADMIN_SEED_PHONE` |
| Email (optional) | `SMTP_*`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS` |

## Auth

Identity is **username + password**. Tokens are set as httpOnly cookies (`accessToken`, `refreshToken`), not Bearer headers.

Authorization uses **Role → Permission** (`module` + `action`). Prefer `authorizePermission("sales:CREATE")` over legacy role-name checks.

## License

ISC
