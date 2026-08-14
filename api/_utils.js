// Shared helpers for EZList API functions (files starting with _ are not routes).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// Only household members (anyone with a valid Supabase session for THIS project)
// may use these endpoints — keeps strangers from burning the API budget.
export async function requireUser(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

export async function callClaude({ system, content, maxTokens = 1500 }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }]
    })
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`llm_error ${r.status}: ${body.slice(0, 300)}`);
  }
  const data = await r.json();
  return data.content?.filter(b => b.type === 'text').map(b => b.text).join('') ?? '';
}

export function extractIngredientsJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('llm_bad_output');
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed.ingredients)) throw new Error('llm_bad_output');
  return parsed.ingredients
    .filter(i => i && typeof i.name === 'string' && i.name.trim())
    .map(i => ({
      name: i.name.trim().slice(0, 120),
      qty: typeof i.qty === 'string' && i.qty.trim() ? i.qty.trim().slice(0, 60) : null
    }));
}

export const EXTRACT_SYSTEM = `You extract shopping-list ingredients from recipes.
Return ONLY a JSON object: {"ingredients":[{"name":"...","qty":"..." or null}]}.
Rules:
- "name" is the plain grocery item to buy (e.g. "Chicken thighs", "All-purpose flour"). Strip prep instructions ("diced", "melted", "at room temperature").
- "qty" is the amount + unit as written (e.g. "2 lbs", "1 1/2 cups", "1 (15 oz) can"), or null if none given.
- Include every distinct ingredient once. Merge duplicates.
- Ignore water unless a specific bottled/sparkling product. Ignore "salt and pepper to taste" style lines: include plain "Salt" or "Pepper" only if a measured amount is specified.
- Do not invent ingredients. If the input contains no recipe ingredients, return {"ingredients":[]}.`;
