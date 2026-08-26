const sequelize = require("../../config/db");
const models = require("../models");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const decimal = require("../../shared/helpers/decimal.helper");

const {
  Role,
  Permission,
  RolePermission,
  User,
  Category,
  Supplier,
  Product,
  Warehouse,
  Customer,
  PriceHistory,
  CustomerPrice,
  PurchaseOrder,
  PurchaseOrderItem,
  StockReceipt,
  StockReceiptItem,
  Sale,
  SaleItem,
  StockAdjustment,
  StockAdjustmentItem,
  StockTransfer,
  StockTransferItem,
  SupplierPayment,
  CustomerPayment,
  AuditLog,
} = models;

const daysAgo = (n) => {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  date.setDate(date.getDate() - n);
  return date;
};

const findOrCreate = async (Model, where, defaults = {}) => {
  const [row] = await Model.findOrCreate({
    where,
    defaults: { ...where, ...defaults },
  });
  return row;
};

async function seedRoles() {
  const names = [
    ["CASHIER", "Front desk sales and cash"],
    ["STOREKEEPER", "Warehouse receiving and counts"],
    ["SALESPERSON", "Customer orders and follow-up"],
    ["PURCHASER", "Supplier buying"],
    ["AUDITOR", "Read-only audit and reports"],
  ];
  const roles = {};
  for (const [name, description] of names) {
    roles[name] = await findOrCreate(Role, { name }, { description, status: "ACTIVE" });
  }
  roles.ADMIN = await Role.findOne({ where: { name: "ADMIN" } });
  return roles;
}

async function seedStaff(roles) {
  const staff = [
    ["cashier1", "Marta Cashier", "251911000001", "CASHIER"],
    ["store1", "Dawit Storekeeper", "251911000002", "STOREKEEPER"],
    ["sales1", "Hana Sales", "251911000003", "SALESPERSON"],
    ["buyer1", "Yonas Purchaser", "251911000004", "PURCHASER"],
    ["audit1", "Selam Auditor", "251911000005", "AUDITOR"],
    ["cashier2", "Abel Cashier", "251911000006", "CASHIER"],
  ];
  const users = {};
  for (const [username, fullName, phone, roleName] of staff) {
    users[username] = await findOrCreate(
      User.unscoped(),
      { username },
      {
        fullName,
        phone,
        password: "Staff@123",
        roleId: roles[roleName].id,
        status: "ACTIVE",
      },
    );
  }
  users.admin = await User.unscoped().findOne({
    where: { username: process.env.ADMIN_SEED_USERNAME || "admin" },
  });
  return users;
}

async function seedStaffPermissions(roles) {
  const map = {
    CASHIER: [
      ["sales", "CREATE"],
      ["sales", "READ"],
      ["catalog", "READ"],
      ["inventory", "READ"],
      ["customers", "READ"],
      ["customers", "CREATE"],
    ],
    STOREKEEPER: [
      ["inventory", "CREATE"],
      ["inventory", "READ"],
      ["inventory", "UPDATE"],
      ["warehouse", "READ"],
      ["purchasing", "READ"],
      ["catalog", "READ"],
    ],
    SALESPERSON: [
      ["sales", "CREATE"],
      ["sales", "READ"],
      ["sales", "UPDATE"],
      ["customers", "CREATE"],
      ["customers", "READ"],
      ["insights", "READ"],
    ],
    PURCHASER: [
      ["purchasing", "CREATE"],
      ["purchasing", "READ"],
      ["purchasing", "UPDATE"],
      ["catalog", "READ"],
      ["inventory", "READ"],
      ["insights", "READ"],
    ],
    AUDITOR: [
      ["audit", "READ"],
      ["insights", "READ"],
      ["sales", "READ"],
      ["purchasing", "READ"],
      ["inventory", "READ"],
      ["catalog", "READ"],
    ],
  };

  for (const [roleName, pairs] of Object.entries(map)) {
    const role = roles[roleName];
    for (const [moduleName, action] of pairs) {
      const permission = await Permission.findOne({ where: { module: moduleName, action } });
      if (!permission) continue;
      await findOrCreate(RolePermission, { roleId: role.id, permissionId: permission.id });
    }
  }
}

async function seedLookups(adminId) {
  const categoryNames = [
    ["Fruits", "Fresh fruit"],
    ["Vegetables", "Fresh vegetables"],
    ["Drinks", "Bottled water and drinks"],
    ["Grains", "Rice, flour, cereals"],
    ["Oils", "Cooking oil"],
    ["Dry goods", "Sugar and staples"],
  ];
  const categories = {};
  for (const [name, description] of categoryNames) {
    categories[name] = await findOrCreate(Category, { name }, { description, status: "ACTIVE" });
  }

  const supplierRows = [
    ["Merkato Fruit Traders", "Abebe"],
    ["Oromia Vegetable Union", "Chaltu"],
    ["Awash Bottled Water", "Tigist"],
    ["Adama Grain Supply", "Kebede"],
    ["Hawassa Oil Mill", "Samuel"],
    ["Dire Dawa Dry Goods", "Fatuma"],
    ["Bole Fresh Market", "Helen"],
    ["Kaliti Produce", "Mulugeta"],
  ];
  const suppliers = [];
  for (const [name, contactPerson] of supplierRows) {
    suppliers.push(
      await findOrCreate(
        Supplier,
        { name },
        {
          contactPerson,
          phone: `25191${String(2000000 + suppliers.length).slice(-7)}`,
          status: "ACTIVE",
        },
      ),
    );
  }

  const warehouseRows = [
    ["Merkato Main", "MRK"],
    ["Piazza Shop", "PIA"],
    ["Bole Store", "BOL"],
    ["Kaliti Depot", "KAL"],
    ["Adama Branch", "ADA"],
    ["Hawassa Branch", "HAW"],
  ];
  const warehouses = [];
  for (const [name, code] of warehouseRows) {
    warehouses.push(
      await findOrCreate(
        Warehouse,
        { code },
        {
          name,
          address: { city: name.split(" ")[0], country: "ET" },
          managerName: "Store manager",
          phone: "251911111111",
          status: "ACTIVE",
        },
      ),
    );
  }

  const productRows = [
    ["ORG-KG", "Orange", "Fruits", "KG", 45, 80],
    ["BAN-KG", "Banana", "Fruits", "KG", 28, 50],
    ["APL-KG", "Apple", "Fruits", "KG", 90, 140],
    ["TOM-KG", "Tomato", "Vegetables", "KG", 22, 40],
    ["ONI-KG", "Onion", "Vegetables", "KG", 18, 35],
    ["POT-KG", "Potato", "Vegetables", "KG", 15, 28],
    ["WTR-LTR", "Water", "Drinks", "LITER", 12, 33],
    ["OIL-LTR", "Cooking oil", "Oils", "LITER", 140, 190],
    ["RCE-SACK", "Rice", "Grains", "SACK", 1800, 2400],
    ["SGR-KG", "Sugar", "Dry goods", "KG", 55, 75],
  ];
  const products = [];
  for (const [sku, name, categoryName, unit, purchasePrice, sellingPrice] of productRows) {
    products.push(
      await findOrCreate(
        Product,
        { sku },
        {
          name,
          categoryId: categories[categoryName].id,
          supplierId: suppliers[products.length % suppliers.length].id,
          unit,
          purchasePrice,
          sellingPrice,
          reorderLevel: 10,
          reorderQuantity: 50,
          status: "ACTIVE",
        },
      ),
    );
  }

  const customerRows = [
    ["Alem Mini Market", "251922000001", "Alem Mini Market", "Piassa"],
    ["Selam Kiosk", "251922000002", "Selam Kiosk", "Merkato"],
    ["Bole Cafe", "251922000003", "Bole Cafe", "Bole"],
    ["Kaliti Wholesale", "251922000004", "Kaliti Wholesale", "Kaliti"],
    ["Adama Mart", "251922000005", "Adama Mart", "Adama"],
    ["Hawassa Shop", "251922000006", "Hawassa Shop", "Hawassa"],
    ["Lidya Retail", "251922000007", null, "CMC"],
    ["Yonas Trader", "251922000008", "Yonas Trading", "Saris"],
  ];
  const customers = [];
  for (const [name, phone, businessName, location] of customerRows) {
    customers.push(
      await findOrCreate(
        Customer,
        { phone },
        {
          name,
          businessName,
          location,
          createdBy: adminId,
          creditLimit: 5000,
          status: "ACTIVE",
        },
      ),
    );
  }

  return { categories, suppliers, warehouses, products, customers };
}

async function seedCatalogExtras(products, customers, adminId) {
  for (let i = 0; i < 8; i += 1) {
    const product = products[i];
    const existing = await PriceHistory.count({ where: { productId: product.id } });
    if (existing) continue;
    await PriceHistory.create({
      productId: product.id,
      changedBy: adminId,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      note: "Opening price",
    });
  }

  for (let i = 0; i < 8; i += 1) {
    await findOrCreate(
      CustomerPrice,
      {
        customerId: customers[i % customers.length].id,
        productId: products[i].id,
        minQuantity: 10,
      },
      { unitPrice: decimal.money(Number(products[i].sellingPrice) - 5) },
    );
  }
}

async function seedDocuments({ users, suppliers, warehouses, products, customers }) {
  const existing = await PurchaseOrder.findOne({ where: { orderNumber: "PO-SEED-000001" } });
  if (existing) {
    console.log("✅ Demo documents already present — skipped");
    return;
  }

  const adminId = users.admin.id;
  const main = warehouses[0];

  await sequelize.transaction(async (transaction) => {
    const posting = {
      lockInventories: (pairs) => inventoryPosting.lockInventories(pairs, transaction),
      postInbound: (args) => inventoryPosting.postInbound(args, transaction),
      postOutbound: (args) => inventoryPosting.postOutbound(args, transaction),
      setOnHandToActual: (args) => inventoryPosting.setOnHandToActual(args, transaction),
    };

    const poSpecs = [
      [0, [[0, 220, 45], [1, 180, 28]]],
      [2, [[6, 400, 12], [7, 90, 140]]],
      [3, [[3, 200, 22], [4, 170, 18]]],
      [5, [[5, 210, 15], [2, 95, 90]]],
      [4, [[8, 40, 1800], [9, 130, 55]]],
      [1, [[0, 80, 45], [6, 120, 12]]],
    ];

    const purchaseOrders = [];
    for (let i = 0; i < poSpecs.length; i += 1) {
      const [supplierIndex, lines] = poSpecs[i];
      const subtotal = lines.reduce((sum, [, qty, price]) => sum + qty * price, 0);
      const po = await PurchaseOrder.create(
        {
          supplierId: suppliers[supplierIndex].id,
          createdBy: adminId,
          orderNumber: `PO-SEED-${String(i + 1).padStart(6, "0")}`,
          orderDate: daysAgo(9 - i),
          subtotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: subtotal,
          paidAmount: 0,
          status: "COMPLETED",
          notes: "Demo seed purchase",
        },
        { transaction },
      );
      const poItems = [];
      for (const [productIndex, quantity, unitPrice] of lines) {
        const item = await PurchaseOrderItem.create(
          {
            purchaseOrderId: po.id,
            productId: products[productIndex].id,
            quantity,
            receivedQuantity: quantity,
            unitPrice,
            totalPrice: quantity * unitPrice,
          },
          { transaction },
        );
        poItems.push({ item, productIndex, quantity, unitPrice });
      }
      purchaseOrders.push({ po, poItems, supplierIndex });
    }

    for (let i = 0; i < purchaseOrders.length; i += 1) {
      const { po, poItems } = purchaseOrders[i];
      const receipt = await StockReceipt.create(
        {
          purchaseOrderId: po.id,
          warehouseId: main.id,
          receivedBy: adminId,
          receiptNumber: `RC-SEED-${String(i + 1).padStart(6, "0")}`,
          receiptDate: daysAgo(8 - i),
          status: "COMPLETED",
          notes: "Demo seed receipt",
        },
        { transaction },
      );
      const pairs = poItems.map((row) => ({
        productId: products[row.productIndex].id,
        warehouseId: main.id,
      }));
      const locked = await posting.lockInventories(pairs);
      for (const row of poItems) {
        await StockReceiptItem.create(
          {
            stockReceiptId: receipt.id,
            purchaseOrderItemId: row.item.id,
            productId: products[row.productIndex].id,
            quantity: row.quantity,
            unitCost: row.unitPrice,
          },
          { transaction },
        );
        await posting.postInbound({
          inventory: locked[`${products[row.productIndex].id}|${main.id}`],
          quantity: row.quantity,
          unitCost: row.unitPrice,
          type: "PURCHASE",
          createdBy: adminId,
          referenceType: "STOCK_RECEIPT",
          referenceId: receipt.id,
          notes: receipt.receiptNumber,
        });
      }
    }

    const saleSpecs = [
      [0, "CASH", [[0, 12, 80], [6, 20, 33]]],
      [1, "MOBILE_MONEY", [[1, 15, 50], [3, 10, 40]]],
      [2, "CASH", [[4, 8, 35], [5, 14, 28]]],
      [3, "BANK_TRANSFER", [[9, 20, 75], [7, 6, 190]]],
      [4, "CREDIT", [[8, 2, 2400], [2, 8, 140]]],
      [5, "CASH", [[0, 6, 80], [6, 18, 33]]],
    ];

    const sales = [];
    for (let i = 0; i < saleSpecs.length; i += 1) {
      const [customerIndex, paymentMethod, lines] = saleSpecs[i];
      const subtotal = lines.reduce((sum, [, qty, price]) => sum + qty * price, 0);
      const customer = customers[customerIndex];
      const sale = await Sale.create(
        {
          warehouseId: main.id,
          createdBy: adminId,
          customerId: customer.id,
          invoiceNumber: `INV-SEED-${String(i + 1).padStart(6, "0")}`,
          customerName: customer.name,
          customerPhone: customer.phone,
          saleDate: daysAgo(6 - i),
          subtotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: subtotal,
          paidAmount: paymentMethod === "CREDIT" ? 0 : subtotal,
          paymentMethod,
          status: "COMPLETED",
          notes: "Demo seed sale",
        },
        { transaction },
      );
      const pairs = lines.map(([productIndex]) => ({
        productId: products[productIndex].id,
        warehouseId: main.id,
      }));
      const locked = await posting.lockInventories(pairs);
      for (const [productIndex, quantity, unitPrice] of lines) {
        await SaleItem.create(
          {
            saleId: sale.id,
            productId: products[productIndex].id,
            quantity,
            unitPrice,
            discountAmount: 0,
            totalPrice: quantity * unitPrice,
          },
          { transaction },
        );
        await posting.postOutbound({
          inventory: locked[`${products[productIndex].id}|${main.id}`],
          quantity,
          type: "SALE",
          createdBy: adminId,
          referenceType: "SALE",
          referenceId: sale.id,
          notes: sale.invoiceNumber,
        });
      }
      sales.push(sale);
    }

    for (let i = 0; i < 5; i += 1) {
      const dest = warehouses[i + 1];
      const product = products[i];
      const transfer = await StockTransfer.create(
        {
          sourceWarehouseId: main.id,
          destinationWarehouseId: dest.id,
          createdBy: adminId,
          transferNumber: `TR-SEED-${String(i + 1).padStart(6, "0")}`,
          transferDate: daysAgo(3),
          status: "COMPLETED",
          notes: "Demo seed transfer",
        },
        { transaction },
      );
      await StockTransferItem.create(
        {
          stockTransferId: transfer.id,
          productId: product.id,
          quantity: 10,
          receivedQuantity: 10,
        },
        { transaction },
      );
      const locked = await posting.lockInventories([
        { productId: product.id, warehouseId: main.id },
        { productId: product.id, warehouseId: dest.id },
      ]);
      const out = await posting.postOutbound({
        inventory: locked[`${product.id}|${main.id}`],
        quantity: 10,
        type: "TRANSFER_OUT",
        createdBy: adminId,
        referenceType: "STOCK_TRANSFER",
        referenceId: transfer.id,
        notes: transfer.transferNumber,
      });
      await posting.postInbound({
        inventory: locked[`${product.id}|${dest.id}`],
        quantity: 10,
        unitCost: out.unitCost,
        type: "TRANSFER_IN",
        createdBy: adminId,
        referenceType: "STOCK_TRANSFER",
        referenceId: transfer.id,
        notes: transfer.transferNumber,
      });
    }

    for (let i = 0; i < 5; i += 1) {
      const product = products[i];
      const locked = await posting.lockInventories([
        { productId: product.id, warehouseId: main.id },
      ]);
      const inv = locked[`${product.id}|${main.id}`];
      const systemQty = Number(inv.quantity);
      const actualQty = Math.max(systemQty - 1, 1);
      const adjustment = await StockAdjustment.create(
        {
          warehouseId: main.id,
          createdBy: adminId,
          adjustmentNumber: `ADJ-SEED-${String(i + 1).padStart(6, "0")}`,
          reason: "Demo count difference",
          adjustmentDate: daysAgo(2),
          status: "COMPLETED",
        },
        { transaction },
      );
      await StockAdjustmentItem.create(
        {
          stockAdjustmentId: adjustment.id,
          productId: product.id,
          systemQuantity: systemQty,
          actualQuantity: actualQty,
          difference: actualQty - systemQty,
          reason: "Shrinkage sample",
        },
        { transaction },
      );
      await posting.setOnHandToActual({
        inventory: inv,
        actualQuantity: actualQty,
        createdBy: adminId,
        referenceType: "STOCK_ADJUSTMENT",
        referenceId: adjustment.id,
        notes: adjustment.adjustmentNumber,
      });
    }

    for (let i = 0; i < 6; i += 1) {
      const { po, supplierIndex } = purchaseOrders[i];
      const amount = Number(po.totalAmount) * 0.5;
      await SupplierPayment.create(
        {
          supplierId: suppliers[supplierIndex].id,
          purchaseOrderId: po.id,
          recordedBy: adminId,
          amount,
          method: i % 2 === 0 ? "CASH" : "BANK_TRANSFER",
          paidAt: daysAgo(4),
          notes: "Demo supplier payment",
        },
        { transaction },
      );
      po.paidAmount = amount;
      await po.save({ transaction });
    }

    for (let i = 0; i < 6; i += 1) {
      const sale = sales[i];
      if (sale.paymentMethod === "CREDIT") continue;
      await CustomerPayment.create(
        {
          customerId: sale.customerId,
          saleId: sale.id,
          recordedBy: adminId,
          amount: sale.totalAmount,
          method: sale.paymentMethod === "MOBILE_MONEY" ? "MOBILE_MONEY" : "CASH",
          paidAt: sale.saleDate,
          notes: "Demo customer payment",
        },
        { transaction },
      );
    }

    const creditSale = sales.find((s) => s.paymentMethod === "CREDIT");
    if (creditSale) {
      const partial = Number(creditSale.totalAmount) * 0.4;
      await CustomerPayment.create(
        {
          customerId: creditSale.customerId,
          saleId: creditSale.id,
          recordedBy: adminId,
          amount: partial,
          method: "MOBILE_MONEY",
          paidAt: daysAgo(1),
          notes: "Partial credit collection",
        },
        { transaction },
      );
      creditSale.paidAmount = partial;
      await creditSale.save({ transaction });
    }

    const auditActions = [
      ["CREATE", "Product"],
      ["CREATE", "PurchaseOrder"],
      ["STOCK_IN", "StockReceipt"],
      ["STOCK_OUT", "Sale"],
      ["TRANSFER", "StockTransfer"],
      ["ADJUSTMENT", "StockAdjustment"],
      ["LOGIN", "User"],
      ["UPDATE", "Customer"],
    ];
    for (const [action, entityType] of auditActions) {
      await AuditLog.create(
        {
          userId: adminId,
          action,
          entityType,
          description: `Demo seed ${action} ${entityType}`,
          ipAddress: "127.0.0.1",
        },
        { transaction },
      );
    }
  });

  console.log("✅ Demo data seeded (5–10 rows per operational model)");
}

module.exports = async () => {
  const roles = await seedRoles();
  const users = await seedStaff(roles);
  if (!users.admin) {
    console.warn("⚠️ Demo seed skipped: admin user not found");
    return;
  }
  await seedStaffPermissions(roles);
  const lookups = await seedLookups(users.admin.id);
  await seedCatalogExtras(lookups.products, lookups.customers, users.admin.id);
  await seedDocuments({ users, ...lookups });
};
