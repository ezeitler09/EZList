// POST /api/parse  { text } → { ingredients: [{name, qty}] }
// LLM-based ingredient extraction from pasted recipe text (2.2).
// Returns 501 if no ANTHROPIC_API_KEY is configured — the app then falls back
// to its built-in rules parser.
import { requireUser, callClaude, extractIngredientsJson, ANTHROPIC_API_KEY, EXTRACT_SYSTEM } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!(await requireUser(req, res))) return;
  if (!ANTHROPIC_API_KEY) return res.status(501).json({ error: 'llm_unconfigured' });

  const text = (req.body?.text || '').slice(0, 20000);
  if (!text.trim()) return res.status(400).json({ error: 'empty_text' });

  try {
    const out = await callClaude({
      system: EXTRACT_SYSTEM,
      content: `Extract the ingredients from this recipe text:\n\n${text}`
    });
    res.status(200).json({ ingredients: extractIngredientsJson(out) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'llm_failed' });
  }
}
