const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const {
  startTestApp,
  stopTestApp,
  request,
  cookieHeader,
  leakPassword,
} = require("./helpers/http");

const adminUsername = process.env.ADMIN_SEED_USERNAME;
const adminPassword = process.env.ADMIN_SEED_PASSWORD;
const suffix = `t${Date.now()}`;

describe("auth RBAC CRUD", () => {
  let adminCookie = "";
  let adminId = "";
  let adminRoleId = "";
  let clerkRoleId = "";
  let clerkUserId = "";
  let authReadId = "";
  let authCreateId = "";
  let catalogReadId = "";
  let assignmentId = "";

  before(async () => {
    await startTestApp();
    const login = await request("POST", "/api/auth/login", {
      body: { username: adminUsername, password: adminPassword },
    });
    assert.equal(login.status, 200, JSON.stringify(login.json));
    adminCookie = cookieHeader(login.setCookie);
    adminId = login.json.data.user.id;
    adminRoleId = login.json.data.user.role.id;
  });

  after(async () => {
    if (clerkUserId && adminCookie) {
      await request("DELETE", `/api/users/${clerkUserId}`, {
        cookie: adminCookie,
      });
    }
    if (clerkRoleId && adminCookie) {
      await request("DELETE", `/api/roles/${clerkRoleId}`, {
        cookie: adminCookie,
      });
    }
    await stopTestApp();
  });

  it("rejects unauthenticated user list with 401", async () => {
    const res = await request("GET", "/api/users");
    assert.equal(res.status, 401);
  });

  it("lists users without password hashes", async () => {
    const res = await request("GET", "/api/users?limit=20", {
      cookie: adminCookie,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.data.users));
    assert.ok(res.json.meta.total >= 1);
    assert.equal(leakPassword(res.json), false);
  });

  it("lists roles and permissions", async () => {
    const roles = await request("GET", "/api/roles", { cookie: adminCookie });
    assert.equal(roles.status, 200);
    assert.ok(roles.json.data.roles.some((r) => r.name === "ADMIN"));

    const perms = await request("GET", "/api/permissions?limit=100", {
      cookie: adminCookie,
    });
    assert.equal(perms.status, 200);
    assert.equal(perms.json.meta.total, 42);
    authReadId = perms.json.data.permissions.find((p) => p.name === "auth:READ").id;
    authCreateId = perms.json.data.permissions.find(
      (p) => p.name === "auth:CREATE",
    ).id;
    catalogReadId = perms.json.data.permissions.find(
      (p) => p.name === "catalog:READ",
    ).id;
  });

  it("creates a limited CLERK role with selected permissions", async () => {
    const res = await request("POST", "/api/roles", {
      cookie: adminCookie,
      body: {
        name: `clerk_${suffix}`,
        description: "Limited test clerk",
        permissionIds: [authReadId, catalogReadId],
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    assert.equal(res.json.data.role.name.startsWith("CLERK_"), true);
    assert.equal(res.json.data.role.permissions.length, 2);
    clerkRoleId = res.json.data.role.id;
  });

  it("creates a clerk user", async () => {
    const res = await request("POST", "/api/users", {
      cookie: adminCookie,
      body: {
        fullName: "Test Clerk",
        username: `clerk_${suffix}`,
        phone: "0911111111",
        password: "Clerk@12345",
        roleId: clerkRoleId,
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    assert.equal(res.json.data.user.username, `clerk_${suffix}`);
    assert.equal(leakPassword(res.json), false);
    clerkUserId = res.json.data.user.id;
  });

  it("rejects a duplicate username with 409", async () => {
    const res = await request("POST", "/api/users", {
      cookie: adminCookie,
      body: {
        fullName: "Dup",
        username: `clerk_${suffix}`,
        phone: "0911111112",
        password: "Clerk@12345",
        roleId: clerkRoleId,
      },
    });
    assert.equal(res.status, 409);
  });

  it("gets and updates the clerk user", async () => {
    const got = await request("GET", `/api/users/${clerkUserId}`, {
      cookie: adminCookie,
    });
    assert.equal(got.status, 200);
    assert.equal(got.json.data.user.id, clerkUserId);

    const patched = await request("PATCH", `/api/users/${clerkUserId}`, {
      cookie: adminCookie,
      body: { fullName: "Test Clerk Updated" },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.json.data.user.fullName, "Test Clerk Updated");
  });

  it("forbids self-deactivation and self-delete", async () => {
    const deact = await request("PATCH", `/api/users/${adminId}`, {
      cookie: adminCookie,
      body: { status: "INACTIVE" },
    });
    assert.equal(deact.status, 403);

    const del = await request("DELETE", `/api/users/${adminId}`, {
      cookie: adminCookie,
    });
    assert.equal(del.status, 403);
  });

  it("resets the clerk password through the User model hook", async () => {
    const reset = await request(
      "POST",
      `/api/users/${clerkUserId}/reset-password`,
      {
        cookie: adminCookie,
        body: { newPassword: "Clerk@99999" },
      },
    );
    assert.equal(reset.status, 200);

    const oldLogin = await request("POST", "/api/auth/login", {
      body: { username: `clerk_${suffix}`, password: "Clerk@12345" },
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request("POST", "/api/auth/login", {
      body: { username: `clerk_${suffix}`, password: "Clerk@99999" },
    });
    assert.equal(newLogin.status, 200);
    const clerkCookie = cookieHeader(newLogin.setCookie);

    const forbidden = await request("POST", "/api/users", {
      cookie: clerkCookie,
      body: {
        fullName: "Nope",
        username: `nope_${suffix}`,
        phone: "0911222333",
        password: "Nope@12345",
        roleId: clerkRoleId,
      },
    });
    assert.equal(forbidden.status, 403);

    const allowedRead = await request("GET", "/api/users", {
      cookie: clerkCookie,
    });
    assert.equal(allowedRead.status, 200);
  });

  it("rejects assigning a permission that the role already has", async () => {
    const res = await request("POST", "/api/role-permissions", {
      cookie: adminCookie,
      body: { roleId: clerkRoleId, permissionId: authReadId },
    });
    assert.equal(res.status, 409);
  });

  it("assigns a new permission and lists role-permissions", async () => {
    const assigned = await request("POST", "/api/role-permissions", {
      cookie: adminCookie,
      body: { roleId: clerkRoleId, permissionId: authCreateId },
    });
    assert.equal(assigned.status, 201, JSON.stringify(assigned.json));
    assignmentId = assigned.json.data.rolePermission.id;

    const list = await request(
      "GET",
      `/api/role-permissions?roleId=${clerkRoleId}`,
      { cookie: adminCookie },
    );
    assert.equal(list.status, 200);
    assert.ok(list.json.data.rolePermissions.length >= 3);
  });

  it("replaces role permissions and unassigns one", async () => {
    const replaced = await request("PUT", `/api/roles/${clerkRoleId}/permissions`, {
      cookie: adminCookie,
      body: { permissionIds: [authReadId, catalogReadId] },
    });
    assert.equal(replaced.status, 200);
    assert.equal(replaced.json.data.role.permissions.length, 2);

    const listed = await request(
      "GET",
      `/api/role-permissions?roleId=${clerkRoleId}`,
      { cookie: adminCookie },
    );
    const row = listed.json.data.rolePermissions[0];
    const unassign = await request("DELETE", `/api/role-permissions/${row.id}`, {
      cookie: adminCookie,
    });
    assert.equal(unassign.status, 200);

    await request("PUT", `/api/roles/${clerkRoleId}/permissions`, {
      cookie: adminCookie,
      body: { permissionIds: [authReadId, catalogReadId] },
    });
  });

  it("forbids deleting or deactivating the ADMIN role", async () => {
    const del = await request("DELETE", `/api/roles/${adminRoleId}`, {
      cookie: adminCookie,
    });
    assert.equal(del.status, 403);

    const patch = await request("PATCH", `/api/roles/${adminRoleId}`, {
      cookie: adminCookie,
      body: { status: "INACTIVE" },
    });
    assert.equal(patch.status, 403);
  });

  it("rejects deleting a permission that is still assigned", async () => {
    const res = await request("DELETE", `/api/permissions/${authReadId}`, {
      cookie: adminCookie,
    });
    assert.equal(res.status, 409);
  });

  it("rejects creating a duplicate catalog permission", async () => {
    const res = await request("POST", "/api/permissions", {
      cookie: adminCookie,
      body: { module: "catalog", action: "READ" },
    });
    assert.equal(res.status, 409);
  });

  it("deletes the clerk user and then the unused clerk role", async () => {
    const delUser = await request("DELETE", `/api/users/${clerkUserId}`, {
      cookie: adminCookie,
    });
    assert.equal(delUser.status, 200);
    clerkUserId = "";

    const delRole = await request("DELETE", `/api/roles/${clerkRoleId}`, {
      cookie: adminCookie,
    });
    assert.equal(delRole.status, 200);
    clerkRoleId = "";
  });
});
