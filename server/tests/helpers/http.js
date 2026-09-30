const http = require("http");
const { initDB } = require("../../src/database");
const seedAdmin = require("../../src/database/seeders/seedAdmin");
const app = require("../../src/app");

let server;
let baseUrl;

const startTestApp = async () => {
  if (baseUrl) return baseUrl;
  await initDB();
  await seedAdmin();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  return baseUrl;
};

const stopTestApp = async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
    baseUrl = null;
  }
};

const cookieHeader = (setCookies = [], prev = "") => {
  const jar = new Map();
  for (const part of prev
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const i = part.indexOf("=");
    if (i > 0) jar.set(part.slice(0, i), part.slice(i + 1));
  }
  for (const c of setCookies) {
    const [pair] = String(c).split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
};

const request = async (method, path, { body, cookie } = {}) => {
  const url = `${baseUrl}${path}`;
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = { raw };
  }

  return {
    status: res.status,
    json,
    setCookie: typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [],
  };
};

const leakPassword = (json) => JSON.stringify(json).includes('"password"');

module.exports = {
  startTestApp,
  stopTestApp,
  request,
  cookieHeader,
  leakPassword,
};
