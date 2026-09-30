const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const models = require("../src/database/models");
const {
  startTestApp,
  stopTestApp,
  request,
  cookieHeader,
} = require("./helpers/http");

const suffix = `del${Date.now()}`;

const login = async (username, password) => {
  const res = await request("POST", "/api/auth/login", {
    body: { username, password },
  });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  return cookieHeader(res.setCookie);
};

describe("auth account deletion (App Store 5.1.1(v))", () => {
  before(async () => {
    await startTestApp();
  });

  after(async () => {
    await stopTestApp();
  });

  it("rejects unauthenticated delete-account", async () => {
    const res = await request("POST", "/api/auth/delete-account", {
      body: { password: "x", confirm: "DELETE" },
    });
    assert.equal(res.status, 401);
  });

  it("rejects wrong password and leaves the account active", async () => {
    const salesmanRole = await models.Role.findOne({
      where: { name: "SALESMAN" },
    });
    assert.ok(salesmanRole);
    const company = await models.Company.create({
      name: `Del Co ${suffix}`,
      phone: `2519${String(Date.now()).slice(-8)}`,
      status: "ACTIVE",
    });
    const user = await models.User.create({
      fullName: "Delete Me Wrong",
      username: `del_wrong_${suffix}`,
      phone: `251911${String(Date.now()).slice(-6)}`,
      password: "Correct@123",
      roleId: salesmanRole.id,
      companyId: company.id,
      status: "ACTIVE",
    });

    const cookie = await login(user.username, "Correct@123");
    const res = await request("POST", "/api/auth/delete-account", {
      cookie,
      body: { password: "WrongPass!", confirm: "DELETE" },
    });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.code, "ACCOUNT_DELETE_AUTH_FAILED");

    await user.reload();
    assert.equal(user.status, "ACTIVE");
    assert.equal(user.username, `del_wrong_${suffix}`);
  });

  it("anonymizes a non-owner account and frees the phone for re-registration", async () => {
    const salesmanRole = await models.Role.findOne({
      where: { name: "SALESMAN" },
    });
    const company = await models.Company.create({
      name: `Del Emp Co ${suffix}`,
      phone: `2518${String(Date.now()).slice(-8)}`,
      status: "ACTIVE",
    });
    const phone = `251922${String(Date.now()).slice(-6)}`;
    const user = await models.User.create({
      fullName: "Employee Delete",
      username: phone,
      phone,
      password: "Employee@123",
      roleId: salesmanRole.id,
      companyId: company.id,
      status: "ACTIVE",
    });
    const originalId = user.id;

    const cookie = await login(phone, "Employee@123");
    const res = await request("POST", "/api/auth/delete-account", {
      cookie,
      body: { password: "Employee@123", confirm: "DELETE" },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.data.deleted, true);
    assert.equal(res.json.data.companyClosed, false);

    const me = await request("GET", "/api/auth/me", { cookie });
    assert.equal(me.status, 401);

    const loginAgain = await request("POST", "/api/auth/login", {
      body: { username: phone, password: "Employee@123" },
    });
    assert.equal(loginAgain.status, 401);

    const wiped = await models.User.findByPk(originalId);
    assert.ok(wiped);
    assert.equal(wiped.status, "INACTIVE");
    assert.equal(wiped.fullName, "Deleted User");
    assert.match(wiped.username, /^deleted_/);
    assert.equal(wiped.phone, wiped.username);

    await company.reload();
    assert.equal(company.status, "ACTIVE");

    // Phone is free — another account may use it.
    const taken = await models.User.findOne({
      where: { phone, status: "ACTIVE" },
    });
    assert.equal(taken, null);
  });

  it("blocks sole owner deletion when other team members remain active", async () => {
    const ownerRole = await models.Role.findOne({
      where: { name: "COMPANY_OWNER" },
    });
    const salesmanRole = await models.Role.findOne({
      where: { name: "SALESMAN" },
    });
    const company = await models.Company.create({
      name: `Sole Owner Co ${suffix}`,
      phone: `2517${String(Date.now()).slice(-8)}`,
      status: "ACTIVE",
    });
    const ownerPhone = `251933${String(Date.now()).slice(-6)}`;
    const owner = await models.User.create({
      fullName: "Sole Owner",
      username: ownerPhone,
      phone: ownerPhone,
      password: "Owner@1234",
      roleId: ownerRole.id,
      companyId: company.id,
      status: "ACTIVE",
    });
    await models.User.create({
      fullName: "Team Member",
      username: `team_${suffix}`,
      phone: `251944${String(Date.now()).slice(-6)}`,
      password: "Team@1234",
      roleId: salesmanRole.id,
      companyId: company.id,
      status: "ACTIVE",
    });

    const cookie = await login(ownerPhone, "Owner@1234");
    const res = await request("POST", "/api/auth/delete-account", {
      cookie,
      body: { password: "Owner@1234", confirm: "DELETE" },
    });
    assert.equal(res.status, 409);
    assert.equal(res.json.error.code, "ACCOUNT_DELETE_SOLE_OWNER");

    await owner.reload();
    assert.equal(owner.status, "ACTIVE");
  });

  it("closes the company when the sole owner with no team deletes their account", async () => {
    const ownerRole = await models.Role.findOne({
      where: { name: "COMPANY_OWNER" },
    });
    const company = await models.Company.create({
      name: `Close Co ${suffix}`,
      phone: `2516${String(Date.now()).slice(-8)}`,
      status: "ACTIVE",
    });
    const ownerPhone = `251955${String(Date.now()).slice(-6)}`;
    const owner = await models.User.create({
      fullName: "Lone Owner",
      username: ownerPhone,
      phone: ownerPhone,
      password: "Lone@1234",
      roleId: ownerRole.id,
      companyId: company.id,
      status: "ACTIVE",
    });

    const cookie = await login(ownerPhone, "Lone@1234");
    const res = await request("POST", "/api/auth/delete-account", {
      cookie,
      body: { password: "Lone@1234", confirm: "DELETE" },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.data.deleted, true);
    assert.equal(res.json.data.companyClosed, true);

    await owner.reload();
    assert.equal(owner.status, "INACTIVE");
    await company.reload();
    assert.equal(company.status, "INACTIVE");
  });

  it("never deletes another user's account via this endpoint", async () => {
    const salesmanRole = await models.Role.findOne({
      where: { name: "SALESMAN" },
    });
    const company = await models.Company.create({
      name: `Other User Co ${suffix}`,
      phone: `2515${String(Date.now()).slice(-8)}`,
      status: "ACTIVE",
    });
    const aPhone = `251966${String(Date.now()).slice(-6)}`;
    const bPhone = `251977${String(Date.now()).slice(-6)}`;
    const userA = await models.User.create({
      fullName: "User A",
      username: aPhone,
      phone: aPhone,
      password: "UserA@123",
      roleId: salesmanRole.id,
      companyId: company.id,
      status: "ACTIVE",
    });
    const userB = await models.User.create({
      fullName: "User B",
      username: bPhone,
      phone: bPhone,
      password: "UserB@123",
      roleId: salesmanRole.id,
      companyId: company.id,
      status: "ACTIVE",
    });

    const cookie = await login(aPhone, "UserA@123");
    const res = await request("POST", "/api/auth/delete-account", {
      cookie,
      body: {
        password: "UserA@123",
        confirm: "DELETE",
        // Attempt to target someone else — ignored; only req.user.id is used.
        userId: userB.id,
      },
    });
    assert.equal(res.status, 200);
    await userA.reload();
    await userB.reload();
    assert.equal(userA.status, "INACTIVE");
    assert.equal(userB.status, "ACTIVE");
    assert.equal(userB.fullName, "User B");
  });
});
