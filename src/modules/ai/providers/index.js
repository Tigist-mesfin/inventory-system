const env = require("../../../config/env");
const LocalAIProvider = require("./LocalAIProvider");
const OpenAIProvider = require("./OpenAIProvider");
const GeminiProvider = require("./GeminiProvider");

exports.createAIProvider = () => {
  const name = String(env.AI_PROVIDER || "local").toLowerCase();
  if (name === "openai" && env.OPENAI_API_KEY) {
    return new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  }
  if (name === "gemini" && env.GEMINI_API_KEY) {
    return new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }
  return new LocalAIProvider();
};
