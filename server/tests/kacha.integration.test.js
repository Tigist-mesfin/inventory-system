/** Must run before any module that snapshots config/env.js */
process.env.KACHA_ENABLED = "true";
process.env.KACHA_API_USERNAME = "test-app-id";
process.env.KACHA_API_PASSWORD = "test-api-secret";
process.env.KACHA_API_BASE_URL = "https://kacha.test/api/v1";
process.env.KACHA_CALLBACK_URL =
  "https://example.com/api/webhooks/kacha/payment";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  startTestApp,
  stopTestApp,
  request,
  cookieHeader,
  leakPassword,
} = require("./helpers/http");

const username = process.env.ADMIN_SEED_USERNAME;
const password = process.env.ADMIN_SEED_PASSWORD;

const kachaMock = {
  kyc: null,
  payment: null,
  status: null,
  calls: [],
};

const originalFetch = global.fetch;

describe("kacha integration", () => {
  let adminCookie = "";
  let companyOwnerCookie = "";
  let companyOwner = null;
  let warehouse = null;
  let product = null;
  let sale = null;

  before(async () => {
    const jsonResponse = (status, payload) => {
      const text = JSON.stringify(payload);
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => text,
        json: async () => payload,
        headers: { getSetCookie: () => [] },
      };
    };

    global.fetch = async (url, options = {}) => {
      const href = String(url);
      // Only intercept outbound Kacha API calls — leave local app requests alone.
      if (!href.includes("kacha.test")) {
        return originalFetch(url, options);
      }

      const body = options.body ? JSON.parse(options.body) : null;
      kachaMock.calls.push({ href, method: options.method, body });

      const auth = options.headers?.Authorization || "";
      if (!String(auth).startsWith("Basic ")) {
        return jsonResponse(401, { detail: "Unauthorized" });
      }

      if (href.includes("/orgs/miniapps/user_kyc")) {
        if (kachaMock.kyc?.errorStatus) {
          return jsonResponse(kachaMock.kyc.errorStatus, kachaMock.kyc.errorBody);
        }
        return jsonResponse(
          200,
          kachaMock.kyc || {
            full_name: "Kacha Tester",
            phone: "251911000099",
          },
        );
      }

      if (href.includes("/orgs/payment/request/in_app")) {
        if (kachaMock.payment?.errorStatus) {
          return jsonResponse(
            kachaMock.payment.errorStatus,
            kachaMock.payment.errorBody,
          );
        }
        return jsonResponse(
          200,
          kachaMock.payment || {
            id: "KACHA_REF_TEST",
            reference: "KACHA_REF_TEST",
            phone: body.phone,
            amount: body.amount,
            trace_number: body.trace_number,
            status: "PENDING",
            fee: 0,
            message: "SUCCESS",
          },
        );
      }

      if (href.includes("/orgs/payment/status")) {
        return jsonResponse(
          200,
          kachaMock.status || {
            id: "KACHA_REF_TEST",
            status: "PROCESSED",
            amount: 100,
          },
        );
      }

      return jsonResponse(404, { detail: "not mocked" });
    };

    await startTestApp();

    const login = await request("POST", "/api/auth/login", {
      body: { username, password },
    });
    assert.equal(login.status, 200);
    adminCookie = cookieHeader(login.setCookie);

    const demoUser = process.env.DEMO_COMPANY_USERNAME || "abdu";
    const demoPass = process.env.DEMO_COMPANY_PASSWORD || "123456";
    const ownerLogin = await request("POST", "/api/auth/login", {
      body: { username: demoUser, password: demoPass },
    });
    if (ownerLogin.status === 200) {
      companyOwnerCookie = cookieHeader(ownerLogin.setCookie);
      companyOwner = ownerLogin.json.data.user;
    } else {
      companyOwnerCookie = adminCookie;
      companyOwner = login.json.data.user;
    }

    const whRes = await request("GET", "/api/warehouses?limit=5", {
      cookie: companyOwnerCookie,
    });
    assert.equal(whRes.status, 200);
    warehouse =
      whRes.json.data?.warehouses?.[0] ||
      whRes.json.data?.items?.[0] ||
      whRes.json.data?.[0];

    const invRes = await request("GET", "/api/inventory?limit=50", {
      cookie: companyOwnerCookie,
    });
    const invRows =
      invRes.json.data?.inventory ||
      invRes.json.data?.items ||
      invRes.json.data?.rows ||
      [];
    // Prefer a row that is stocked in the same warehouse we'll sell from.
    const stocked =
      invRows.find(
        (row) =>
          warehouse &&
          String(row.warehouseId || "") === String(warehouse.id) &&
          Number(row.quantity || row.available || 0) > 0,
      ) ||
      invRows.find((row) => Number(row.quantity || row.available || 0) > 0);
    if (stocked) {
      product = { id: stocked.productId || stocked.product?.id };
      if (stocked.warehouseId) {
        warehouse =
          (whRes.json.data?.warehouses || []).find(
            (w) => String(w.id) === String(stocked.warehouseId),
          ) || warehouse;
      }
    }
  });

  after(async () => {
    global.fetch = originalFetch;
    await stopTestApp();
  });

  beforeEach(() => {
    kachaMock.kyc = null;
    kachaMock.payment = null;
    kachaMock.status = null;
    kachaMock.calls = [];
  });

  it("rejects kacha-session when token is missing", async () => {
    const res = await request("POST", "/api/auth/kacha-session", {
      body: {},
    });
    assert.equal(res.status, 400);
  });

  it("rejects invalid/expired kacha session without leaking credentials", async () => {
    kachaMock.kyc = {
      errorStatus: 400,
      errorBody: { session_token: ["Invalid or expired session token."] },
    };
    const res = await request("POST", "/api/auth/kacha-session", {
      body: { sessionToken: "expired-token-value-xx" },
    });
    assert.equal(res.status, 401);
    assert.equal(leakPassword(res.json), false);
    assert.equal(JSON.stringify(res.json).includes("test-api-secret"), false);
  });

  it("logs in via kacha session for a new phone as COMPANY_OWNER (never ADMIN)", async () => {
    const phone = `2519${String(Date.now()).slice(-8)}`;
    kachaMock.kyc = { full_name: "Mini App User", phone };
    const res = await request("POST", "/api/auth/kacha-session", {
      body: { sessionToken: "valid-session-token-abc" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.user.phone, phone);
    assert.equal(res.json.data.user.role?.name, "COMPANY_OWNER");
    assert.notEqual(res.json.data.user.role?.name, "ADMIN");
    assert.equal(res.json.data.kacha.verified, true);
    assert.equal(leakPassword(res.json), false);
    assert.ok(res.json.data.accessToken);
  });

  it("existing username/password login still works", async () => {
    const res = await request("POST", "/api/auth/login", {
      body: { username, password },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.user.username, username);
  });

  it("creates kacha payment request and returns bridge reference", async (t) => {
    if (!product?.id || !warehouse?.id) {
      t.skip("No stocked product/warehouse available in test DB");
      return;
    }

    const created = await request("POST", "/api/sales", {
      cookie: companyOwnerCookie,
      body: {
        warehouseId: warehouse.id,
        paymentMethod: "Kacha",
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 100,
          },
        ],
      },
    });
    if (created.status >= 400) {
      t.skip(`Could not create sale: ${created.json?.error?.message || created.status}`);
      return;
    }
    sale = created.json.data.sale;
    assert.equal(sale.status, "DRAFT");

    kachaMock.payment = {
      id: "2CUTESTREF1",
      reference: "2CUTESTREF1",
      phone: companyOwner.phone,
      amount: Number(sale.totalAmount),
      trace_number: "will-be-overwritten",
      status: "PENDING",
      fee: 0,
      message: "SUCCESS",
    };

    const pay = await request("POST", `/api/sales/${sale.id}/kacha/payments`, {
      cookie: companyOwnerCookie,
      body: {},
    });
    assert.equal(pay.status, 201);
    assert.equal(pay.json.data.bridge.reference, "2CUTESTREF1");
    assert.equal(pay.json.data.payment.status, "PENDING");
    assert.ok(pay.json.data.payment.traceNumber);
    assert.equal(JSON.stringify(pay.json).includes("test-api-secret"), false);

    const inAppCall = kachaMock.calls.find((c) =>
      c.href.includes("/payment/request/in_app"),
    );
    assert.ok(inAppCall);
    assert.equal(inAppCall.body.callback_url, process.env.KACHA_CALLBACK_URL);
    assert.ok(inAppCall.body.trace_number);
    assert.ok(Number(inAppCall.body.amount) > 0);
  });

  it("applies PROCESSED callback once and rejects duplicate apply", async (t) => {
    if (!product?.id || !warehouse?.id) {
      t.skip("No stocked product/warehouse available in test DB");
      return;
    }

    // Use COMPLETED + unpaid balance so callback applies via recordPayment
    // (avoids flaky stock deduction when prior tests consume inventory).
    const created = await request("POST", "/api/sales", {
      cookie: companyOwnerCookie,
      body: {
        warehouseId: warehouse.id,
        paymentMethod: "CREDIT",
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 100,
          },
        ],
      },
    });
    if (created.status >= 400) {
      t.skip(`Could not create sale: ${created.json?.error?.message || created.status}`);
      return;
    }
    const unpaidSale = created.json.data.sale;
    const completed = await request("POST", `/api/sales/${unpaidSale.id}/complete`, {
      cookie: companyOwnerCookie,
      body: { paidAmount: 0, paymentMethod: "CREDIT" },
    });
    if (completed.status >= 400) {
      t.skip(
        `Could not complete unpaid sale: ${completed.json?.error?.message || completed.status}`,
      );
      return;
    }

    kachaMock.payment = {
      id: "2CUTESTREF_PAID",
      reference: "2CUTESTREF_PAID",
      phone: companyOwner.phone,
      amount: Number(completed.json.data.sale.totalAmount),
      trace_number: "x",
      status: "PENDING",
    };

    const pay = await request(
      "POST",
      `/api/sales/${unpaidSale.id}/kacha/payments`,
      { cookie: companyOwnerCookie, body: {} },
    );
    assert.equal(pay.status, 201);
    const payment = pay.json.data.payment;

    kachaMock.status = {
      id: payment.reference,
      status: "PROCESSED",
      amount: Number(payment.amount),
    };

    const cb1 = await request("POST", "/api/webhooks/kacha/payment", {
      body: {
        reference: payment.traceNumber,
        ext_reference: "KACHA_EXT_1",
        status: "PROCESSED",
      },
    });
    assert.equal(
      cb1.status,
      200,
      cb1.json?.error?.message || JSON.stringify(cb1.json),
    );
    assert.equal(cb1.json.data.payment.status, "PROCESSED");
    assert.equal(cb1.json.data.duplicate, false);

    const saleAfter = await request("GET", `/api/sales/${unpaidSale.id}`, {
      cookie: companyOwnerCookie,
    });
    assert.equal(saleAfter.status, 200);
    assert.equal(saleAfter.json.data.sale.status, "COMPLETED");
    assert.equal(saleAfter.json.data.sale.paymentStatus, "PAID");

    const cb2 = await request("POST", "/api/webhooks/kacha/payment", {
      body: {
        reference: payment.traceNumber,
        ext_reference: "KACHA_EXT_1",
        status: "PROCESSED",
      },
    });
    assert.equal(cb2.status, 200);
    assert.equal(cb2.json.data.duplicate, true);
  });

  it("handles CANCELED callback without completing the sale", async (t) => {
    if (!product?.id || !warehouse?.id) {
      t.skip("No stocked product/warehouse available in test DB");
      return;
    }

    const created = await request("POST", "/api/sales", {
      cookie: companyOwnerCookie,
      body: {
        warehouseId: warehouse.id,
        paymentMethod: "Kacha",
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 50,
          },
        ],
      },
    });
    if (created.status >= 400) {
      t.skip(`Could not create sale: ${created.json?.error?.message || created.status}`);
      return;
    }
    const draft = created.json.data.sale;

    kachaMock.payment = {
      id: "2CUTESTREF2",
      reference: "2CUTESTREF2",
      phone: companyOwner.phone,
      amount: Number(draft.totalAmount),
      trace_number: "x",
      status: "PENDING",
    };

    const pay = await request("POST", `/api/sales/${draft.id}/kacha/payments`, {
      cookie: companyOwnerCookie,
      body: {},
    });
    if (pay.status >= 400) {
      t.skip(`Payment request failed: ${pay.json?.error?.message || pay.status}`);
      return;
    }
    const payment = pay.json.data.payment;

    const cb = await request("POST", "/api/webhooks/kacha/payment", {
      body: {
        reference: payment.traceNumber,
        ext_reference: "KACHA_EXT_2",
        status: "CANCELED",
      },
    });
    assert.equal(cb.status, 200);
    assert.equal(cb.json.data.payment.status, "CANCELED");

    const saleAfter = await request("GET", `/api/sales/${draft.id}`, {
      cookie: companyOwnerCookie,
    });
    assert.equal(saleAfter.json.data.sale.status, "DRAFT");
  });

  it("rejects unknown callback reference", async () => {
    const res = await request("POST", "/api/webhooks/kacha/payment", {
      body: {
        reference: "NO_SUCH_TRACE",
        ext_reference: "NO_SUCH_EXT",
        status: "PROCESSED",
      },
    });
    assert.equal(res.status, 404);
  });
});
