/**
 * The tutor's language model: any OpenAI-compatible endpoint (hosted, or self-hosted such as Ollama / vLLM).
 *   TUTOR_LLM_URL=https://…/v1   TUTOR_LLM_MODEL=…   [TUTOR_LLM_KEY=…]
 * Falls back to the advisor's ADVISOR_LLM_* variables. Without any, the tutor still works in "extracts only" mode.
 */
type Env = Record<string, string | undefined>;
export const tutorLlmConfig = (env: Env = process.env) => {
  const url = env.TUTOR_LLM_URL ?? env.ADVISOR_LLM_URL, model = env.TUTOR_LLM_MODEL ?? env.ADVISOR_LLM_MODEL, key = env.TUTOR_LLM_KEY ?? env.ADVISOR_LLM_KEY;
  return url && model ? { url: url.replace(/\/$/, ""), model, key } : null;
};

export async function tutorComplete(system: string, user: string, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<string | null> {
  const cfg = tutorLlmConfig(env);
  if (!cfg) return null;
  try {
    const res = await fetcher(`${cfg.url}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cfg.key ? { authorization: `Bearer ${cfg.key}` } : {}) },
      body: JSON.stringify({ model: cfg.model, temperature: 0.2, max_tokens: 450, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}
