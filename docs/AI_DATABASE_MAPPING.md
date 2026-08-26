# AI database mapping

This document maps every AI / analytics calculation to **existing** MySQL tables. No business tables were added. Numbers come only from these sources.

Costing method in this application: **weighted average cost (WAC)**. Inbound receipts update `inventory.averageCost`. Outbound sales snapshot that WAC onto `stock_transactions.unitCost`. Product profit uses that snapshot when present.

## 1. Sales

| Use | Table | Columns |
|-----|--------|---------|
| Completed invoices | `sales` | `id`, `companyId`, `warehouseId`, `createdBy`, `customerId`, `invoiceNumber`, `saleDate`, `subtotal`, `discountAmount`, `totalAmount`, `paidAmount`, `paymentMethod`, `status` |
| Lines | `sale_items` | `saleId`, `productId`, `quantity`, `unitPrice`, `discountAmount`, `totalPrice` |

Only `status = 'COMPLETED'` counts as sold. Draft/cancelled invoices are excluded.

## 2. Purchases

| Use | Table | Columns |
|-----|--------|---------|
| Orders | `purchase_orders` | `id`, `companyId`, `supplierId`, `createdBy`, `orderNumber`, `orderDate`, `subtotal`, `discountAmount`, `totalAmount`, `paidAmount`, `paymentMethod`, `status` |
| Lines | `purchase_order_items` | `purchaseOrderId`, `productId`, `quantity`, `receivedQuantity`, `unitPrice`, `totalPrice`, `deliveryStatus`, `warehouseId` |

Cancelled POs are excluded. Purchase **cost of goods** for sold items is **not** taken from the PO line price; it is taken from the WAC snapshot at sale time (below).

## 3. Product costs

| Use | Table | Columns |
|-----|--------|---------|
| Exact COGS for a sold line | `stock_transactions` | `type='SALE'`, `referenceType='SALE'`, `referenceId` = `sales.id`, `productId`, `warehouseId`, `quantity`, `unitCost` |
| Current on-hand WAC | `inventory` | `averageCost` |
| List purchase price (fallback only) | `products` | `purchasePrice` |
| Recorded list-price changes | `price_histories` | `purchasePrice`, `sellingPrice`, `createdAt` |

If a sale line has no matching `stock_transactions` row, COGS is **estimated** from current `inventory.averageCost`, then `products.purchasePrice`. The API labels those rows `costBasis: "estimate"`.

## 4. Stock

| Use | Table | Columns |
|-----|--------|---------|
| On-hand by product × warehouse | `inventory` | `productId`, `warehouseId`, `companyId`, `quantity`, `reservedQuantity`, `averageCost` |
| Reorder point | `products` | `reorderLevel`, `reorderQuantity` |
| Ledger | `stock_transactions` | `type`, `quantity`, `unitCost`, `createdAt` |

Available stock = `quantity - reservedQuantity` (`reservedQuantity` is kept at 0 in v1).

Inventory value = `quantity * averageCost` per row.

## 5. Warehouses

| Use | Table | Columns |
|-----|--------|---------|
| Stores | `warehouses` | `id`, `companyId`, `name`, `code`, `status` |

Sales warehouse = `sales.warehouseId`. Purchase delivery warehouse = `purchase_order_items.warehouseId`.

## 6. Salesmen / employees

| Use | Table | Columns |
|-----|--------|---------|
| Users | `users` | `id`, `companyId`, `fullName`, `username`, `roleId`, `allWarehouses` |
| Role | `roles` | `name` (`COMPANY_OWNER`, `SALESMAN`, `ADMIN`) |
| Store assignment | `user_warehouses` | `userId`, `warehouseId` |

A sale is attributed to the salesman who created it: `sales.createdBy`. There is **no sales-target table**.

## 7. Transfers

| Use | Table | Columns |
|-----|--------|---------|
| Header | `stock_transfers` | `sourceWarehouseId`, `destinationWarehouseId`, `companyId`, `transferDate`, `status` |
| Lines | `stock_transfer_items` | `productId`, `quantity`, `receivedQuantity` |

Only `status = 'COMPLETED'` is counted. v1 completes in one step (no in-transit stock).

## 8. How profit is calculated

For each completed sale line in the requested period and permitted warehouses:

```
revenue     = sale_items.totalPrice          (net of line discount)
cogs        = sale_items.quantity * stock_transactions.unitCost   (WAC snapshot)
grossProfit = revenue - cogs
marginPct   = grossProfit / revenue * 100     (null if revenue is 0)
```

Company operating expenses (`expenses`) are **not** allocated to products. They are shown separately on the AI dashboard as operating expenses when the user may read finance data.

## 9. Fully supported from existing data

- Sales totals and trends (today / week / month / year and comparisons)
- Sales by product, category, warehouse, salesman, customer, payment method
- Gross profit by product, category, warehouse, salesman, date range
- Top / loss-making products (from WAC COGS)
- High-volume low-margin and low-volume high-margin products
- Salesman ranking by revenue, profit, margin, growth (no targets)
- Warehouse sales, stock value, profit, transfers in/out, low / dead / fast / slow stock
- Inventory valuation, low stock vs `reorderLevel`, overstock vs sales velocity
- Dead stock (no completed sales in N days while qty > 0)
- Stockout risk (qty / average daily sales)
- Purchase recommendations (not auto-creating POs)
- Purchase totals by supplier / product / warehouse
- Purchase list-price increases/decreases from `price_histories`
- Transfer flows and transfer-instead-of-buy hints when one store is overstocked and another is buying or low

## 10. Not in the schema (AI will say so)

| Requested feature | Status |
|-------------------|--------|
| Sales returns / refunds / SALE_RETURN | Not posted in v1 |
| Salesman targets / target achievement | No table |
| FIFO layers | Not used; WAC only |
| Serial/lot identity | Unused for allocation |
| Hour-of-day sales | `saleDate` is a timestamp; hour buckets are used when the time portion is present |
| Extra landed costs beyond WAC | Not stored |
| Product-level allocation of rent/salary expenses | Not stored |

## Permission scope

Every query binds `companyId` from the logged-in user. Warehouse-limited salesmen only see `sales.warehouseId` / `inventory.warehouseId` in their assigned stores. The AI model never runs SQL; it only chooses a named analytics function.
