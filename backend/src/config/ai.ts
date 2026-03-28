import OpenAI from 'openai';

export const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "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",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "WhatsApp AI Agents",
  }
});
