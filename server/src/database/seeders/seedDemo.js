const sequelize = require("../../config/db");
const models = require("../models");
const env = require("../../config/env");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const decimal = require("../../shared/helpers/decimal.helper");

const {
  Role,
  Permission,
  RolePermission,
  User,
  Company,
  CompanyProfile,
  PaymentMethod,
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
  CustomerOrder,
  CustomerOrderItem,
  Expense,
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

async function seedCompanyAndOwner() {
  const username = env.DEMO_COMPANY_USERNAME;
  const password = env.DEMO_COMPANY_PASSWORD;
  if (!username || !password) {
    console.warn("⚠️ Demo company skipped: DEMO_COMPANY_USERNAME / PASSWORD not set");
    return null;
  }

  const phone =
    phoneNormalize(env.DEMO_COMPANY_PHONE) || env.DEMO_COMPANY_PHONE;
  const name = env.DEMO_COMPANY_NAME || "Abdu Building Materials";
  const address = env.DEMO_COMPANY_ADDRESS || "Merkato, Addis Ababa";

  let ownerRole = await Role.findOne({ where: { name: "COMPANY_OWNER" } });
  if (!ownerRole) {
    ownerRole = await Role.create({
      name: "COMPANY_OWNER",
      description: "Company owner with full access",
      status: "ACTIVE",
    });
  }

  let company = await Company.findOne({ where: { phone } });
  if (!company) {
    company = await Company.findOne({ where: { name } });
  }
  if (!company) {
    company = await Company.create({
      name,
      phone,
      address,
      status: "ACTIVE",
    });
    console.log(`✅ Demo company created: ${name}`);
  }

  await findOrCreate(
    CompanyProfile,
    { companyId: company.id },
    { name, phone, address, tin: "0001234567" },
  );

  let owner = await User.unscoped().findOne({ where: { username } });
  if (!owner) {
    owner = await User.create({
      fullName: "Abdu Owner",
      username,
      phone,
      password,
      roleId: ownerRole.id,
      companyId: company.id,
      allWarehouses: true,
      status: "ACTIVE",
    });
    console.log(`✅ Demo owner seeded: ${username}`);
  } else if (!owner.companyId) {
    owner.companyId = company.id;
    owner.roleId = ownerRole.id;
    owner.allWarehouses = true;
    await owner.save();
  }

  for (const method of ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "CREDIT"]) {
    await findOrCreate(
      PaymentMethod,
      { name: method, companyId: company.id },
      { status: "ACTIVE" },
    );
  }

  return { company, owner, ownerRole };
}

async function seedStaff(company, ownerRole) {
  const names = [
    ["CASHIER", "Front desk sales and cash"],
    ["STOREKEEPER", "Warehouse receiving and counts"],
    ["SALESPERSON", "Customer orders and follow-up"],
    ["PURCHASER", "Supplier buying"],
  ];
  const roles = { COMPANY_OWNER: ownerRole };
  for (const [name, description] of names) {
    roles[name] = await findOrCreate(Role, { name }, { description, status: "ACTIVE" });
  }

  const permissionMap = {
    CASHIER: [
      ["sales", "CREATE"],
      ["sales", "READ"],
      ["catalog", "READ"],
      ["inventory", "READ"],
      ["customers", "READ"],
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
    ],
  };
  for (const [roleName, pairs] of Object.entries(permissionMap)) {
    const role = roles[roleName];
    for (const [moduleName, action] of pairs) {
      const permission = await Permission.findOne({
        where: { module: moduleName, action },
      });
      if (!permission) continue;
      await findOrCreate(RolePermission, {
        roleId: role.id,
        permissionId: permission.id,
      });
    }
  }

  const staffRows = [
    ["abdu.cashier", "Marta Cashier", "251911000101", "CASHIER"],
    ["abdu.store", "Dawit Storekeeper", "251911000102", "STOREKEEPER"],
    ["abdu.sales", "Hana Sales", "251911000103", "SALESPERSON"],
    ["abdu.buyer", "Yonas Purchaser", "251911000104", "PURCHASER"],
  ];
  const users = {};
  for (const [username, fullName, phone, roleName] of staffRows) {
    users[username] = await findOrCreate(
      User.unscoped(),
      { username },
      {
        fullName,
        phone,
        password: "Staff@123",
        roleId: roles[roleName].id,
        companyId: company.id,
        allWarehouses: true,
        status: "ACTIVE",
      },
    );
    if (!users[username].companyId) {
      users[username].companyId = company.id;
      await users[username].save();
    }
  }
  return users;
}

async function seedCatalog(companyId, ownerId) {
  const categoryRows = [
    ["Cement", "OPC and PPC bags"],
    ["Steel & rebar", "Reinforcement bars and wire"],
    ["Blocks & masonry", "Hollow blocks and bricks"],
    ["Aggregates", "Sand, gravel, and crush"],
    ["Roofing", "CGI sheets and accessories"],
    ["Plumbing", "PVC and fittings"],
    ["Electrical", "Cables and conduit"],
    ["Finishing", "Paint, tiles, and gypsum"],
  ];
  const categories = {};
  for (const [name, description] of categoryRows) {
    categories[name] = await findOrCreate(
      Category,
      { name, companyId },
      { description, status: "ACTIVE" },
    );
  }

  const supplierRows = [
    ["Dangote Cement Ethiopia", "Amanuel", "251911300001"],
    ["Derba Midroc Cement", "Selam", "251911300002"],
    ["Habesha Steel PLC", "Bereket", "251911300003"],
    ["Kaliti Metal Products", "Tigist", "251911300004"],
    ["Awash Sand & Gravel", "Kebede", "251911300005"],
    ["Bole Plumbing Supply", "Helen", "251911300006"],
  ];
  const suppliers = [];
  for (const [name, contactPerson, phone] of supplierRows) {
    suppliers.push(
      await findOrCreate(
        Supplier,
        { name, companyId },
        { contactPerson, phone, status: "ACTIVE", paymentTerms: "Net 30" },
      ),
    );
  }

  const warehouseRows = [
    ["Merkato Yard", "ABD-MRK", "Merkato"],
    ["Kaliti Depot", "ABD-KAL", "Kaliti"],
    ["Bole Shop", "ABD-BOL", "Bole"],
  ];
  const warehouses = [];
  for (const [name, code, city] of warehouseRows) {
    warehouses.push(
      await findOrCreate(
        Warehouse,
        { code, companyId },
        {
          name,
          address: { city, country: "ET" },
          managerName: "Yard manager",
          phone: "251911111222",
          status: "ACTIVE",
        },
      ),
    );
  }

  const productRows = [
    ["CEM-DANG-50", "Dangote OPC 42.5 50kg", "Cement", "Dangote", "50kg", "BAG", 720, 850, 80, 200, 0],
    ["CEM-DERB-50", "Derba PPC 32.5 50kg", "Cement", "Derba", "50kg", "BAG", 640, 760, 80, 200, 0],
    ["CEM-HABE-50", "Habesha OPC 42.5 50kg", "Cement", "Habesha", "50kg", "BAG", 700, 820, 60, 150, 1],
    ["STL-RB-08", "Rebar 8mm", "Steel & rebar", "Habesha Steel", "8mm", "TON", 78000, 89000, 4, 10, 2],
    ["STL-RB-12", "Rebar 12mm", "Steel & rebar", "Habesha Steel", "12mm", "TON", 79000, 91000, 4, 10, 2],
    ["STL-RB-16", "Rebar 16mm", "Steel & rebar", "Kaliti Metal", "16mm", "TON", 80000, 93000, 3, 8, 3],
    ["STL-WIRE", "Binding wire", "Steel & rebar", "Kaliti Metal", "25kg", "ROLL", 1800, 2400, 20, 50, 3],
    ["BLK-HB-20", "Hollow block 20cm", "Blocks & masonry", "", "20cm", "PCS", 18, 28, 500, 2000, 4],
    ["BLK-HB-15", "Hollow block 15cm", "Blocks & masonry", "", "15cm", "PCS", 14, 22, 500, 2000, 4],
    ["AGG-SAND", "River sand", "Aggregates", "Awash", "m3", "M3", 1200, 1800, 10, 30, 4],
    ["AGG-GRVL", "Crushed gravel", "Aggregates", "Awash", "m3", "M3", 1400, 2100, 10, 30, 4],
    ["ROOF-CGI-04", "CGI sheet 0.4mm", "Roofing", "", "0.4mm", "PCS", 420, 580, 40, 100, 3],
    ["PLB-PVC-4", "PVC pipe 4 inch", "Plumbing", "", "4in", "PCS", 210, 320, 30, 80, 5],
    ["ELE-CAB-25", "Cable 2.5mm", "Electrical", "", "2.5mm", "ROLL", 850, 1200, 15, 40, 5],
    ["FIN-PNT-20", "Emulsion paint 20L white", "Finishing", "", "20L", "PAIL", 1600, 2300, 10, 30, 5],
    ["FIN-TIL-40", "Floor tile 40x40", "Finishing", "", "40x40", "BOX", 380, 520, 20, 60, 5],
  ];
  const products = [];
  for (const row of productRows) {
    const [
      sku,
      name,
      categoryName,
      brand,
      size,
      unit,
      purchasePrice,
      sellingPrice,
      reorderLevel,
      reorderQuantity,
      supplierIndex,
    ] = row;
    products.push(
      await findOrCreate(
        Product,
        { sku, companyId },
        {
          name,
          brand: brand || null,
          size: size || null,
          categoryId: categories[categoryName].id,
          supplierId: suppliers[supplierIndex].id,
          unit,
          purchasePrice,
          sellingPrice,
          reorderLevel,
          reorderQuantity,
          status: "ACTIVE",
        },
      ),
    );
  }

  const customerRows = [
    ["Sunshine Construction", "251922100001", "Sunshine Construction PLC", "Bole", 250000],
    ["Habesha Contractors", "251922100002", "Habesha Contractors", "Piassa", 180000],
    ["Bole Hardware", "251922100003", "Bole Hardware", "Bole", 40000],
    ["Piassa Building Store", "251922100004", "Piassa Building Store", "Piassa", 35000],
    ["Adama Site Office", "251922100005", "Adama Housing Site", "Adama", 120000],
    ["Kaliti Block Factory", "251922100006", "Kaliti Block Factory", "Kaliti", 60000],
    ["Yeka Housing Project", "251922100007", "Yeka Housing", "Yeka", 200000],
    ["CMC Mini Hardware", "251922100008", "CMC Mini Hardware", "CMC", 25000],
  ];
  const customers = [];
  for (const [name, phone, businessName, location, creditLimit] of customerRows) {
    customers.push(
      await findOrCreate(
        Customer,
        { phone, companyId },
        {
          name,
          businessName,
          location,
          creditLimit,
          createdBy: ownerId,
          type: "CUSTOMER",
          status: "ACTIVE",
        },
      ),
    );
  }

  for (const product of products) {
    const existing = await PriceHistory.count({
      where: { productId: product.id, companyId },
    });
    if (!existing) {
      await PriceHistory.create({
        productId: product.id,
        companyId,
        changedBy: ownerId,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        note: "Opening wholesale list",
      });
    }
  }

  for (let i = 0; i < 6; i += 1) {
    await findOrCreate(
      CustomerPrice,
      {
        customerId: customers[i].id,
        productId: products[0].id,
        minQuantity: 50,
        companyId,
      },
      { unitPrice: decimal.money(Number(products[0].sellingPrice) - 30) },
    );
  }

  return { categories, suppliers, warehouses, products, customers };
}

async function seedDocuments({ company, owner, staff, catalog }) {
  const companyId = company.id;
  const ownerId = owner.id;
  const { suppliers, warehouses, products, customers } = catalog;

  const existing = await PurchaseOrder.findOne({
    where: { orderNumber: "ABDU-PO-000001", companyId },
  });
  if (existing) {
    console.log("✅ Construction demo documents already present — skipped");
    return;
  }

  const main = warehouses[0];

  await sequelize.transaction(async (transaction) => {
    const posting = {
      lockInventories: (pairs) => inventoryPosting.lockInventories(pairs, transaction),
      postInbound: (args) => inventoryPosting.postInbound(args, transaction),
      postOutbound: (args) => inventoryPosting.postOutbound(args, transaction),
      setOnHandToActual: (args) => inventoryPosting.setOnHandToActual(args, transaction),
    };

    const poSpecs = [
      [0, [[0, 1200, 720], [1, 800, 640]]],
      [1, [[2, 600, 700]]],
      [2, [[3, 25, 78000], [4, 20, 79000], [6, 80, 1800]]],
      [3, [[5, 12, 80000], [11, 200, 420]]],
      [4, [[7, 4000, 18], [8, 3500, 14], [9, 60, 1200], [10, 50, 1400]]],
      [5, [[12, 180, 210], [13, 90, 850], [14, 40, 1600], [15, 70, 380]]],
    ];

    const purchaseOrders = [];
    for (let i = 0; i < poSpecs.length; i += 1) {
      const [supplierIndex, lines] = poSpecs[i];
      const subtotal = lines.reduce((sum, [, qty, price]) => sum + qty * price, 0);
      const po = await PurchaseOrder.create(
        {
          supplierId: suppliers[supplierIndex].id,
          createdBy: ownerId,
          companyId,
          orderNumber: `ABDU-PO-${String(i + 1).padStart(6, "0")}`,
          orderDate: daysAgo(12 - i),
          dueDate: daysAgo(2 - i),
          subtotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: subtotal,
          paidAmount: 0,
          status: "COMPLETED",
          notes: "Opening stock from factory / quarry",
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
          companyId,
          receivedBy: ownerId,
          receiptNumber: `ABDU-RC-${String(i + 1).padStart(6, "0")}`,
          receiptDate: daysAgo(11 - i),
          status: "COMPLETED",
          notes: "Received at Merkato yard",
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
          createdBy: ownerId,
          referenceType: "STOCK_RECEIPT",
          referenceId: receipt.id,
          notes: receipt.receiptNumber,
        });
      }
    }

    const transferSpecs = [
      [1, 0, 200],
      [2, 0, 80],
      [1, 7, 400],
      [2, 11, 40],
    ];
    for (let i = 0; i < transferSpecs.length; i += 1) {
      const [destIndex, productIndex, quantity] = transferSpecs[i];
      const dest = warehouses[destIndex];
      const product = products[productIndex];
      const transfer = await StockTransfer.create(
        {
          sourceWarehouseId: main.id,
          destinationWarehouseId: dest.id,
          createdBy: ownerId,
          companyId,
          transferNumber: `ABDU-TR-${String(i + 1).padStart(6, "0")}`,
          transferDate: daysAgo(6),
          status: "COMPLETED",
          notes: "Restock branch from Merkato yard",
        },
        { transaction },
      );
      await StockTransferItem.create(
        {
          stockTransferId: transfer.id,
          productId: product.id,
          quantity,
          receivedQuantity: quantity,
        },
        { transaction },
      );
      const locked = await posting.lockInventories([
        { productId: product.id, warehouseId: main.id },
        { productId: product.id, warehouseId: dest.id },
      ]);
      const out = await posting.postOutbound({
        inventory: locked[`${product.id}|${main.id}`],
        quantity,
        type: "TRANSFER_OUT",
        createdBy: ownerId,
        referenceType: "STOCK_TRANSFER",
        referenceId: transfer.id,
        notes: transfer.transferNumber,
      });
      await posting.postInbound({
        inventory: locked[`${product.id}|${dest.id}`],
        quantity,
        unitCost: out.unitCost,
        type: "TRANSFER_IN",
        createdBy: ownerId,
        referenceType: "STOCK_TRANSFER",
        referenceId: transfer.id,
        notes: transfer.transferNumber,
      });
    }

    const saleSpecs = [
      [0, "CREDIT", [[0, 200, 820], [4, 4, 91000]]],
      [1, "BANK_TRANSFER", [[1, 120, 760], [9, 8, 1800]]],
      [2, "CASH", [[0, 40, 850], [7, 200, 28]]],
      [3, "MOBILE_MONEY", [[11, 24, 580], [12, 16, 320]]],
      [4, "CREDIT", [[3, 6, 89000], [6, 20, 2400]]],
      [5, "CASH", [[7, 800, 28], [8, 600, 22]]],
      [6, "BANK_TRANSFER", [[0, 150, 830], [10, 12, 2100]]],
      [7, "CASH", [[14, 6, 2300], [15, 10, 520]]],
    ];

    const sales = [];
    for (let i = 0; i < saleSpecs.length; i += 1) {
      const [customerIndex, paymentMethod, lines] = saleSpecs[i];
      const subtotal = lines.reduce((sum, [, qty, price]) => sum + qty * price, 0);
      const customer = customers[customerIndex];
      const sale = await Sale.create(
        {
          warehouseId: main.id,
          createdBy: staff["abdu.sales"]?.id || ownerId,
          companyId,
          customerId: customer.id,
          invoiceNumber: `ABDU-INV-${String(i + 1).padStart(6, "0")}`,
          customerName: customer.name,
          customerPhone: customer.phone,
          saleDate: daysAgo(7 - Math.min(i, 6)),
          dueDate: paymentMethod === "CREDIT" ? daysAgo(i === 0 ? 5 : -10) : null,
          subtotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: subtotal,
          paidAmount: paymentMethod === "CREDIT" ? 0 : subtotal,
          paymentMethod,
          status: "COMPLETED",
          notes: "Wholesale construction materials",
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
          createdBy: ownerId,
          referenceType: "SALE",
          referenceId: sale.id,
          notes: sale.invoiceNumber,
        });
      }
      sales.push(sale);
    }

    const damaged = products[7];
    const lockedAdj = await posting.lockInventories([
      { productId: damaged.id, warehouseId: main.id },
    ]);
    const inv = lockedAdj[`${damaged.id}|${main.id}`];
    const systemQty = Number(inv.quantity);
    const actualQty = Math.max(systemQty - 15, 0);
    const adjustment = await StockAdjustment.create(
      {
        warehouseId: main.id,
        companyId,
        createdBy: ownerId,
        adjustmentNumber: "ABDU-ADJ-000001",
        reason: "Broken hollow blocks at Merkato yard",
        adjustmentDate: daysAgo(2),
        status: "COMPLETED",
      },
      { transaction },
    );
    await StockAdjustmentItem.create(
      {
        stockAdjustmentId: adjustment.id,
        productId: damaged.id,
        systemQuantity: systemQty,
        actualQuantity: actualQty,
        difference: actualQty - systemQty,
        reason: "Damaged in handling",
      },
      { transaction },
    );
    await posting.setOnHandToActual({
      inventory: inv,
      actualQuantity: actualQty,
      createdBy: ownerId,
      referenceType: "STOCK_ADJUSTMENT",
      referenceId: adjustment.id,
      notes: adjustment.adjustmentNumber,
    });

    for (let i = 0; i < purchaseOrders.length; i += 1) {
      const { po, supplierIndex } = purchaseOrders[i];
      const amount = Number(po.totalAmount) * (i % 2 === 0 ? 1 : 0.5);
      await SupplierPayment.create(
        {
          supplierId: suppliers[supplierIndex].id,
          purchaseOrderId: po.id,
          companyId,
          recordedBy: ownerId,
          amount,
          method: i % 2 === 0 ? "BANK_TRANSFER" : "CASH",
          paidAt: daysAgo(4),
          notes: "Factory / quarry payment",
        },
        { transaction },
      );
      po.paidAmount = amount;
      await po.save({ transaction });
    }

    for (const sale of sales) {
      if (sale.paymentMethod === "CREDIT") continue;
      await CustomerPayment.create(
        {
          customerId: sale.customerId,
          saleId: sale.id,
          companyId,
          recordedBy: ownerId,
          amount: sale.totalAmount,
          method: sale.paymentMethod,
          paidAt: sale.saleDate,
          notes: "Collected on delivery",
        },
        { transaction },
      );
    }

    const creditSale = sales.find((s) => s.paymentMethod === "CREDIT");
    if (creditSale) {
      const partial = Number(creditSale.totalAmount) * 0.35;
      await CustomerPayment.create(
        {
          customerId: creditSale.customerId,
          saleId: creditSale.id,
          companyId,
          recordedBy: ownerId,
          amount: partial,
          method: "BANK_TRANSFER",
          paidAt: daysAgo(1),
          notes: "Partial collection from contractor",
        },
        { transaction },
      );
      creditSale.paidAmount = partial;
      await creditSale.save({ transaction });
    }

    const expenses = [
      ["RENT", "Merkato yard monthly rent", 45000],
      ["TRANSPORT", "Isuzu hire Kaliti to Merkato", 8500],
      ["SALARY", "Yard labour week 1", 22000],
      ["UTILITIES", "Electricity Merkato yard", 3100],
      ["MAINTENANCE", "Forklift service", 6400],
    ];
    for (let i = 0; i < expenses.length; i += 1) {
      const [category, description, amount] = expenses[i];
      await Expense.create(
        {
          companyId,
          createdBy: ownerId,
          expenseDate: daysAgo(8 - i),
          category,
          description,
          amount,
          paymentMethod: "CASH",
        },
        { transaction },
      );
    }

    const orderLines = [
      [0, 80, 850],
      [7, 300, 28],
    ];
    const orderTotal = orderLines.reduce((sum, [, qty, price]) => sum + qty * price, 0);
    const pending = await CustomerOrder.create(
      {
        companyId,
        orderNumber: "ABDU-ORD-000001",
        customerName: customers[2].name,
        customerPhone: customers[2].phone,
        deliveryDate: daysAgo(-2),
        warehouseId: main.id,
        status: "PENDING",
        paymentStatus: "UNPAID",
        subtotal: orderTotal,
        totalAmount: orderTotal,
        paidAmount: 0,
        notes: "Phone order — 80 Dangote bags + 300 hollow blocks",
      },
      { transaction },
    );
    for (const [productIndex, quantity, unitPrice] of orderLines) {
      await CustomerOrderItem.create(
        {
          customerOrderId: pending.id,
          productId: products[productIndex].id,
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
        },
        { transaction },
      );
    }

    const delivered = await CustomerOrder.create(
      {
        companyId,
        orderNumber: "ABDU-ORD-000002",
        customerName: customers[0].name,
        customerPhone: customers[0].phone,
        deliveryDate: daysAgo(3),
        warehouseId: main.id,
        saleId: sales[0].id,
        approvedBy: ownerId,
        approvedAt: daysAgo(3),
        status: "DELIVERED",
        paymentStatus: "PARTIAL",
        subtotal: sales[0].totalAmount,
        totalAmount: sales[0].totalAmount,
        paidAmount: sales[0].paidAmount,
        notes: "Site delivery to Sunshine Construction",
      },
      { transaction },
    );
    await CustomerOrderItem.create(
      {
        customerOrderId: delivered.id,
        productId: products[0].id,
        quantity: 200,
        unitPrice: 820,
        totalPrice: 164000,
      },
      { transaction },
    );

    const auditActions = [
      ["CREATE", "Company"],
      ["CREATE", "Product"],
      ["CREATE", "PurchaseOrder"],
      ["STOCK_IN", "StockReceipt"],
      ["STOCK_OUT", "Sale"],
      ["TRANSFER", "StockTransfer"],
      ["ADJUSTMENT", "StockAdjustment"],
      ["LOGIN", "User"],
    ];
    for (const [action, entityType] of auditActions) {
      await AuditLog.create(
        {
          userId: ownerId,
          companyId,
          action,
          entityType,
          description: `Demo ${action} ${entityType} for Abdu Building Materials`,
          ipAddress: "127.0.0.1",
        },
        { transaction },
      );
    }
  });

  console.log("✅ Construction demo data seeded for Abdu Building Materials");
}

module.exports = async () => {
  const seeded = await seedCompanyAndOwner();
  if (!seeded) return;

  const staff = await seedStaff(seeded.company, seeded.ownerRole);
  const catalog = await seedCatalog(seeded.company.id, seeded.owner.id);
  await seedDocuments({
    company: seeded.company,
    owner: seeded.owner,
    staff,
    catalog,
  });
};
