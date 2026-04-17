// OpenRouter API utility for AI features
// Using Qwen 2.5 Coder 32B Instruct model

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY_HUNTER;
const MODEL = "openrouter/hunter-alpha";

if (!OPENROUTER_API_KEY) {
  console.warn("⚠️ OPENROUTER_API_KEY not configured - some features may not work");
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call OpenRouter API with messages
 * @param messages - Array of chat messages
 * @param temperature - Randomness (0-1, default 0.3)
 * @param maxTokens - Max response length (default 500)
 * @returns AI response text
 */
export async function callOpenRouter(
  messages: Message[],
  temperature: number = 0.3,
  maxTokens: number = 500
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "Smart Email Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API Error ${response.status}:`, errorText);
      throw new Error(`OpenRouter API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("OpenRouter API call failed:", msg);
    throw error;
  }
}

/**
 * Simple wrapper for single prompt
 */
export async function callOpenRouterSimple(
  prompt: string,
  temperature: number = 0.3,
  maxTokens: number = 500
): Promise<string> {
  return callOpenRouter(
    [{ role: "user", content: prompt }],
    temperature,
    maxTokens
  );
}
