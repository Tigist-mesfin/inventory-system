const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const models = require("../src/database/models");
const {
  startTestApp,
  stopTestApp,
  request,
  cookieHeader,
  leakPassword,
} = require("./helpers/http");

const username = process.env.ADMIN_SEED_USERNAME;
const password = process.env.ADMIN_SEED_PASSWORD;
const suffix = `t${Date.now()}`;

describe("auth session", () => {
  let adminCookie = "";

  before(async () => {
    await startTestApp();
  });

  after(async () => {
    await stopTestApp();
  });

  it("rejects missing login fields with 400", async () => {
    const res = await request("POST", "/api/auth/login", { body: {} });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, "VALIDATION_ERROR");
  });

  it("rejects invalid credentials with 401 without leaking which field failed", async () => {
    const res = await request("POST", "/api/auth/login", {
      body: { username: "no-such-user", password: "wrongpass123" },
    });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.message, "Invalid credentials");
  });

  it("logs in the seeded admin and never returns a password", async () => {
    const res = await request("POST", "/api/auth/login", {
      body: { username, password },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.data.user.username, username);
    assert.ok(res.json.data.user.permissions.length >= 42);
    assert.equal(leakPassword(res.json), false);
    adminCookie = cookieHeader(res.setCookie);
    assert.match(adminCookie, /accessToken=/);
    assert.match(adminCookie, /refreshToken=/);
  });

  it("returns the current user on GET /auth/me", async () => {
    const res = await request("GET", "/api/auth/me", { cookie: adminCookie });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.user.username, username);
    assert.equal(leakPassword(res.json), false);
  });

  it("rejects /auth/me without an access token", async () => {
    const res = await request("GET", "/api/auth/me");
    assert.equal(res.status, 401);
  });

  it("refreshes the access token", async () => {
    const res = await request("POST", "/api/auth/refresh", {
      cookie: adminCookie,
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    adminCookie = cookieHeader(res.setCookie, adminCookie);
  });

  it("rejects INACTIVE users at login", async () => {
    const role = await models.Role.findOne({ where: { name: "ADMIN" } });
    const user = await models.User.create({
      fullName: "Inactive User",
      username: `inactive_${suffix}`,
      phone: "251911000001",
      password: "Inactive@123",
      roleId: role.id,
      status: "INACTIVE",
    });

    const res = await request("POST", "/api/auth/login", {
      body: { username: user.username, password: "Inactive@123" },
    });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.message, "Invalid credentials");
    await user.destroy();
  });

  it("rejects SUSPENDED users at login", async () => {
    const role = await models.Role.findOne({ where: { name: "ADMIN" } });
    const user = await models.User.create({
      fullName: "Suspended User",
      username: `suspended_${suffix}`,
      phone: "251911000002",
      password: "Suspended@123",
      roleId: role.id,
      status: "SUSPENDED",
    });

    const res = await request("POST", "/api/auth/login", {
      body: { username: user.username, password: "Suspended@123" },
    });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.message, "Invalid credentials");
    await user.destroy();
  });

  it("changes password, rejects the old password, and restores the original", async () => {
    const role = await models.Role.findOne({ where: { name: "ADMIN" } });
    const user = await models.User.create({
      fullName: "Password User",
      username: `pwuser_${suffix}`,
      phone: "251911000003",
      password: "OldPass@123",
      roleId: role.id,
      status: "ACTIVE",
    });

    const login = await request("POST", "/api/auth/login", {
      body: { username: user.username, password: "OldPass@123" },
    });
    assert.equal(login.status, 200);
    const cookie = cookieHeader(login.setCookie);

    const same = await request("POST", "/api/auth/change-password", {
      cookie,
      body: { currentPassword: "OldPass@123", newPassword: "OldPass@123" },
    });
    assert.equal(same.status, 400);

    const changed = await request("POST", "/api/auth/change-password", {
      cookie,
      body: { currentPassword: "OldPass@123", newPassword: "NewPass@123" },
    });
    assert.equal(changed.status, 200);

    const oldLogin = await request("POST", "/api/auth/login", {
      body: { username: user.username, password: "OldPass@123" },
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request("POST", "/api/auth/login", {
      body: { username: user.username, password: "NewPass@123" },
    });
    assert.equal(newLogin.status, 200);
    await user.destroy();
  });

  it("logs out and then rejects /auth/me; logout is safe to call again", async () => {
    const login = await request("POST", "/api/auth/login", {
      body: { username, password },
    });
    let cookie = cookieHeader(login.setCookie);

    const logout = await request("POST", "/api/auth/logout", { cookie });
    assert.equal(logout.status, 200);
    cookie = cookieHeader(logout.setCookie, cookie);

    const me = await request("GET", "/api/auth/me", { cookie });
    assert.equal(me.status, 401);

    const again = await request("POST", "/api/auth/logout");
    assert.equal(again.status, 200);
  });
});
