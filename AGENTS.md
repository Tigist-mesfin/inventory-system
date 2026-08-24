# Inventory Management System — Agent Instructions

You are working on a **Node.js + Express 5 + Sequelize (MySQL) + CommonJS** Inventory Management System backend.

The repository has been cleaned of the old Abyssinia Authenticate product. Do not restore QR, scan, subscription, OTP, GeezSMS, or email-login behavior.

Architecture, domain, and v1 decisions are recorded in `docs/DOMAIN_AUDIT_AND_DECISIONS.md`. Treat that document plus this file as the source of truth.

## Current state

- **Models:** 22 Sequelize models (IMS domain + `DocumentSequence`). Associations are defined; use only existing aliases.
- **Modules:** Scaffolded under `src/modules/` (empty placeholders). `src/modules/index.js` currently mounts **no** domain routers — register routes as you implement them.
- **Auth identity:** username + password. JWT in httpOnly cookies (`accessToken`, `refreshToken`).
- **RBAC:** User → Role → RolePermission → Permission (`module` + `action`). Use `authorizePermission`, never old `USER`/`ADMIN` string gates.
- **Schema:** Migrations live in `src/database/migrations/`. Prefer `npm run migrate`. Development may still `sync({ alter: false })` on boot — do not use `sync({ alter: true })`.

## Before writing code

Inspect the existing architecture. Do **not** rewrite shared utilities. Do **not** invent new models (lots, serials, returns, reservations, customers, payments) unless the user explicitly approves a schema change.

Read as needed:

- `package.json`, `README.md`, `index.js`, `src/app.js`, `src/server.js`
- `src/config/*`
- `src/database/connection.js`, `src/database/index.js`, `src/database/models/index.js`
- relevant Sequelize models (verify aliases, FKs, uniques)
- `src/shared/**`
- existing module files you are extending
- migrations and `src/database/seeders/seedAdmin.js`

## Architecture

```text
src/
├── app.js, server.js
├── config/
├── database/
│   ├── models/     auth, catalog, warehouse, inventory, purchasing, sales, audit, system
│   ├── migrations/
│   └── seeders/
├── modules/
│   ├── auth/           user, role, permission, role-permission
│   ├── catalog/        category, product, supplier
│   ├── warehouse/      warehouse
│   ├── inventory/      inventory, stock-transaction, stock-adjustment, stock-transfer
│   ├── purchasing/     purchase-order, stock-receipt
│   ├── sales/          sale
│   ├── audit/          audit-log
│   └── webhooks/       empty stub; do not revive SMS/payment webhooks
└── shared/             errors, helpers, middlewares, upload, email, services
```

Standard module flow:

```text
route → validation → controller → service → repository → Sequelize model → database
```

File names follow the scaffold, e.g. `sale.routes.js`, `sale.validation.js`, `sale.controller.js`, `sale.service.js`, `sale.repository.js`.

## Shared utilities — reuse, do not duplicate

| Concern | Use |
|---------|-----|
| Errors | `src/shared/errors/AppError.js` — `notFound`, `badRequest`, `conflict`, `forbidden`, `unauthorized`, `tooMany` |
| Async | `src/shared/helpers/catchAsync.helper.js` |
| Success JSON | `sendSuccess` from `src/shared/helpers/response.helper.js` → `{ success, message, data, meta? }` |
| Errors to client | `src/shared/middlewares/error.middleware.js` (do not change response shape) |
| Pagination | `src/shared/helpers/pagination.helper.js` (`paginate`, `paginate.buildResult`) |
| Validation | `validate.middleware.js` / `validate.wrapper.js` (Joi) |
| Auth | `authenticate` + `authorizePermission` in `auth.middleware.js` |
| Login tokens | `authCore.service.js`, `jwt.helper.js`, `cookie.helper.js` |
| Rate limits | `loginLimiter`, `refreshLimiter` |
| Password | User model hashes via bcrypt hooks; `defaultScope` excludes `password`; login uses `User.scope("withPassword")` or `unscoped()` |
| Phone | `phoneNormalize.helper.js` for Ethiopian numbers where needed |
| Upload | `createUploader.js`, `upload.middleware.js`, `fileCleanup.helper.js` if product images are added |
| Email | `email.service.js` only if IMS actually needs email |

Do not add SMS, QR signing, or payment-required errors.

## Coding rules

1. Controllers stay thin: `catchAsync` + `sendSuccess` (or `next(AppError)`).
2. Business rules live in services; Sequelize queries live in repositories.
3. Validation = request shape and basic constraints; authorization and domain rules = services + `authorizePermission`.
4. Multi-record consistency requires `sequelize.transaction`.
5. Inventory-changing operations **must** be transactional with row locks (`LOCK.UPDATE`) on `Inventory` rows (lock in a stable order to avoid deadlocks).
6. Never update `Inventory` without a matching `StockTransaction` for stock-affecting ops. Never create a stock transaction without updating inventory.
7. Stock transfer v1: **one transaction**, source OUT + destination IN (DRAFT → COMPLETED). Do not implement IN_TRANSIT stock.
8. Stock receipt, sale deduction, and adjustments must be atomic.
9. CommonJS only. Follow existing style.
10. Use association aliases **exactly** as defined on models. Never invent aliases.
11. Do not reach another module’s repository; go through that module’s service if a boundary exists.
12. Avoid circular dependencies.
13. Never expose password hashes. Do not trust client-supplied `userId` / `createdBy` — use `req.user.id`.
14. List endpoints use existing pagination. Filter/search in repositories.
15. Do not return raw Sequelize errors. Preserve global error middleware and `{ success: false, error: { code, message } }`.
16. Do not change the database schema just to make implementation easier. If a field/association is missing for a legitimate operation, **report it first**.
17. Prefer small, reviewable changes. After each phase, smoke-test (boot + affected endpoints) and report failures.
18. Do not silently delete existing functionality.

## Approved v1 domain contract

**Inventory grain:** one row per `(productId, warehouseId)`. Do not add lots, serials, or in-transit warehouses.

**Available stock:** `available = quantity - reservedQuantity`. In v1 keep `reservedQuantity` at **0**. Never allow negative on-hand. Completing a sale/transfer/out-adjustment **fails** if available is insufficient.

**Ledger:** `StockTransaction` is append-only. Completing a document = lock inventory → insert ledger row(s) with unique idempotency key `(referenceType, referenceId, type, productId, warehouseId)` → update qty/cost → set COMPLETED. Retry of complete returns the existing completed document.

**Costing:** Weighted average on inbound (receipt). Outbound and transfer-out use current `averageCost` snapshotted to `StockTransaction.unitCost`. At qty 0, freeze last WAC (do not divide by zero). Adjustments **set quantity to actual** and **do not** change WAC.

**Decimals:** Sequelize `DECIMAL` — use a shared decimal helper; never raw JS floats for qty/money.

**Documents:**
- PO: no warehouse; warehouse chosen on receipt; unique `(purchaseOrderId, productId)`; partial receive OK; no over-receive; cancel only if nothing received.
- Receipt: complete from DRAFT only; posts stock once.
- Sale: unique `(saleId, productId)`; cancel **DRAFT only**; do **not** set `REFUNDED`; do **not** post `SALE_RETURN` / `PURCHASE_RETURN`.
- Transfer: DRAFT → COMPLETED atomic; `sourceWarehouseId !== destinationWarehouseId`; on complete `receivedQuantity = quantity`.
- Adjustment: unique `(stockAdjustmentId, productId)`; complete once; cancel DRAFT only.
- Numbers: generate via `document_sequences` inside the same DB transaction as the insert.

**Auth:** Login identifier is **username**. Phone is contact-only (not unique). Permissions named `{module}:{ACTION}` (e.g. `sales:CREATE`). Unique `(module, action)` on Permission.

**Deletes:** RESTRICT operational history. CASCADE only header→draft line items. Do not hard-delete COMPLETED documents.

**AuditLog** is business/security history, not a stock ledger. Reconstruct stock from `StockTransaction` + `Inventory`.

## Out of scope for v1 (do not implement)

- Batch/lot/expiry as on-hand identity (`trackBatch` / `trackExpiry` / receipt batch fields are unused for allocation)
- Serial numbers
- Returns / refunds
- Reservations (`reservedQuantity` stays 0)
- Multi-step transfer IN_TRANSIT / partial transfer receive
- FIFO cost layers
- Customer master, payments, tax engine

## Implementation order

1. Shared: permission seed, decimal helper, document-number helper, inventory posting helper (lock + ledger + WAC).
2. Auth: login, refresh, logout, me; then user/role/permission CRUD as needed.
3. Catalog + warehouse CRUD.
4. Inventory read + stock-transaction read.
5. Purchase order → stock receipt.
6. Sale (stock out).
7. Stock adjustment.
8. Stock transfer (atomic).
9. Audit log write + list.

Register each module in `src/modules/index.js` when its router is real — never mount empty files.

## Association aliases (do not invent)

- AuditLog → `user`
- Category → `products`
- Inventory → `product`, `warehouse`
- Permission → `roles`
- Product → `category`, `supplier`, `inventory`, `stockTransferItems`, `stockTransactions`, `stockAdjustmentItems`, `purchaseOrderItems`, `stockReceiptItems`, `saleItems`
- PurchaseOrder → `supplier`, `creator`, `items`, `receipts`
- PurchaseOrderItem → `purchaseOrder`, `product`, `receiptItems`
- Role → `users`, `permissions`
- RolePermission → `role`, `permission`
- Sale → `warehouse`, `creator`, `items`
- SaleItem → `sale`, `product`
- StockAdjustment → `warehouse`, `creator`, `items`
- StockAdjustmentItem → `stockAdjustment`, `product`
- StockReceipt → `purchaseOrder`, `warehouse`, `receiver`, `items`
- StockReceiptItem → `stockReceipt`, `purchaseOrderItem`, `product`
- StockTransaction → `product`, `warehouse`, `creator`
- StockTransfer → `sourceWarehouse`, `destinationWarehouse`, `creator`, `items`
- StockTransferItem → `stockTransfer`, `product`
- Supplier → `products`, `purchaseOrders`
- User → `role`, `purchaseOrders`, `stockReceipts`, `sales`, `stockTransactions`, `stockAdjustments`, `stockTransfers`, `auditLogs`
- Warehouse → `inventory`, `outgoingTransfers`, `incomingTransfers`, `stockTransactions`, `stockAdjustments`, `stockReceipts`, `sales`

## Project skills

When implementing, follow skills under `.cursor/skills/`:

- `ims-implement-module` — module layout, controllers, validation, routing
- `ims-stock-ledger` — inventory mutations, locking, WAC, idempotency
- `ims-auth-rbac` — login cookies, password scope, permissions
