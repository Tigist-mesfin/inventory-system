const AppError = require("../../shared/errors/AppError");
const env = require("../../config/env");

const MODEL_CANDIDATES = [
  env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
].filter((value, index, list) => value && list.indexOf(value) === index);

const mapGeminiError = (status, bodyText) => {
  const text = String(bodyText || "");
  const lower = text.toLowerCase();
  if (status === 429 || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return "Gemini rate limit or quota exceeded. Wait a minute and try again.";
  }
  if (
    status === 404 ||
    lower.includes("not found") ||
    lower.includes("is not found") ||
    lower.includes("no longer available")
  ) {
    return "Gemini model was not found. Set GEMINI_MODEL=gemini-3.6-flash in the server .env and restart.";
  }
  if (
    status === 401 ||
    status === 403 ||
    lower.includes("api key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("permission_denied")
  ) {
    return "Gemini API key is invalid or not allowed for this model. Create a key in Google AI Studio and set GEMINI_API_KEY on the server.";
  }
  if (env.NODE_ENV === "development" && text) {
    const clipped = text.replace(/\s+/g, " ").slice(0, 240);
    return `Gemini request failed (${status || "error"}): ${clipped}`;
  }
  return "AI service is temporarily unavailable. Try again shortly.";
};

const generateWithModel = async (model, prompt) => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw AppError.badRequest(
      "Gemini is not configured. Set GEMINI_API_KEY on the server.",
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message = json?.error?.message || raw || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = message;
    err.model = model;
    throw err;
  }

  const text =
    json?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") ||
    "";
  if (!text.trim()) {
    const block = json?.promptFeedback?.blockReason;
    throw AppError.badRequest(
      block
        ? `Gemini blocked the prompt (${block}). Try a different question.`
        : "Gemini returned an empty response. Try rephrasing.",
    );
  }
  return text;
};

exports.generateText = async (prompt) => {
  let lastErr = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      return await generateWithModel(model, prompt);
    } catch (err) {
      if (err.statusCode) throw err;
      lastErr = err;
      const msg = String(err.body || err.message || "");
      const modelMissing =
        err.status === 404 ||
        /not found|no longer available|is not supported/i.test(msg);
      if (modelMissing) continue;
      console.error("[ai/gemini] error:", err.status || "", msg.slice(0, 300));
      throw AppError.badRequest(mapGeminiError(err.status, msg));
    }
  }
  const msg = String(lastErr?.body || lastErr?.message || "");
  console.error("[ai/gemini] model fallbacks failed:", msg.slice(0, 300));
  throw AppError.badRequest(mapGeminiError(lastErr?.status, msg));
};

exports.extractJson = (text) => {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};
