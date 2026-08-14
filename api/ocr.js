// POST /api/ocr  { image: <base64>, media_type } → { ingredients: [{name, qty}] }
// Photo/screenshot → ingredient list via vision model (2.4). The image is
// processed in memory only — never stored.
import { requireUser, callClaude, extractIngredientsJson, ANTHROPIC_API_KEY, EXTRACT_SYSTEM } from './_utils.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!(await requireUser(req, res))) return;
  if (!ANTHROPIC_API_KEY) return res.status(501).json({ error: 'llm_unconfigured' });

  const { image, media_type } = req.body ?? {};
  if (!image || typeof image !== 'string' || image.length > 5_000_000) {
    return res.status(400).json({ error: 'bad_image' });
  }
  if (!ALLOWED_TYPES.includes(media_type)) return res.status(400).json({ error: 'bad_image_type' });

  try {
    const out = await callClaude({
      maxTokens: 2000,
      system: EXTRACT_SYSTEM,
      content: [
        { type: 'image', source: { type: 'base64', media_type, data: image } },
        { type: 'text', text: 'This is a photo or screenshot of a recipe. Extract the ingredients. If the image is too blurry or contains no recipe, return {"ingredients":[]}.' }
      ]
    });
    res.status(200).json({ ingredients: extractIngredientsJson(out) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'llm_failed' });
  }
}
