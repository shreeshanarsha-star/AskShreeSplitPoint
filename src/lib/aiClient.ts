// Shared text-generation client for every AI feature on the site
// (Talent.ai JD/resume parsing + pipeline summaries, Smart Screen.ai
// structuring + scoring, Job Postings.ai polish, Offer.ai polish, Jotz.ai
// capture classification). Uses OpenAI's Chat Completions API via a raw
// fetch call -- no SDK dependency, same "graceful, logged failure" shape
// as lib/email.ts's Resend integration. Swapped in from the Anthropic SDK
// because the Anthropic Console account hit an identity-verification
// wall; every caller kept the same "prompt in, plain text out" signature
// so no call-site logic (prompts, JSON parsing, etc.) had to change.
export const AI_TIMEOUT_MS = 25_000;
// Vision calls (Jotz.ai photographing a business card/receipt/document)
// need more headroom than a text-only completion.
export const AI_VISION_TIMEOUT_MS = 45_000;

// Provider selection. Setting OLLAMA_BASE_URL (e.g. http://localhost:11434)
// switches every AI feature to a local/self-hosted Ollama server through its
// OpenAI-compatible /v1/chat/completions endpoint -- free, no API key needed.
// Otherwise falls back to OpenAI (OPENAI_API_KEY). Neither set = AI is off and
// callers degrade gracefully (scores stay null / "Not scored yet").
export type AiProvider = "ollama" | "openai" | "none";

export function getAiProvider(): AiProvider {
  if (process.env.OLLAMA_BASE_URL) return "ollama";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

export function hasAiKey() {
  return getAiProvider() !== "none";
}

export function getModel(vision = false) {
  if (getAiProvider() === "ollama") {
    return vision
      ? process.env.OLLAMA_VISION_MODEL || "llama3.2-vision"
      : process.env.OLLAMA_MODEL || "llama3.2";
  }
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

// Where to send the chat-completions request, with the right auth headers.
// Local models are slower than hosted APIs, so timeouts are stretched.
export function getAiEndpoint(vision = false): {
  url: string;
  headers: Record<string, string>;
  model: string;
  timeoutFactor: number;
} {
  const provider = getAiProvider();
  if (provider === "ollama") {
    const base = (process.env.OLLAMA_BASE_URL as string).replace(/\/+$/, "");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Optional: only needed if Ollama sits behind an authenticated proxy/tunnel.
    if (process.env.OLLAMA_API_KEY) headers.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
    return {
      url: `${base}/v1/chat/completions`,
      headers,
      model: getModel(vision),
      timeoutFactor: 4,
    };
  }
  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      model: getModel(vision),
      timeoutFactor: 1,
    };
  }
  throw new Error("No AI provider configured. Set OLLAMA_BASE_URL (local Ollama) or OPENAI_API_KEY.");
}

async function chatCompletion(
  messages: unknown[],
  maxTokens: number,
  timeoutMs: number,
  vision = false
): Promise<string> {
  const ep = getAiEndpoint(vision);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs * ep.timeoutFactor);

  let res: Response;
  try {
    res = await fetch(ep.url, {
      method: "POST",
      headers: ep.headers,
      body: JSON.stringify({
        model: ep.model,
        max_tokens: maxTokens,
        messages,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The model timed out. Try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && (data as { error?: { message?: string } }).error?.message) ||
      `AI provider error (${res.status})`;
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("The model returned an empty response.");
  return text;
}

export async function callTextModel(
  prompt: string,
  maxTokens: number,
  timeoutMs: number = AI_TIMEOUT_MS
): Promise<string> {
  return chatCompletion([{ role: "user", content: prompt }], maxTokens, timeoutMs);
}

// Multimodal call for image understanding (Jotz.ai's business card /
// receipt / document / photo classification). gpt-4o-mini accepts an
// image alongside text in one user message -- same endpoint, same key,
// no separate vision integration to stand up. imageDataUrl must be a
// "data:<mime>;base64,<...>" string.
export async function callVisionModel(
  prompt: string,
  imageDataUrl: string,
  maxTokens: number,
  timeoutMs: number = AI_VISION_TIMEOUT_MS
): Promise<string> {
  return chatCompletion(
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    maxTokens,
    timeoutMs,
    true
  );
}
