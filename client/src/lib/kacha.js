/** Detect Kacha Mini App WebView session token (window.session). */
export function getKachaSessionToken() {
  try {
    const value = window.session;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const nested =
        value.session_token ||
        value.sessionToken ||
        value.token ||
        value.value;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function isKachaWebView() {
  return Boolean(getKachaSessionToken());
}

export function isKachaBridgeAvailable() {
  try {
    return typeof window.KachaSuperApp?.requestPayment === "function";
  } catch {
    return false;
  }
}

/**
 * Opens the native Kacha payment dialog. Never passes credentials/PIN.
 * @returns {Promise<unknown>}
 */
export function requestKachaBridgePayment(reference) {
  if (!reference) {
    return Promise.reject(new Error("Missing Kacha payment reference"));
  }
  if (!isKachaBridgeAvailable()) {
    return Promise.reject(
      new Error(
        "Kacha payment is only available inside the Kacha superapp. Open this app from Kacha to pay.",
      ),
    );
  }
  return new Promise((resolve, reject) => {
    try {
      const result = window.KachaSuperApp.requestPayment({ reference });
      if (result && typeof result.then === "function") {
        result.then(resolve).catch(reject);
        return;
      }
      resolve(result ?? { opened: true, reference });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function isKachaPaymentMethod(name) {
  return String(name || "").trim().toLowerCase() === "kacha";
}

/**
 * Poll payment status until terminal or timeout.
 * Backend remains source of truth — never treat bridge success as paid.
 */
export async function pollKachaPayment({
  api,
  saleId,
  paymentId,
  intervalMs = 2000,
  timeoutMs = 120000,
}) {
  const started = Date.now();
  const terminal = new Set(["PROCESSED", "CANCELED", "EXPIRED", "FAILED"]);
  while (Date.now() - started < timeoutMs) {
    const res = await api(`/api/sales/${saleId}/kacha/payments/${paymentId}`);
    const payment = res.data?.payment;
    if (payment && terminal.has(String(payment.status || "").toUpperCase())) {
      return payment;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    "Timed out waiting for Kacha payment confirmation. If you paid, refresh the sale shortly.",
  );
}

export function kachaStatusMessage(status) {
  switch (String(status || "").toUpperCase()) {
    case "PROCESSED":
      return "Payment received successfully.";
    case "CANCELED":
      return "Payment was canceled.";
    case "EXPIRED":
      return "Payment expired. Please try again.";
    case "FAILED":
      return "Payment failed. Please try again.";
    case "PENDING":
      return "Waiting for payment confirmation…";
    default:
      return "Payment status unknown.";
  }
}
