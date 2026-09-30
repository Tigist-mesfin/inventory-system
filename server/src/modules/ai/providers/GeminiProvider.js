const AIProvider = require("./AIProvider");
const LocalAIProvider = require("./LocalAIProvider");
const { TOOLS, detectLanguage } = require("../intent.local");
const { keyNumbersFrom } = require("./LocalAIProvider");

const extractJson = (text) => {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

class GeminiProvider extends AIProvider {
  constructor(apiKey, model) {
    super("gemini");
    this.apiKey = apiKey;
    this.model = model || "gemini-3.6-flash";
    this.fallback = new LocalAIProvider();
  }

  async generate(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0 },
      }),
    });
    if (!res.ok) throw new Error("gemini_failed");
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  async interpret(question, filters) {
    try {
      const text = await this.generate(
        `Map this ERP question to one function. JSON only {"intent":"","language":"en|am|om","filters":{"period":"this_month"}}. Functions: ${TOOLS.join(", ")}. Question: ${question}`,
      );
      const parsed = extractJson(text);
      if (!parsed || !TOOLS.includes(parsed.intent)) {
        return this.fallback.interpret(question, filters);
      }
      return {
        intent: parsed.intent,
        language: parsed.language || detectLanguage(question),
        filters: { ...filters, ...(parsed.filters || {}) },
      };
    } catch {
      return this.fallback.interpret(question, filters);
    }
  }

  async explain(question, data, language) {
    try {
      const text = await this.generate(
        `Explain these inventory metrics. Use only this JSON. Never invent numbers. Reply JSON {"answer":"","explanation":"","recommendation":""} in language ${language}. Question: ${question}. Metrics: ${JSON.stringify(data).slice(0, 8000)}`,
      );
      const parsed = extractJson(text);
      if (!parsed?.answer) return this.fallback.explain(question, data, language);
      return {
        answer: parsed.answer,
        keyNumbers: keyNumbersFrom(data),
        explanation: parsed.explanation,
        recommendation: parsed.recommendation,
        language,
      };
    } catch {
      return this.fallback.explain(question, data, language);
    }
  }
}

module.exports = GeminiProvider;
