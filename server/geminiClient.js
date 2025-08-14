import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKeys = process.env.GEMINI_API_KEYS.split(",").map(k => k.trim());

export async function generateWithFailover(prompt) {
  let lastError;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Success
      return { success: true, data: text };

    } catch (error) {
      console.error(`Gemini API key ${i + 1} failed:`, error.message);
      lastError = error;
    }
  }

  // All keys failed
  return { success: false, error: lastError };
}
