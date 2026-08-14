// Client helpers for the recipe-import endpoints (Milestone 2).
import { supabase } from './supabase.js';
import { parseRecipeText, parseIngredientLine } from './parseIngredients.js';

async function authedPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session?.access_token ?? ''}`
    },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await r.json(); } catch { /* non-JSON error body */ }
  return { ok: r.ok, status: r.status, json };
}

// Paste path (2.2): try the LLM endpoint, fall back to the built-in rules parser.
export async function parseText(text) {
  try {
    const r = await authedPost('/api/parse', { text });
    if (r.ok && r.json?.ingredients?.length) {
      return { ingredients: r.json.ingredients, engine: 'llm' };
    }
  } catch { /* offline API, static deploy, etc. — fall through */ }
  const ingredients = parseRecipeText(text);
  return { ingredients, engine: 'rules' };
}

// URL path (2.3)
export async function parseUrl(url) {
  const r = await authedPost('/api/recipe-url', { url });
  if (!r.ok) {
    throw new Error(
      r.status === 401 ? 'Session expired — refresh the page and try again.'
        : "Couldn't read that site. Try copying the ingredients and pasting them in the Paste tab instead."
    );
  }
  if (r.json.ingredients?.length) return { title: r.json.title, ingredients: r.json.ingredients };
  const ingredients = (r.json.lines ?? []).map(parseIngredientLine).filter(Boolean);
  if (!ingredients.length) throw new Error("No ingredients found on that page — try the Paste tab instead.");
  return { title: r.json.title, ingredients };
}

// Photo path (2.4)
export async function parseImage(file) {
  const { base64, mediaType } = await compressImage(file);
  const r = await authedPost('/api/ocr', { image: base64, media_type: mediaType });
  if (r.status === 501) {
    throw new Error('Photo import needs an Anthropic API key configured in Vercel (see README, "Enabling photo import").');
  }
  if (!r.ok) throw new Error("Couldn't read that image. Try a straighter, better-lit photo.");
  if (!r.json.ingredients?.length) {
    throw new Error("No ingredients found in that photo. Try getting the ingredient list fully in frame.");
  }
  return { ingredients: r.json.ingredients };
}

// Downscale + JPEG-encode client-side so uploads stay small.
async function compressImage(file, maxDim = 1800) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Fallback: send the original if the browser can't decode it to a bitmap.
    const base64 = await fileToBase64(file);
    return { base64, mediaType: file.type || 'image/jpeg' };
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
