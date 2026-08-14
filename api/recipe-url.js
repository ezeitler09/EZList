// POST /api/recipe-url  { url } → { title, lines: [raw ingredient strings] }
//                              or { title, ingredients: [{name, qty}] }  (LLM fallback path)
// Fetches the page server-side (avoids CORS), prefers schema.org/Recipe JSON-LD —
// which most recipe sites embed — and only falls back to LLM extraction when
// there's no structured data (2.3).
import { requireUser, callClaude, extractIngredientsJson, ANTHROPIC_API_KEY, EXTRACT_SYSTEM } from './_utils.js';

function findRecipeNode(node, depth = 0) {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findRecipeNode(n, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === 'object') {
    const type = node['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.some(t => typeof t === 'string' && t.toLowerCase() === 'recipe')) return node;
    for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement']) {
      if (node[key]) {
        const found = findRecipeNode(node[key], depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!(await requireUser(req, res))) return;

  let url;
  try {
    url = new URL(req.body?.url || '');
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'bad_url' });
  }

  let html;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const page = await fetch(url.href, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        accept: 'text/html,application/xhtml+xml'
      }
    });
    clearTimeout(timer);
    if (!page.ok) return res.status(422).json({ error: 'fetch_failed', status: page.status });
    html = (await page.text()).slice(0, 2_000_000);
  } catch {
    return res.status(422).json({ error: 'fetch_failed' });
  }

  // Path 1: schema.org/Recipe JSON-LD (no LLM needed)
  const ldBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of ldBlocks) {
    let parsed;
    try { parsed = JSON.parse(raw.trim()); } catch { continue; }
    const recipe = findRecipeNode(parsed);
    const lines = recipe?.recipeIngredient || recipe?.ingredients;
    if (Array.isArray(lines) && lines.length) {
      return res.status(200).json({
        title: typeof recipe.name === 'string' ? recipe.name : null,
        lines: lines.filter(l => typeof l === 'string').slice(0, 100)
      });
    }
  }

  // Path 2: no structured data → LLM over the page text, if configured
  if (!ANTHROPIC_API_KEY) return res.status(422).json({ error: 'no_structured_data' });
  try {
    const text = stripHtml(html).slice(0, 18000);
    const out = await callClaude({
      system: EXTRACT_SYSTEM,
      content: `Extract the recipe ingredients from this web page text:\n\n${text}`
    });
    const ingredients = extractIngredientsJson(out);
    if (!ingredients.length) return res.status(422).json({ error: 'no_recipe_found' });
    res.status(200).json({ title: null, ingredients });
  } catch (e) {
    console.error(e);
    res.status(422).json({ error: 'no_structured_data' });
  }
}
