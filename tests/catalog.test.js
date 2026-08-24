const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const models = require("../src/database/models");
const {
  startTestApp,
  stopTestApp,
  request,
  cookieHeader,
} = require("./helpers/http");

const adminUsername = process.env.ADMIN_SEED_USERNAME;
const adminPassword = process.env.ADMIN_SEED_PASSWORD;
const suffix = `c${Date.now()}`;
const missingId = crypto.randomUUID();

describe("catalog module", () => {
  let adminCookie = "";
  let adminId = "";
  let categoryId = "";
  let extraCategoryId = "";
  let supplierId = "";
  let poSupplierId = "";
  let productId = "";
  let extraProductId = "";
  let warehouseId = "";
  let inventoryId = "";
  let poId = "";
  let clerkRoleId = "";
  let clerkUserId = "";

  before(async () => {
    await startTestApp();
    const login = await request("POST", "/api/auth/login", {
      body: { username: adminUsername, password: adminPassword },
    });
    assert.equal(login.status, 200, JSON.stringify(login.json));
    adminCookie = cookieHeader(login.setCookie);
    adminId = login.json.data.user.id;
  });

  after(async () => {
    if (inventoryId) await models.Inventory.destroy({ where: { id: inventoryId } }).catch(() => {});
    if (warehouseId) await models.Warehouse.destroy({ where: { id: warehouseId } }).catch(() => {});
    if (poId) await models.PurchaseOrder.destroy({ where: { id: poId } }).catch(() => {});
    if (productId) {
      await request("DELETE", `/api/products/${productId}`, { cookie: adminCookie });
    }
    if (extraProductId) {
      await request("DELETE", `/api/products/${extraProductId}`, { cookie: adminCookie });
    }
    if (categoryId) {
      await request("DELETE", `/api/categories/${categoryId}`, { cookie: adminCookie });
    }
    if (extraCategoryId) {
      await request("DELETE", `/api/categories/${extraCategoryId}`, { cookie: adminCookie });
    }
    if (supplierId) {
      await request("DELETE", `/api/suppliers/${supplierId}`, { cookie: adminCookie });
    }
    if (poSupplierId) {
      await request("DELETE", `/api/suppliers/${poSupplierId}`, { cookie: adminCookie });
    }
    if (clerkUserId) {
      await request("DELETE", `/api/users/${clerkUserId}`, { cookie: adminCookie });
    }
    if (clerkRoleId) {
      await request("DELETE", `/api/roles/${clerkRoleId}`, { cookie: adminCookie });
    }
    await stopTestApp();
  });

  it("rejects unauthenticated catalog access", async () => {
    const res = await request("GET", "/api/categories");
    assert.equal(res.status, 401);
  });

  it("rejects invalid category payloads", async () => {
    const res = await request("POST", "/api/categories", {
      cookie: adminCookie,
      body: { name: "", status: "ACTIVE" },
    });
    assert.equal(res.status, 400);
  });

  it("creates, lists, filters, and updates a category", async () => {
    const created = await request("POST", "/api/categories", {
      cookie: adminCookie,
      body: {
        name: `Widgets ${suffix}`,
        description: "Widget category",
      },
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    categoryId = created.json.data.category.id;

    const extra = await request("POST", "/api/categories", {
      cookie: adminCookie,
      body: { name: `Other ${suffix}` },
    });
    extraCategoryId = extra.json.data.category.id;

    const listed = await request("GET", `/api/categories?search=Widgets&limit=5`, {
      cookie: adminCookie,
    });
    assert.equal(listed.status, 200);
    assert.ok(listed.json.data.categories.some((c) => c.id === categoryId));
    assert.ok(listed.json.meta);

    const paged = await request("GET", "/api/categories?page=1&limit=1", {
      cookie: adminCookie,
    });
    assert.equal(paged.status, 200);
    assert.equal(paged.json.data.categories.length, 1);
    assert.equal(paged.json.meta.limit, 1);

    const got = await request("GET", `/api/categories/${categoryId}`, {
      cookie: adminCookie,
    });
    assert.equal(got.status, 200);
    assert.equal(got.json.data.category.name, `Widgets ${suffix}`);

    const patched = await request("PATCH", `/api/categories/${categoryId}`, {
      cookie: adminCookie,
      body: { description: "Updated widgets" },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.json.data.category.description, "Updated widgets");
  });

  it("rejects a duplicate category name", async () => {
    const res = await request("POST", "/api/categories", {
      cookie: adminCookie,
      body: { name: `Widgets ${suffix}` },
    });
    assert.equal(res.status, 409);
  });

  it("creates, lists, and updates a supplier; rejects invalid email", async () => {
    const invalid = await request("POST", "/api/suppliers", {
      cookie: adminCookie,
      body: { name: `Acme ${suffix}`, email: "not-an-email" },
    });
    assert.equal(invalid.status, 400);

    const created = await request("POST", "/api/suppliers", {
      cookie: adminCookie,
      body: {
        name: `Acme ${suffix}`,
        contactPerson: "Jane",
        email: "acme@example.com",
        phone: "0911222333",
        address: { city: "Addis Ababa" },
        paymentTerms: "Net 30",
      },
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    supplierId = created.json.data.supplier.id;

    const listed = await request("GET", `/api/suppliers?search=Acme&status=ACTIVE`, {
      cookie: adminCookie,
    });
    assert.equal(listed.status, 200);
    assert.ok(listed.json.data.suppliers.some((s) => s.id === supplierId));

    const patched = await request("PATCH", `/api/suppliers/${supplierId}`, {
      cookie: adminCookie,
      body: { paymentTerms: "Net 45" },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.json.data.supplier.paymentTerms, "Net 45");
  });

  it("rejects product create with missing/invalid relations and negative prices", async () => {
    const missingCategory = await request("POST", "/api/products", {
      cookie: adminCookie,
      body: {
        categoryId: missingId,
        sku: `SKU-MISS-${suffix}`,
        name: "Missing cat",
      },
    });
    assert.equal(missingCategory.status, 400);
    assert.match(missingCategory.json.error.message, /Category/);

    const missingSupplier = await request("POST", "/api/products", {
      cookie: adminCookie,
      body: {
        categoryId,
        supplierId: missingId,
        sku: `SKU-MSUP-${suffix}`,
        name: "Missing supplier",
      },
    });
    assert.equal(missingSupplier.status, 400);
    assert.match(missingSupplier.json.error.message, /Supplier/);

    const negative = await request("POST", "/api/products", {
      cookie: adminCookie,
      body: {
        categoryId,
        sku: `SKU-NEG-${suffix}`,
        name: "Negative",
        purchasePrice: -1,
      },
    });
    assert.equal(negative.status, 400);
  });

  it("creates a product with category and supplier", async () => {
    const created = await request("POST", "/api/products", {
      cookie: adminCookie,
      body: {
        categoryId,
        supplierId,
        sku: `SKU-${suffix}`,
        barcode: `BC-${suffix}`,
        name: `Bolt ${suffix}`,
        unit: "PCS",
        purchasePrice: 10.5,
        sellingPrice: 15,
        reorderLevel: 5,
        reorderQuantity: 20,
        trackBatch: false,
        trackExpiry: false,
      },
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const product = created.json.data.product;
    productId = product.id;
    assert.equal(product.category.name.startsWith("Widgets"), true);
    assert.equal(product.supplier.name.startsWith("Acme"), true);
    assert.equal(product.sku, `SKU-${suffix}`);
    assert.equal("inventory" in product, false);
    assert.equal("stockTransactions" in product, false);
  });

  it("lists and searches products; supports category filter and pagination", async () => {
    const search = await request("GET", `/api/products?search=Bolt`, {
      cookie: adminCookie,
    });
    assert.equal(search.status, 200);
    assert.ok(search.json.data.products.some((p) => p.id === productId));

    const filtered = await request(
      "GET",
      `/api/products?categoryId=${categoryId}&status=ACTIVE`,
      { cookie: adminCookie },
    );
    assert.equal(filtered.status, 200);
    assert.ok(filtered.json.data.products.every((p) => p.categoryId === categoryId));

    const paged = await request("GET", "/api/products?page=1&limit=1", {
      cookie: adminCookie,
    });
    assert.equal(paged.json.data.products.length, 1);
  });

  it("rejects duplicate SKU and barcode", async () => {
    const sku = await request("POST", "/api/products", {
      cookie: adminCookie,
      body: {
        categoryId,
        sku: `SKU-${suffix}`,
        name: "Dup SKU",
      },
    });
    assert.equal(sku.status, 409);

    const barcode = await request("POST", "/api/products", {
      cookie: adminCookie,
      body: {
        categoryId,
        sku: `SKU-DUPBC-${suffix}`,
        barcode: `BC-${suffix}`,
        name: "Dup barcode",
      },
    });
    assert.equal(barcode.status, 409);
  });

  it("updates a product", async () => {
    const res = await request("PATCH", `/api/products/${productId}`, {
      cookie: adminCookie,
      body: { sellingPrice: 18.75, name: `Bolt updated ${suffix}` },
    });
    assert.equal(res.status, 200);
    assert.equal(Number(res.json.data.product.sellingPrice), 18.75);
  });

  it("does not delete a category referenced by products", async () => {
    const res = await request("DELETE", `/api/categories/${categoryId}`, {
      cookie: adminCookie,
    });
    assert.equal(res.status, 409);
  });

  it("does not delete a product referenced by inventory", async () => {
    const warehouse = await models.Warehouse.create({
      name: `WH ${suffix}`,
      code: `WH${suffix}`.slice(0, 20),
      status: "ACTIVE",
    });
    warehouseId = warehouse.id;
    const inventory = await models.Inventory.create({
      productId,
      warehouseId,
      quantity: 0,
      reservedQuantity: 0,
      averageCost: 0,
    });
    inventoryId = inventory.id;

    const res = await request("DELETE", `/api/products/${productId}`, {
      cookie: adminCookie,
    });
    assert.equal(res.status, 409);

    await inventory.destroy();
    inventoryId = "";
    await warehouse.destroy();
    warehouseId = "";
  });

  it("does not delete a supplier referenced by a purchase order", async () => {
    const supplier = await request("POST", "/api/suppliers", {
      cookie: adminCookie,
      body: { name: `PO Supplier ${suffix}` },
    });
    poSupplierId = supplier.json.data.supplier.id;

    const po = await models.PurchaseOrder.create({
      supplierId: poSupplierId,
      createdBy: adminId,
      orderNumber: `PO-${suffix}`,
      status: "DRAFT",
    });
    poId = po.id;

    const res = await request("DELETE", `/api/suppliers/${poSupplierId}`, {
      cookie: adminCookie,
    });
    assert.equal(res.status, 409);

    await po.destroy();
    poId = "";
  });

  it("returns 403 when the caller lacks catalog permissions", async () => {
    const authRead = await request("GET", "/api/permissions?limit=100", {
      cookie: adminCookie,
    });
    const permissionId = authRead.json.data.permissions.find(
      (p) => p.name === "auth:READ",
    ).id;

    const role = await request("POST", "/api/roles", {
      cookie: adminCookie,
      body: {
        name: `nocat_${suffix}`,
        permissionIds: [permissionId],
      },
    });
    clerkRoleId = role.json.data.role.id;

    const user = await request("POST", "/api/users", {
      cookie: adminCookie,
      body: {
        fullName: "No Catalog",
        username: `nocat_${suffix}`,
        phone: "0911444555",
        password: "NoCat@12345",
        roleId: clerkRoleId,
      },
    });
    clerkUserId = user.json.data.user.id;

    const login = await request("POST", "/api/auth/login", {
      body: { username: `nocat_${suffix}`, password: "NoCat@12345" },
    });
    const cookie = cookieHeader(login.setCookie);
    const denied = await request("GET", "/api/products", { cookie });
    assert.equal(denied.status, 403);
  });

  it("deletes an unused extra category and unused supplier", async () => {
    const delCat = await request("DELETE", `/api/categories/${extraCategoryId}`, {
      cookie: adminCookie,
    });
    assert.equal(delCat.status, 200);
    extraCategoryId = "";

    const delPoSup = await request("DELETE", `/api/suppliers/${poSupplierId}`, {
      cookie: adminCookie,
    });
    assert.equal(delPoSup.status, 200);
    poSupplierId = "";
  });

  it("deletes an unreferenced product, then its category and supplier", async () => {
    const extra = await request("POST", "/api/products", {
      cookie: adminCookie,
      body: {
        categoryId,
        sku: `SKU-EXTRA-${suffix}`,
        name: `Extra ${suffix}`,
      },
    });
    extraProductId = extra.json.data.product.id;

    const delExtra = await request("DELETE", `/api/products/${extraProductId}`, {
      cookie: adminCookie,
    });
    assert.equal(delExtra.status, 200);
    extraProductId = "";

    const delProduct = await request("DELETE", `/api/products/${productId}`, {
      cookie: adminCookie,
    });
    assert.equal(delProduct.status, 200);
    productId = "";

    const delCategory = await request("DELETE", `/api/categories/${categoryId}`, {
      cookie: adminCookie,
    });
    assert.equal(delCategory.status, 200);
    categoryId = "";

    const delSupplier = await request("DELETE", `/api/suppliers/${supplierId}`, {
      cookie: adminCookie,
    });
    assert.equal(delSupplier.status, 200);
    supplierId = "";
  });
});
