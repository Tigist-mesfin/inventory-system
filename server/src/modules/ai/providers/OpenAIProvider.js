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

class OpenAIProvider extends AIProvider {
  constructor(apiKey, model) {
    super("openai");
    this.apiKey = apiKey;
    this.model = model || "gpt-4o-mini";
    this.fallback = new LocalAIProvider();
  }

  async interpret(question, filters) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "Map the user question to exactly one analytics function. Reply JSON only: {\"intent\":\"functionName\",\"language\":\"en|am|om\",\"filters\":{\"period\":\"today|this_week|this_month|last_month|this_year|custom\",\"search\":null}}. Allowed intents: " +
                TOOLS.join(", ") +
                ". Never invent numbers.",
            },
            { role: "user", content: question },
          ],
        }),
      });
      if (!res.ok) return this.fallback.interpret(question, filters);
      const json = await res.json();
      const parsed = extractJson(json.choices?.[0]?.message?.content);
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
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You explain inventory analytics. Use ONLY the JSON metrics given. Never invent numbers. Reply JSON: {\"answer\":\"\",\"explanation\":\"\",\"recommendation\":\"\"}. Answer in the requested language. If costBasis is estimate, say so.",
            },
            {
              role: "user",
              content: JSON.stringify({
                question,
                language,
                metrics: data,
              }),
            },
          ],
        }),
      });
      if (!res.ok) return this.fallback.explain(question, data, language);
      const json = await res.json();
      const parsed = extractJson(json.choices?.[0]?.message?.content);
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

module.exports = OpenAIProvider;
