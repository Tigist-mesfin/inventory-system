# Inventory Management System — Architecture, Domain/Model Audit, and Decision Checklist

**Status:** READ-ONLY audits complete. No implementation until decisions are approved.  
**Date:** 24 August 2026  
**Scope:** `Inventory_Management_System_Backend` (Node.js, Express, Sequelize, CommonJS)

This document combines:

1. Architecture audit  
2. Domain / model audit (all 21 models)  
3. Domain decision checklist for a practical production-ready v1  

---

# Part 1 — Architecture Audit

## 1.1 Verdict

The repository is a **partial rewrite** from “Abyssinia Authenticate” into an Inventory Management System.

- **21 Sequelize models** load and associate correctly.  
- Almost all IMS modules are **empty placeholders** (0 bytes).  
- The app **cannot boot** because `src/modules/index.js` still requires deleted Abyssinia routers.  
- Shared auth/seed code still assumes the **old User schema**.  
- No inventory business logic, transactions, or row locking exists yet.

## 1.2 Current architecture (as-is)

| Layer | Status |
|--------|--------|
| Boot (`index.js` → `src/server.js` → `src/app.js`) | Present; mounts `/api` + `/api/webhooks` |
| Models (21) | Present, associated, CommonJS |
| Migrations | Folder exists, **empty** (`src/database/migrations/`) |
| Module scaffolding | Directories + empty files |
| Module routing | **Broken** — old Abyssinia paths |
| Shared utilities | Mostly intact from prior project |
| Business logic | **None** for inventory |

**Target module layout (AGENTS.md):** `auth`, `catalog`, `inventory`, `warehouse`, `purchasing`, `sales`, `audit`, `webhooks`.

**Intended flow:** route → validation → controller → service → repository → model.

## 1.3 Module status matrix

| Module | Paths | Status |
|--------|--------|--------|
| Router registry | `src/modules/index.js` | **Broken** — requires non-existent Abyssinia routers |
| Auth login/session | Missing (`auth.router` etc.) | **Missing** |
| `auth/user` | `src/modules/auth/user/*` | **Placeholder** (all 0 bytes) |
| `auth/role` | `src/modules/auth/role/*` | **Placeholder** |
| `auth/permission` | `src/modules/auth/permission/*` | **Placeholder** |
| `auth/role-permission` | `src/modules/auth/role-permission/*` | **Placeholder** |
| `catalog/category` | `src/modules/catalog/category/*` | **Placeholder** |
| `catalog/product` | `src/modules/catalog/product/*` | **Placeholder** |
| `catalog/supplier` | `src/modules/catalog/supplier/*` | **Placeholder** |
| `warehouse/warehouse` | `src/modules/warehouse/warehouse/*` | **Placeholder** |
| `inventory/inventory` | `src/modules/inventory/inventory/*` | **Placeholder** |
| `inventory/stock-transaction` | `src/modules/inventory/stock-transaction/*` | **Placeholder** |
| `inventory/stock-adjustment` | `src/modules/inventory/stock-adjustment/*` | **Placeholder** |
| `inventory/stock-transfer` | `src/modules/inventory/stock-transfer/*` | **Placeholder** |
| `purchasing/purchase-order` | `src/modules/purchasing/purchase-order/*` | **Placeholder** |
| `purchasing/stock-receipt` | `src/modules/purchasing/stock-receipt/*` | **Placeholder** |
| `sales/sale` | `src/modules/sales/sale/*` | **Placeholder** |
| `audit/audit-log` | `src/modules/audit/audit-log/*` | **Placeholder** |
| `webhooks/sms` | `src/modules/webhooks/sms/*` | **Implemented** (log-only GeezSMS callback) |

`src/modules/index.js` currently requires:

- `./auth/auth.router`
- `./category/category.router`
- `./product/product.router`
- `./qrcode/qrcode.router`
- `./resetLog/resetLog.router`
- `./scan/scan.router`
- `./user/user.router`
- `./analytics/analytics.router`
- `./subscription/subscription.router`

Confirmed runtime error: `Cannot find module './auth/auth.router'`.

## 1.4 Shared utilities — reuse map

| Concern | Reuse | Path |
|---------|--------|------|
| Errors | **Must reuse** | `src/shared/errors/AppError.js` |
| Async handlers | **Must reuse** | `src/shared/helpers/catchAsync.helper.js` |
| Success JSON | **Must reuse** | `src/shared/helpers/response.helper.js` → `{ success, message, data, meta? }` |
| Global errors | **Preserve** | `src/shared/middlewares/error.middleware.js` |
| Pagination | **Must reuse** | `src/shared/helpers/pagination.helper.js` (`paginate` + `buildResult`) |
| Validation | **Must reuse** | `validate.middleware.js`, `validate.wrapper.js` |
| Auth cookies/JWT | Reuse after adapting | `jwt.helper.js`, `cookie.helper.js`, `authCore.service.js` |
| Auth middleware | **Must rewrite for RBAC** | `auth.middleware.js` (still USER/ADMIN string roles) |
| Rate limits | Reuse `loginLimiter`/`refreshLimiter`; drop QR-specific | `rateLimit.middleware.js` |
| Upload | Reuse if product images added | `createUploader.js`, `upload.middleware.js`, `fileCleanup.helper.js`, `verifyImageFile.helper.js`, `mimeTypes.js` |
| Email/SMS | Optional; legacy templates | `email.service.js`, `smsMessage.js`, `config/sms.js` |
| QR signing | **Do not use for IMS** | `qrSigning.service.js` |
| Phone normalize | Only if Ethiopian phone rules stay | `phoneNormalize.helper.js` |

**Missing shared inventory helpers (not present):**

- transaction helper  
- row-lock inventory updater  
- stock-number / document-number generator  
- available-qty calculator  
- audit-log writer  
- permission checker middleware  
- decimal arithmetic helper  

## 1.5 Architecture findings by severity

### CRITICAL

1. App cannot start — `src/modules/index.js` requires missing Abyssinia routers.  
2. Zero business implementation — all IMS module files are 0-byte placeholders.  
3. Auth stack incompatible with new User model (`roleId` + `username` vs old `email`/`role: "ADMIN"`).  
4. No password hashing on User.  
5. No inventory concurrency / atomic stock path.  
6. Empty migrations; development `sync({ alter: false })` only.  
7. Association `onDelete` conflicts on PurchaseOrder ↔ StockReceipt.

### HIGH

1. RBAC tables exist; no permission middleware.  
2. `User.phone` not unique; no email field.  
3. `trackBatch`/`trackExpiry` without lot inventory.  
4. `reservedQuantity` unused.  
5. `averageCost` unused / undefined.  
6. Document workflows undefined in code.  
7. Transfer multi-step statuses vs when stock moves.  
8. Sale REFUNDED / SALE_RETURN / PURCHASE_RETURN without return documents.  
9. Document numbers unique but no generator.  
10. No User `defaultScope` excluding password.  
11. Missing FK/status indexes.  
12. Line-item uniqueness missing.

### MEDIUM / LOW

Permission `(module, action)` not unique; supplier name not unique; warehouse manager is a string; PO has no warehouse; AuditLog unused; leftover QR/OTP/SMS/README/env from Abyssinia Authenticate.

## 1.6 Files that should NOT be rewritten casually

- `src/shared/errors/AppError.js`  
- `src/shared/helpers/{catchAsync,response,pagination}.helper.js`  
- `src/shared/middlewares/{error,validate}.middleware.js` + `validate.wrapper.js`  
- `src/shared/helpers/{jwt,cookie}.helper.js` / `authCore.service.js` (adapt, don’t duplicate)  
- `src/app.js` error/404/CORS pattern  
- Existing model field shapes — report before schema changes (AGENTS.md #40–41)

---

# Part 2 — Domain / Model Audit

## 2.1 Model health summary

| Area | Health | Notes |
|------|--------|--------|
| Auth / RBAC tables | Mostly sound | Username identity; phone non-unique; no password scope/hooks |
| Catalog | Sound for master data | Soft-delete via status; hard delete blocked by RESTRICT after use |
| Warehouse | Sound | Manager is string, not User FK |
| Inventory balance | Sound for product×warehouse | **Cannot** store multiple batches/expiry/serials |
| Stock ledger | Structurally good | Missing immutability/idempotency guarantees |
| PO → Receipt | Good for partial receive | onDelete conflict; no warehouse on PO |
| Sale | Good for POS-style sale | **No return documents**; REFUNDED is all-or-nothing |
| Adjustment | Good count model | Double-apply risk without status discipline |
| Transfer | Ambitious workflow | Dispatch/receive/partial/in-transit poorly grounded |
| Returns | **Gap** | Enums only |
| Audit | Adequate business audit | Not a stock ledger substitute |
| Production readiness | **Blocked** on decisions | Especially batch, returns, transfer semantics, idempotency |

**Overall:** Sufficient to implement a **v1 non-batch IMS** if domain rules are locked and a few **required model fixes** are applied first. Not sufficient as-is for lot/serial/returns-heavy production.

All models: **timestamps ON** (`createdAt`/`updatedAt`). **No paranoid.** No `defaultScope`. No password hooks. FK `references:` **not** declared on attributes (associations only).

Verified at runtime: all 21 models load; association aliases match definitions.

---

## 2.2 Model-by-model audit

### User — `src/database/models/auth/User.model.js`

**Purpose:** Authenticable staff account tied to one Role.

**Fields:**

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|--------|
| id | UUID | PK | UUIDV4 | |
| roleId | UUID | NO | | FK Role |
| fullName | STRING | NO | | |
| username | STRING | NO | | **unique** |
| password | STRING | NO | | no hash/scope |
| phone | STRING | NO | | **not unique** |
| status | ENUM ACTIVE/INACTIVE/SUSPENDED | NO | ACTIVE | |
| lastLoginAt | DATE | YES | | |

**Associations:** `role` → Role (RESTRICT/CASCADE); hasMany `purchaseOrders`, `stockReceipts`, `sales`, `stockTransactions`, `stockAdjustments`, `stockTransfers` (RESTRICT); `auditLogs` (SET NULL).

**Correct:** UUID PK; required role; unique username; status lifecycle; RESTRICT on operational FKs.

**Problems:** username-only identity; phone not unique; no email; password leak risk.

**Recommended:** Confirm login = username; defaultScope exclude password; bcrypt hooks.

---

### Role — `src/database/models/auth/Role.model.js`

**Purpose:** Named role with permissions.

**Fields:** id UUID PK; name STRING unique NOT NULL; description TEXT NULL; status ENUM ACTIVE/INACTIVE default ACTIVE.

**Associations:** `users`; M2M `permissions` via RolePermission.

**Correct:** Unique name; RESTRICT delete when users exist.

---

### Permission — `src/database/models/auth/Permission.model.js`

**Purpose:** Module × action capability.

**Fields:** id; name unique; module STRING NOT NULL; action ENUM CREATE/READ/UPDATE/DELETE/APPROVE/EXPORT; description; status ACTIVE/INACTIVE.

**Associations:** M2M `roles`.

**Problems:** No unique `(module, action)` — semantic duplicates possible.

---

### RolePermission — `src/database/models/auth/RolePermission.model.js`

**Purpose:** Role ↔ Permission join.

**Fields:** id; roleId; permissionId. **Unique index** `(roleId, permissionId)`.

**Associations:** `role`, `permission` (CASCADE/CASCADE) — appropriate for a join table.

---

### Category — `src/database/models/catalog/Category.model.js`

**Purpose:** Product grouping.

**Fields:** id; name unique; description; status ACTIVE/INACTIVE.

**Associations:** hasMany `products` (RESTRICT).

**Correct:** Cannot delete category with products. Prefer INACTIVE.

---

### Supplier — `src/database/models/catalog/Supplier.model.js`

**Purpose:** Vendor master; optional default for product; required for PO.

**Fields:** id; name NOT unique; contactPerson; email optional+isEmail; phone; address JSON; paymentTerms; status.

**Associations:** hasMany `products` (SET NULL); hasMany `purchaseOrders` (RESTRICT).

---

### Product — `src/database/models/catalog/Product.model.js`

**Purpose:** Sellable/purchasable SKU master.

**Fields:**

| Field | Type | Notes |
|-------|------|--------|
| categoryId | UUID NOT NULL | RESTRICT |
| supplierId | UUID NULL | SET NULL |
| sku | STRING unique NOT NULL | |
| barcode | STRING unique NULL | |
| name | STRING NOT NULL | |
| unit | STRING default PCS | |
| purchasePrice | DECIMAL(15,2) min 0 | list cost |
| sellingPrice | DECIMAL(15,2) min 0 | list price |
| reorderLevel | DECIMAL(15,3) min 0 | |
| reorderQuantity | DECIMAL(15,3) min 0 | |
| trackBatch | BOOLEAN default false | **not backed by Inventory grain** |
| trackExpiry | BOOLEAN default false | **not backed by Inventory grain** |
| status | ACTIVE/INACTIVE | |

**Associations:** `category`, `supplier`; hasMany inventory, transfer/adjustment/PO/receipt/sale items, stockTransactions — all RESTRICT.

**Deletion:** Hard delete is blocked once any transactional child exists. Use INACTIVE.

---

### Warehouse — `src/database/models/warehouse/Warehouse.model.js`

**Purpose:** Stock location.

**Fields:** id; name unique; code unique; address JSON; managerName STRING (not User FK); phone; status.

**Associations:** inventory, outgoingTransfers, incomingTransfers, stockTransactions, stockAdjustments, stockReceipts, sales — all RESTRICT.

---

### Inventory — `src/database/models/inventory/Inventory.model.js`

**Purpose:** On-hand balance per product × warehouse.

**Fields:**

| Field | Type | Notes |
|-------|------|--------|
| productId | UUID NOT NULL | |
| warehouseId | UUID NOT NULL | |
| quantity | DECIMAL(15,3) min 0 default 0 | on-hand |
| reservedQuantity | DECIMAL(15,3) min 0 default 0 | no reservation docs |
| averageCost | DECIMAL(15,2) min 0 default 0 | WAC undefined |
| lastCountedAt | DATE NULL | cycle count |

**Unique:** `(productId, warehouseId)`.

**MODEL GAP (batch/expiry):** One row per product×warehouse. **Cannot** represent multiple batches or expiry dates for the same product in the same warehouse. Receipt-item `batchNumber`/`expiryDate` are receive metadata only.

**Serial tracking:** Impossible at this grain.

**Available qty (derived):** `available = quantity - reservedQuantity`. Not stored. No DB CHECK `quantity >= reservedQuantity`. Sequelize `min: 0` is not a DB CHECK; races need row locks.

---

### StockTransaction — `src/database/models/inventory/StockTransaction.model.js`

**Purpose:** Intended immutable stock ledger line.

**Fields:** productId, warehouseId, createdBy (all NOT NULL); type ENUM:

- PURCHASE  
- SALE  
- SALE_RETURN  
- PURCHASE_RETURN  
- TRANSFER_IN  
- TRANSFER_OUT  
- ADJUSTMENT_IN  
- ADJUSTMENT_OUT  

quantity DECIMAL(15,3) min 0.001 (absolute); quantityBefore; quantityAfter; unitCost DECIMAL(15,2) NULL; referenceType STRING NULL; referenceId UUID NULL; notes.

**Indexes:** `(productId, warehouseId)`, `(referenceType, referenceId)`, `type`. **No unique idempotency key.**

**Associations:** `product`, `warehouse`, `creator` (RESTRICT).

**Problems:** Not append-only at DB; no unique key against double-post; before/after unconstrained vs quantity; SALE_RETURN/PURCHASE_RETURN without return documents; `referenceType` free string.

---

### PurchaseOrder — `src/database/models/purchasing/PurchaseOrder.model.js`

**Purpose:** Supplier order header.

**Fields:** supplierId, createdBy; orderNumber unique; orderDate; expectedDate; subtotal, taxAmount, discountAmount, totalAmount DECIMAL(15,2); status:

- DRAFT  
- SUBMITTED  
- APPROVED  
- PARTIALLY_RECEIVED  
- COMPLETED  
- CANCELLED  

**Associations:** `supplier`, `creator`; `items` CASCADE; `receipts` **onDelete RESTRICT**.

**No warehouseId** — destination chosen at receipt.

---

### PurchaseOrderItem — `src/database/models/purchasing/PurchaseOrderItem.model.js`

**Fields:** purchaseOrderId, productId; quantity min 0.001; receivedQuantity default 0; unitPrice; totalPrice.

**No unique** `(purchaseOrderId, productId)`.  
**No CHECK** `receivedQuantity <= quantity`.

**Associations:** `purchaseOrder` CASCADE; `product` RESTRICT; `receiptItems` **onDelete RESTRICT**.

---

### StockReceipt — `src/database/models/purchasing/StockReceipt.model.js`

**Purpose:** Physical receive into a warehouse; optional PO (ad-hoc if `purchaseOrderId` null).

**Fields:** purchaseOrderId NULL; warehouseId NOT NULL; receivedBy; receiptNumber unique; receiptDate; status DRAFT/COMPLETED/CANCELLED; notes.

**Associations:** `purchaseOrder` **onDelete SET NULL** (conflicts with PO hasMany RESTRICT); `warehouse`; `receiver`; `items` CASCADE.

---

### StockReceiptItem — `src/database/models/purchasing/StockReceiptItem.model.js`

**Fields:** stockReceiptId; purchaseOrderItemId NULL; productId; quantity min 0.001; unitCost NOT NULL; batchNumber NULL; expiryDate NULL.

**Associations:** `stockReceipt` CASCADE; `purchaseOrderItem` **SET NULL** (conflicts with PO item hasMany RESTRICT); `product` RESTRICT.

Duplicate product lines allowed (would matter for lots; Inventory still collapses).

---

### Sale — `src/database/models/sales/Sale.model.js`

**Purpose:** Outbound sale from one warehouse.

**Fields:** warehouseId, createdBy; invoiceNumber unique; customerName/phone optional; saleDate; money fields; paymentMethod ENUM CASH/CARD/BANK_TRANSFER/MOBILE_MONEY/CREDIT; status DRAFT/COMPLETED/CANCELLED/**REFUNDED**.

**No return header.** REFUNDED is all-or-nothing.

---

### SaleItem — `src/database/models/sales/SaleItem.model.js`

**Fields:** saleId, productId; quantity min 0.001; unitPrice; discountAmount; totalPrice.

**No returnedQuantity.** **No unique** `(saleId, productId)`. **No unitCost snapshot** (COGS via ledger `unitCost` at post time).

---

### StockAdjustment — `src/database/models/inventory/StockAdjustment.model.js`

**Purpose:** Cycle count / variance.

**Fields:** warehouseId, createdBy; adjustmentNumber unique; reason NOT NULL; adjustmentDate; status DRAFT/COMPLETED/CANCELLED.

**Associations:** `warehouse`, `creator`, `items` CASCADE.

---

### StockAdjustmentItem — `src/database/models/inventory/StockAdjustmentItem.model.js`

**Fields:** stockAdjustmentId, productId; systemQuantity; actualQuantity min 0; difference; reason NULL.

**No unique** `(stockAdjustmentId, productId)`.  
**No CHECK** `difference = actualQuantity - systemQuantity`.  
`systemQuantity` has no min: 0.

---

### StockTransfer — `src/database/models/inventory/StockTransfer.model.js`

**Purpose:** Move stock between warehouses.

**Fields:** sourceWarehouseId, destinationWarehouseId, createdBy; transferNumber unique; transferDate; status:

- DRAFT  
- REQUESTED  
- APPROVED  
- IN_TRANSIT  
- COMPLETED  
- CANCELLED  

**No CHECK** source ≠ destination. **No in-transit location.**

**Associations:** `sourceWarehouse`, `destinationWarehouse`, `creator`, `items` CASCADE.

---

### StockTransferItem — `src/database/models/inventory/StockTransferItem.model.js`

**Fields:** stockTransferId, productId; quantity min 0.001; receivedQuantity default 0.

**No unique** product per transfer. **No PARTIALLY_RECEIVED** status on header despite receivedQuantity.

---

### AuditLog — `src/database/models/audit/AuditLog.model.js`

**Purpose:** Business/security event trail — **not** the stock ledger.

**Fields:** userId NULL; action ENUM CREATE/UPDATE/DELETE/LOGIN/LOGOUT/APPROVE/CANCEL/STOCK_IN/STOCK_OUT/TRANSFER/ADJUSTMENT; entityType; entityId NULL; oldValues/newValues JSON; ipAddress; userAgent; description.

**Indexes:** userId; (entityType, entityId); action.

**Associations:** `user` SET NULL.

Do not reconstruct stock from AuditLog. Use StockTransaction.

---

## 2.3 Association aliases (runtime)

```
AuditLog            → user
Category            → products
Inventory           → product, warehouse
Permission          → roles
Product             → category, supplier, inventory, stockTransferItems,
                      stockTransactions, stockAdjustmentItems, purchaseOrderItems,
                      stockReceiptItems, saleItems
PurchaseOrder       → supplier, creator, items, receipts
PurchaseOrderItem   → purchaseOrder, product, receiptItems
Role                → users, permissions
RolePermission      → role, permission
Sale                → warehouse, creator, items
SaleItem            → sale, product
StockAdjustment     → warehouse, creator, items
StockAdjustmentItem → stockAdjustment, product
StockReceipt        → purchaseOrder, warehouse, receiver, items
StockReceiptItem    → stockReceipt, purchaseOrderItem, product
StockTransaction    → product, warehouse, creator
StockTransfer       → sourceWarehouse, destinationWarehouse, creator, items
StockTransferItem   → stockTransfer, product
Supplier            → products, purchaseOrders
User                → role, purchaseOrders, stockReceipts, sales,
                      stockTransactions, stockAdjustments, stockTransfers, auditLogs
Warehouse           → inventory, outgoingTransfers, incomingTransfers,
                      stockTransactions, stockAdjustments, stockReceipts, sales
```

Never invent aliases. Use these exactly.

---

## 2.4 Cross-model domain gaps

### Batch / expiry — MODEL GAP

- Flags on Product; metadata on StockReceiptItem.  
- Inventory grain = product × warehouse only.  
- Cannot FEFO allocate, block expired sales, or transfer specific lots.

### Serial numbers — MODEL GAP

- No serial fields anywhere.

### Returns — MODEL GAP

- Ledger types SALE_RETURN / PURCHASE_RETURN exist.  
- No SaleReturn / PurchaseReturn / returnedQuantity.  
- Sale.REFUNDED cannot represent partial or multiple returns.

### Reservations — PARTIAL / weak

- `reservedQuantity` exists; no Reservation document.  
- No CHECK quantity ≥ reserved.

### Costing — PARTIAL

- Fields exist; no WAC formula for receipt, transfer, adjustment, zero-stock, returns.

### Transfers — SEMANTIC GAP

- Multi-status + receivedQuantity without in-transit storage.

### Idempotency — SCHEMA GAP

- COMPLETED status alone does not prevent double application.  
- Need unique ledger key and/or postedAt.

### FK conflicts

- PurchaseOrder.hasMany(StockReceipt) **RESTRICT** vs StockReceipt.belongsTo **SET NULL**.  
- PurchaseOrderItem.hasMany(StockReceiptItem) **RESTRICT** vs belongsTo **SET NULL**.

### Unsafe CASCADE

- Header → items CASCADE is OK for drafts.  
- Must forbid deleting COMPLETED headers.

---

## 2.5 Domain audit findings by severity

### CRITICAL

1. Batch/expiry flags without lot-capable Inventory.  
2. Returns enums without return domain.  
3. StockTransaction not idempotent / not append-only.  
4. Transfer workflow ambiguous.  
5. Conflicting onDelete on PO ↔ Receipt.  
6. No locking contract — negative stock under race.

### HIGH

1. reservedQuantity lifecycle undefined.  
2. averageCost semantics undefined.  
3. Sale REFUNDED vs partial returns.  
4. COMPLETED without stock-applied marker.  
5. Password exposure; phone non-unique.  
6. Permission `(module, action)` not unique.  
7. Duplicate line items without policy.  
8. DECIMAL vs JavaScript Number arithmetic.

### MEDIUM

1. Manager as string vs User FK.  
2. No warehouse on PO.  
3. Supplier name not unique.  
4. Missing FK/status/date indexes.  
5. AuditLog overlapping stock actions.  
6. Free-form referenceType.  
7. Adjustment difference not CHECK-constrained.  
8. Transfer source ≠ destination not constrained.

### LOW

Optional product image/tax/customer entity; audit request id; paranoid unused (status enums used instead).

---

# Part 3 — Domain Decision Checklist

Legend:

- **MC** = model change  
- **MIG** = migration  
- **SVC** = service-layer rule  
- **INFRA** = shared helper/middleware  
- **NONE** = no schema change  

Owner must answer **D1–D38** (accept recommendations or override).

---

## 3.1 AUTH

### D1. Login identity

**Current:** unique `username`; required non-unique `phone`; **no email**.  
**Consequence:** Login, seed, and reset UX must match stored identity. `ADMIN_SEED_EMAIL` does not match the model.

| Option | Meaning |
|--------|---------|
| A | Login by **username** only |
| B | Login by **phone** (must unique-ify phone) |
| C | Login by username **or** phone |

**Recommend: A**  
**Requires:** NONE (model) · SVC · INFRA (`authCore` + cookies). B/C need MC + MIG.

---

### D2. Phone uniqueness

**Current:** `phone` NOT NULL, not unique.  
**Consequence:** Duplicate phones; SMS/OTP lookup ambiguous.

| Option | Meaning |
|--------|---------|
| A | Keep non-unique; phone is contact only |
| B | Unique + required |
| C | Unique + optional |

**Recommend: A for v1** (if D1=A).  
**Requires:** A = NONE · B/C = MC + MIG.

---

### D3. Password hashing and exposure

**Current:** `password` STRING NOT NULL; no hooks; no defaultScope exclude.  
**Consequence:** Plaintext risk; hash leak on includes.

| Option | Meaning |
|--------|---------|
| A | Hash in User hooks + defaultScope exclude password; unscoped only for login |
| B | Hash only in services |
| C | Hash in hooks; no defaultScope |

**Recommend: A**  
**Requires:** MC · SVC · INFRA.

---

### D4. Role / permission model and naming

**Current:** Role M2M Permission; unique `(roleId, permissionId)`; Permission unique on `name` only; leftover authorize() is USER/ADMIN strings.

| Option | Meaning |
|--------|---------|
| A | Canonical `name` = `{module}:{action}` |
| B | Unique `(module, action)` **and** unique `name` |
| C | Free-form names |

**Recommend: B** (e.g. name `sales:CREATE`)  
**Requires:** MC + MIG · SVC (seed + authorizePermission) · INFRA (permission middleware).

---

## 3.2 INVENTORY

### D5. Batch / expiry in v1

**Current:** Product flags + receipt batch/expiry; Inventory unique product×warehouse only.  
**Consequence:** Cannot hold two lots of the same SKU in one warehouse.

| Option | Meaning |
|--------|---------|
| A | **Defer lots.** Ignore flags; receipt metadata is notes only |
| B | Require lot inventory before stock modules |
| C | Keep flags as future; store receipt metadata; never allocate by lot |

**Recommend: A** (C acceptable if never FEFO)  
**Requires:** A/C = SVC · B = MC + MIG (out of v1).

---

### D6. Serial tracking in v1

**Current:** No serial fields.

| Option | Meaning |
|--------|---------|
| A | Defer |
| B | Add serial model before sales |

**Recommend: A**  
**Requires:** A = NONE · B = MC + MIG.

---

### D7. reservedQuantity

**Current:** Field exists; no reservation documents.

| Option | Meaning |
|--------|---------|
| A | **Always 0 in v1**; no reserve/release |
| B | Reserve on DRAFT sale/transfer |
| C | Separate reservation documents |

**Recommend: A**  
**Requires:** A = SVC · B/C = likely MC + SVC.

---

### D8. Available stock rule

**Current:** Not stored. Implied `available = quantity - reservedQuantity`.

| Option | Meaning |
|--------|---------|
| A | `available = quantity - reserved` (with D7=A → equals on-hand) |
| B | Available = quantity only |
| C | Persist computed column |

**Recommend: A**  
**Requires:** SVC · optional CHECK later MC + MIG.

---

### D9. Negative stock

**Current:** Sequelize validate min 0; not a DB CHECK.

| Option | Meaning |
|--------|---------|
| A | **Never** negative; fail if available insufficient |
| B | Allow with permission |
| C | Allow only via adjustment |

**Recommend: A**  
**Requires:** SVC + INFRA (transaction + LOCK.UPDATE) · optional DB CHECK MC + MIG.

---

### D10. Decimal quantity / cost handling

**Current:** Qty DECIMAL(15,3); money DECIMAL(15,2); Sequelize returns strings; JS Number is unsafe.

| Option | Meaning |
|--------|---------|
| A | Shared decimal helper; never Number for qty/money |
| B | Scale integers |
| C | Raw JS floats |

**Recommend: A**  
**Requires:** INFRA + SVC. **C is forbidden.**

---

### D11. averageCost / WAC

**Current:** Fields exist; no formula.

| Option | Meaning |
|--------|---------|
| A | **WAC on inbound**; outbound uses current WAC; snapshot `StockTransaction.unitCost`; at qty→0 freeze last WAC |
| B | FIFO layers (needs extra model) |
| C | Always Product.purchasePrice |

**Recommend: A**

Inbound:

```text
newAvg = (qtyOnHand * avgCost + inboundQty * inboundUnitCost)
       / (qtyOnHand + inboundQty)
```

If on-hand is 0: `newAvg = inboundUnitCost`.

**Requires:** SVC · B = MC.

---

## 3.3 STOCK LEDGER

### D12. Idempotency key

**Current:** Indexes but **no unique** ledger key.  
**Consequence:** Retry/double-complete posts stock twice.

| Option | Meaning |
|--------|---------|
| A | Unique `(referenceType, referenceId, type, productId, warehouseId)` |
| B | Unique including line item id (`referenceLineId` or referenceId = line id) |
| C | Status check only |

**Recommend: A** if each complete writes at most one row per product×warehouse×type per document.  
If duplicate product lines are allowed, **A is insufficient → use B**.

With recommended unique lines (D16/D25/D33 = A), **D12 = A** is enough.

**Requires:** MC + MIG · SVC.

---

### D13. Append-only policy

**Current:** UPDATE/DELETE allowed.

| Option | Meaning |
|--------|---------|
| A | Service forbids update/delete; no repository update |
| B | DB trigger/revoke UPDATE DELETE |
| C | Allow edits for corrections |

**Recommend: A** — corrections = reversing transactions, not edits.  
**Requires:** SVC · B optional later MIG.

---

### D14. quantityBefore / quantityAfter

**Current:** Both NOT NULL; unconstrained vs quantity/type.

| Option | Meaning |
|--------|---------|
| A | After lock: before = locked on-hand; after = before ± qty by type; must match Inventory after write |
| B | Store only delta |
| C | Best-effort snapshots |

**Recommend: A**  
IN: `after = before + quantity`  
OUT: `after = before - quantity` (≥ 0)

**Requires:** SVC · optional CHECK later MC + MIG.

---

### D15. Completing stock-affecting documents + retries

**Current:** Status enums; no `stockAppliedAt`.

| Option | Meaning |
|--------|---------|
| A | **One transaction:** lock inventory → write ledger (unique key) → update qty/cost → set COMPLETED. If already COMPLETED, return existing doc |
| B | Add `postedAt`; complete only if null |
| C | Async job after COMPLETED |

**Recommend: A** (+ D12).  
**Requires:** SVC + INFRA · A = no model · B = MC + MIG.

---

## 3.4 PURCHASING

### D16. Duplicate products on a PO

**Current:** No unique `(purchaseOrderId, productId)`.

| Option | Meaning |
|--------|---------|
| A | **Forbid** duplicates; unique pair |
| B | Allow; aggregate remaining by line id |
| C | Allow only with different unitPrice |

**Recommend: A**  
**Requires:** A = MC + MIG · B/C = SVC.

---

### D17. PO warehouse vs receipt warehouse

**Current:** PO has no warehouseId; receipt requires warehouseId.

| Option | Meaning |
|--------|---------|
| A | Warehouse **only on receipt** |
| B | Add warehouseId on PO; receipts must match |
| C | Optional suggested warehouse on PO |

**Recommend: A**  
**Requires:** A = SVC · B/C = MC + MIG.

---

### D18. Partial receiving

**Current:** PARTIALLY_RECEIVED; line receivedQuantity; multiple receipts; ad-hoc receipts allowed.

| Option | Meaning |
|--------|---------|
| A | Allow partial; remaining = ordered − received; **no over-receive** |
| B | Over-receive allowed |
| C | Full receive only |

**Recommend: A.** Ad-hoc receipts (no PO) allowed.  
**Requires:** SVC (+ lock PO lines). NONE model.

---

### D19. Receipt completion

**Current:** DRAFT/COMPLETED/CANCELLED.

| Option | Meaning |
|--------|---------|
| A | Complete only from DRAFT with ≥1 item; posts stock once; then immutable |
| B | Edit completed receipts |
| C | Complete with zero items |

**Recommend: A.** CANCELLED only from DRAFT.  
**Requires:** SVC.

---

### D20. PO cancellation

**Current:** CANCELLED exists; receipts may exist; onDelete conflict.

| Option | Meaning |
|--------|---------|
| A | Cancel only DRAFT/SUBMITTED/APPROVED with **zero** received qty and **no** completed receipts |
| B | Cancel anytime; unlink receipts |
| C | Soft-cancel remaining qty; keep receipts |

**Recommend: A**  
**Requires:** SVC + D21.

---

### D21. PO ↔ Receipt onDelete

**Current:** RESTRICT vs SET NULL (same on PO item ↔ receipt item).

| Option | Meaning |
|--------|---------|
| A | **RESTRICT** both sides |
| B | SET NULL both sides |
| C | CASCADE receipts (unsafe) |

**Recommend: A.** Never hard-delete operational POs.  
**Requires:** MC + MIG.

---

## 3.5 SALES

### D22. Sale cancellation

**Current:** DRAFT / COMPLETED / CANCELLED / REFUNDED.

| Option | Meaning |
|--------|---------|
| A | CANCELLED **only from DRAFT**; no stock movement |
| B | Cancel COMPLETED and reverse stock |
| C | Cancel COMPLETED without reversing |

**Recommend: A.** Reversal = return flow (deferred).  
**Requires:** SVC.

---

### D23. Refund / return scope for v1

**Current:** SALE_RETURN / PURCHASE_RETURN types; REFUNDED status; no return models.

| Option | Meaning |
|--------|---------|
| A | **Defer returns**; do not post *_RETURN; do not use REFUNDED |
| B | Build return documents first |
| C | REFUNDED = full reverse without return docs |

**Recommend: A.** C is not auditable/partial-safe.  
**Requires:** A = SVC · B = MC + MIG.

---

### D24. Keep REFUNDED enum?

| Option | Meaning |
|--------|---------|
| A | Leave enum; services never set it in v1 |
| B | Remove from enum now |
| C | Use as alias for full return |

**Recommend: A**  
**Requires:** A = SVC · B = MC + MIG.

---

### D25. Duplicate products on a sale

**Current:** No unique `(saleId, productId)`.

| Option | Meaning |
|--------|---------|
| A | Forbid unique pair |
| B | Allow (POS lines) |

**Recommend: A** for v1.  
**Requires:** A = MC + MIG · B = SVC.

---

### D26. Stock-out behavior

| Option | Meaning |
|--------|---------|
| A | Complete **fails** if available < requested (after lock) |
| B | Partial fulfill |
| C | Allow negative |

**Recommend: A**  
**Requires:** SVC + INFRA. Aligns with D9.

---

## 3.6 TRANSFERS

### D27. Transfer workflow

**Current:** DRAFT / REQUESTED / APPROVED / IN_TRANSIT / COMPLETED / CANCELLED; receivedQuantity; no in-transit location.

| Option | Meaning |
|--------|---------|
| A | **Atomic v1:** DRAFT → COMPLETED (one txn: OUT source + IN dest) |
| B | Full multi-step + in-transit warehouse |
| C | Use all statuses but lose stock “in transit” with no location |

**Recommend: A.** C rejected.  
**Requires:** A = SVC · B = MC.

---

### D28. Partial transfer receiving

**Current:** receivedQuantity exists; no PARTIALLY_RECEIVED.

| Option | Meaning |
|--------|---------|
| A | v1: received must equal shipped on complete |
| B | Partial receive + remaining in-transit |

**Recommend: A** (with D27=A, `receivedQuantity = quantity` on complete).  
**Requires:** A = SVC · B = MC.

---

### D29. Transfer cancellation

| Option | Meaning |
|--------|---------|
| A | Cancel only DRAFT |
| B | Cancel IN_TRANSIT with reverse ledger |
| C | Cancel COMPLETED |

**Recommend: A**  
**Requires:** SVC.

---

### D30. Source / destination validation

**Current:** Both FKs required; no CHECK source ≠ dest.

| Option | Meaning |
|--------|---------|
| A | Service rejects same warehouse; both ACTIVE |
| B | DB CHECK `sourceWarehouseId <> destinationWarehouseId` |

**Recommend: A** (B optional).  
**Requires:** SVC · B = MC + MIG.

---

### D31. In-transit stock representation

**Current:** Nowhere.

| Option | Meaning |
|--------|---------|
| A | None — not in v1 (atomic) |
| B | System IN_TRANSIT warehouse |
| C | Extra inventory state column |

**Recommend: A**  
**Requires:** A = NONE · B/C = MC.

---

## 3.7 ADJUSTMENTS

### D32. Adjustment completion

| Option | Meaning |
|--------|---------|
| A | Complete from DRAFT once; snapshot system qty under lock; apply; COMPLETED immutable |
| B | Re-complete allowed |
| C | Cancel COMPLETED and reverse |

**Recommend: A.** Cancel only DRAFT.  
**Requires:** SVC.

---

### D33. Duplicate products on adjustment

**Current:** No unique `(stockAdjustmentId, productId)`.

| Option | Meaning |
|--------|---------|
| A | Unique pair |
| B | Allow |

**Recommend: A**  
**Requires:** MC + MIG.

---

### D34. Set-to-actual vs apply-difference

**Current:** Both fields stored; no CHECK difference = actual − system.

| Option | Meaning |
|--------|---------|
| A | **Set on-hand to actualQuantity**; difference is audit; ledger qty = \|difference\| |
| B | Apply difference to current on-hand (racy vs snapshot) |
| C | Store only difference |

**Recommend: A.** Recompute difference under lock: `actual - lockedOnHand`.  
**Requires:** SVC.

---

### D35. Adjustment costing

**Current:** No cost on adjustment items.

| Option | Meaning |
|--------|---------|
| A | **Do not change averageCost**; ADJUSTMENT_* unitCost = current WAC |
| B | Variance at a given unit cost (needs item cost field) |
| C | Recalc WAC to product.purchasePrice |

**Recommend: A** (qty correction, not revaluation).  
**Requires:** SVC · B = MC.

---

## 3.8 DOCUMENT NUMBERS

### D36. Number generation

Applies to: `orderNumber`, `receiptNumber`, `invoiceNumber`, `transferNumber`, `adjustmentNumber`.

**Current:** STRING NOT NULL UNIQUE; no generator.

| Option | Meaning |
|--------|---------|
| A | **`document_sequences` table** — `UPDATE ... SET last = last+1` in the same transaction as insert |
| B | Native DB sequences |
| C | UUID as document number |
| D | Timestamp+random without locking |

**Recommend: A.** Format `{PREFIX}-{padded seq}` e.g. `PO-000123`. Unique on document table remains.

**Requires:** MC + MIG · INFRA (`nextDocumentNumber(type, transaction)`) · SVC (assign on create).

**Do not use D.** C is unique but poor UX.

---

## 3.9 DATABASE

### D37. Conflicting onDelete (policy)

**Current:** Items CASCADE with header; operational FKs mostly RESTRICT; AuditLog/User SET NULL; Product.supplier SET NULL; **PO↔Receipt conflict**.

| Option | Meaning |
|--------|---------|
| A | **RESTRICT** all operational history; **CASCADE** only draft children with header; **SET NULL** only audit + optional product.supplier |
| B | CASCADE operational docs |

**Recommend: A** + D21=RESTRICT. Never CASCADE-delete COMPLETED headers.  
**Requires:** MC + MIG for the conflict · SVC forbid delete of posted docs.

---

### D38. Constraints vs service layer

**Put in DB (v1 recommended):**

- Existing uniques: username, sku, barcode, warehouse name/code, document numbers, inventory `(productId, warehouseId)`, role_permission pair, role/permission names.  
- New uniques: permission `(module, action)`; line uniqueness where D16/D25/D33 = A; ledger idempotency key (D12).  
- FK onDelete aligned (D21).  
- Indexes: all FKs (`roleId`, `categoryId`, `supplierId`, `warehouseId`, `createdBy`, `purchaseOrderId`, …); `status` on documents; date columns (`saleDate`, `orderDate`, `receiptDate`); `stock_transactions.createdAt`.

**Keep in service (v1):**

- Status machines and who may transition.  
- available ≥ outbound qty (unless CHECK added).  
- WAC math; decimal math.  
- receivedQuantity ≤ ordered.  
- source ≠ dest (unless CHECK).  
- difference = actual − system.  
- Append-only ledger.  
- Do not delete COMPLETED.

---

# Part 4 — Recommended v1 contract

1. Login: **username + password** (bcrypt); cookies/JWT as today; phone contact-only, not unique.  
2. Passwords **never** in API JSON (`defaultScope` exclude).  
3. Authorize via **Role → Permission**; unique `(module, action)` and names like `sales:CREATE`.  
4. **No lots, serials, returns, reservations** in v1. Ignore `trackBatch`/`trackExpiry`. `reservedQuantity` always 0. **Do not set REFUNDED.** Do not post `SALE_RETURN` / `PURCHASE_RETURN`.  
5. Available = `quantity - reservedQuantity` (= `quantity`). **No negative stock.**  
6. Money/qty via **decimal helper**, not JS floats. **WAC** on inbound; snapshot `unitCost` on every ledger row; freeze WAC at zero qty.  
7. **StockTransaction append-only.** Completing a doc is **one DB transaction:** lock inventory → unique ledger insert → update qty/cost → COMPLETED. Retry of complete = return existing COMPLETED doc.  
8. PO has **no warehouse**; receipt chooses warehouse. **No duplicate products** on PO/sale/adjustment. Partial PO receive **yes**, no over-receive. Cancel PO only if nothing received. Cancel sale/receipt/adjustment/transfer only from **DRAFT**.  
9. Transfers: **DRAFT → COMPLETED atomic**; source ≠ dest; both ACTIVE; `receivedQuantity = quantity` at complete. Unused transfer statuses unused.  
10. Adjustment **sets quantity to actual**; does not change WAC.  
11. Document numbers from a **locked sequence table**.  
12. **RESTRICT** PO delete if receipts exist. Do not hard-delete posted documents.  
13. Inventory truth lives in `Inventory`. Ledger is `StockTransaction`. AuditLog is business/security only.  
14. Use only model-defined association aliases.

---

# Part 5 — Changes required before implementation

Do these **after owner approval**, before filling modules:

| Change | Decision | Type |
|--------|----------|------|
| Align PO ↔ Receipt (and PO item ↔ receipt item) `onDelete` to **RESTRICT** | D21 | MC + MIG |
| Permission unique `(module, action)` | D4 | MC + MIG |
| User `defaultScope` exclude password (+ hash hooks) | D3 | MC |
| Unique line pairs PO/Sale/Adjustment `(docId, productId)` | D16, D25, D33 | MC + MIG |
| StockTransaction unique idempotency key | D12 | MC + MIG |
| `document_sequences` (or equivalent) | D36 | MC + MIG |
| FK indexes + document `status`/`date` indexes | D38 | MC + MIG |
| Fix `modules/index.js` / auth seed to match User | architecture | later implementation |

**Not required for v1 model work:** lot tables, serials, returns, reservation docs, transfer in-transit warehouse, `stockAppliedAt`, removing `REFUNDED` from enum.

---

# Part 6 — Decisions that can safely be deferred

- Email on User; unique phone; SMS login  
- Lot / expiry / serial models  
- Sale/purchase return documents; using `REFUNDED`  
- Reservation system  
- Multi-step transfer + in-transit stock  
- Partial transfer receive  
- FIFO / cost layers  
- Adjustment revaluation cost field  
- Warehouse `managerUserId`  
- PO `warehouseId`  
- Customer master  
- DB CHECKs beyond uniques/FKs  
- Trigger-level append-only ledger  
- Unique supplier name  

---

# Part 7 — Must NOT change yet

Until this checklist is **approved** (and even after, unless a decision requires it):

- Do **not** add InventoryLot / serial / return models  
- Do **not** remove `trackBatch`, `trackExpiry`, `reservedQuantity`, `receivedQuantity`, `REFUNDED`, or unused transfer statuses just to “clean up”  
- Do **not** rewrite shared `AppError`, `sendSuccess`, `paginate`, `validate`, `catchAsync`, error middleware  
- Do **not** change DECIMAL precision  
- Do **not** change Inventory grain `(productId, warehouseId)`  
- Do **not** invent extra documents (Customer, Payment, Tax) without a new decision  
- Do **not** implement controllers/services/routes until decisions are explicit  

---

# Part 8 — Implementation blockers (must be answered)

1. Identity: username only? phone unique/required? email needed? **(Rec: username only)**  
2. Batch/expiry: v1 or deferred? **(Rec: deferred)**  
3. Returns: v1 or deferred? **(Rec: deferred; do not use REFUNDED)**  
4. Reservations: use reservedQuantity now or freeze at 0? **(Rec: always 0)**  
5. Transfer: atomic complete-only vs IN_TRANSIT? **(Rec: atomic)**  
6. Idempotency key shape **(Rec: unique referenceType+referenceId+type+productId+warehouseId)**  
7. averageCost formula including zero-stock and adjustments **(Rec: WAC inbound; freeze at 0; adjustment does not change WAC)**  
8. Duplicate product lines **(Rec: forbid on PO/sale/adjustment)**  
9. PO warehouse **(Rec: receipt only)**  
10. Sale cancel/refund **(Rec: cancel DRAFT only; no returns in v1)**  
11. Document number generation **(Rec: sequence table)**  
12. Permission naming **(Rec: unique module+action)**  
13. onDelete PO↔Receipt **(Rec: RESTRICT both sides)**  

---

# Part 9 — Suggested implementation order (after approval)

1. Apply approved **required model changes** + migrations.  
2. Fix boot (`modules/index.js`) and auth seed/middleware to match User.  
3. Shared infrastructure: decimal helper, document numbers, inventory lock+ledger writer, permission middleware.  
4. Auth: login/refresh/logout/me + RBAC CRUD.  
5. Catalog + warehouse CRUD.  
6. Inventory read + stock-transaction read.  
7. Purchase order → stock receipt (stock in).  
8. Sale (stock out).  
9. Stock adjustment.  
10. Stock transfer (atomic).  
11. Audit log write + list.

---

**STOP.** Owner should answer **Accept recommended v1** (all Recs) or override specific IDs (D1–D38). Implementation should not start until those answers are explicit.
