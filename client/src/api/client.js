const API = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const APP = String(import.meta.env.VITE_APP_URL || "").replace(/\/$/, "");

function buildUrl(path, query) {
  const url = API
    ? new URL(path, `${API}/`)
    : new URL(path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  return url;
}

export function appUrl(path = "") {
  let origin = String(APP || (typeof window !== "undefined" ? window.location.origin : "")).replace(
    /\/$/,
    "",
  );
  if (origin && !/^https?:\/\//i.test(origin)) {
    origin = `https://${origin}`;
  }
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${origin}${suffix}`;
}

/** Absolute https URL for WhatsApp / Telegram (auto-link detection). */
export function absoluteShareUrl(path = "") {
  const url = appUrl(path).trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}

export async function api(path, { method = "GET", body, query, formData } = {}) {
  const url = buildUrl(path, query);
  const res = await fetch(url.toString(), {
    method,
    credentials: "include",
    headers: formData ? undefined : body ? { "Content-Type": "application/json" } : undefined,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json.error?.message || json.message || "Request failed";
    throw new Error(message);
  }

  return json;
}

export async function downloadAuthenticated(path, filename) {
  const url = buildUrl(path);
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error?.message || json.message || "Download failed");
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const qty = (value) => Number(value || 0).toLocaleString();

export const VAT_RATE = Number(import.meta.env.VITE_VAT_RATE || 15);

export const APP_NAME = String(
  import.meta.env.APP_NAME || import.meta.env.VITE_APP_NAME || "",
).trim() || "Inventory";

/** Prefers server `.env` APP_NAME (via /health), then Vite-baked APP_NAME. */
export async function resolveAppName() {
  try {
    const url = buildUrl("/health");
    const res = await fetch(url.toString(), { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    const fromServer = String(json.appName || "").trim();
    if (fromServer) return fromServer;
  } catch {
    /* use client env */
  }
  return APP_NAME;
}

export const vatOf = (amount) =>
  Number(((Number(amount || 0) * VAT_RATE) / 100).toFixed(2));

export const withVat = (amount) =>
  Number((Number(amount || 0) + vatOf(amount)).toFixed(2));

export function documentVat({
  subtotal,
  discountAmount,
  taxAmount,
  totalAmount,
  vatRate,
} = {}) {
  const rate = Number(vatRate || VAT_RATE);
  const net = Math.max(0, Number(subtotal || 0) - Number(discountAmount || 0));
  const storedTax = Number(taxAmount || 0);
  const computedTax = Number(((net * rate) / 100).toFixed(2));
  const tax = storedTax > 0 ? storedTax : computedTax;
  const storedTotal = Number(totalAmount || 0);
  const computedTotal = Number((net + tax).toFixed(2));
  const total = storedTotal > net + 0.005 ? storedTotal : computedTotal;
  return { rate, net, tax, total };
}

export function designerCredit() {
  return {
    line: "Designed by Abyssinia Software Inventory",
    phone: "0951050364",
  };
}
