/**
 * promptfoo custom provider — volá lokální /api/chat (AI SDK v6 UI message stream)
 * a vrací poskládaný text odpovědi Huga.
 *
 * Použití: `promptfoo eval` s providerem `file://./hugo-provider.mjs`.
 * Vyžaduje běžící dev server (npm run dev) a platný GOOGLE_AI_KEY_HYPOTEEKA.
 * Endpoint lze přepsat env proměnnou HUGO_CHAT_URL.
 */

const CHAT_URL = process.env.HUGO_CHAT_URL ?? 'http://localhost:3000/api/chat';

/** Rozparsuje SSE stream AI SDK a poskládá text-delta části. */
async function readStreamText(response) {
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  const toolCalls = [];
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === 'text-delta') text += evt.delta ?? evt.textDelta ?? '';
        if (typeof evt.type === 'string' && evt.type.startsWith('tool-input-available') && evt.toolName) {
          toolCalls.push(evt.toolName);
        }
        if (evt.type === 'tool-call' && evt.toolName) toolCalls.push(evt.toolName);
      } catch { /* ne-JSON řádky ignoruj */ }
    }
  }
  return { text, toolCalls };
}

export default class HugoProvider {
  id() {
    return 'hugo-chat';
  }

  /**
   * prompt = text uživatelské zprávy. Vars mohou nést `history` —
   * pole {role, text} pro multi-turn scénáře (salámová metoda).
   */
  async callApi(prompt, context) {
    const history = context?.vars?.history ?? [];
    const messages = [
      ...history.map((m, i) => ({
        id: `h${i}`,
        role: m.role,
        parts: [{ type: 'text', text: m.text }],
      })),
      { id: 'u-final', role: 'user', parts: [{ type: 'text', text: prompt }] },
    ];

    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        sessionId: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tenantId: 'hypoteeka',
        authorId: 'promptfoo-eval',
      }),
    });

    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${await res.text()}` };
    }

    const { text, toolCalls } = await readStreamText(res);
    return {
      output: text + (toolCalls.length ? `\n[TOOLS: ${toolCalls.join(', ')}]` : ''),
    };
  }
}
