const API = import.meta.env.VITE_API_URL || "";

export async function api(path, { method = "GET", body, query } = {}) {
  const url = new URL(`${API}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const res = await fetch(url.pathname + url.search, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json.error?.message || json.message || "Request failed";
    throw new Error(message);
  }
  return json;
}

export const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const qty = (value) => Number(value || 0).toLocaleString();
