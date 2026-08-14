// Rules-based ingredient parser (2.1) — the no-API-key fallback and the
// normalizer for clean single-line ingredients (e.g. from recipe JSON-LD).
// Input: raw text. Output: [{ name, qty }] with prep noise stripped.

const UNICODE_FRACTIONS = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };

const UNITS = [
  'cups', 'cup', 'c', 'tablespoons', 'tablespoon', 'tbsps', 'tbsp', 'tbs', 'tb',
  'teaspoons', 'teaspoon', 'tsps', 'tsp', 'ounces', 'ounce', 'oz', 'pounds', 'pound', 'lbs', 'lb',
  'grams', 'gram', 'g', 'kilograms', 'kilogram', 'kg', 'milliliters', 'milliliter', 'ml',
  'liters', 'liter', 'l', 'quarts', 'quart', 'qt', 'pints', 'pint', 'pt', 'gallons', 'gallon', 'gal',
  'cloves', 'clove', 'cans', 'can', 'jars', 'jar', 'packages', 'package', 'pkg', 'packets', 'packet',
  'bunches', 'bunch', 'slices', 'slice', 'sticks', 'stick', 'pinches', 'pinch', 'dashes', 'dash',
  'heads', 'head', 'stalks', 'stalk', 'sprigs', 'sprig', 'handfuls', 'handful', 'pieces', 'piece',
  'bags', 'bag', 'boxes', 'box', 'bottles', 'bottle', 'containers', 'container', 'ears', 'ear',
  'fillets', 'fillet', 'links', 'link', 'strips', 'strip', 'sheets', 'sheet', 'bulbs', 'bulb'
];
const UNIT_RE = new RegExp(`^(${UNITS.join('|')})\\.?\\b`, 'i');

const SECTION_STOPPERS = /^(instructions?|directions?|method|steps?|preparation|to make|nutrition|notes?)\b/i;
const HEADER_LINES = /^(ingredients?|for the .{0,40}|shopping list|you('ll| will) need)\s*:?\s*$/i;
const INSTRUCTION_VERBS = /^(preheat|heat|combine|mix|stir|whisk|bake|cook|add the|place|transfer|remove|serve|set aside|meanwhile|bring|reduce|simmer|pour|spread|cover|let |allow|repeat|garnish|season the|slice the|drain the|in a )/i;
const PREP_WORDS = /,\s*(finely |roughly |thinly |coarsely |freshly )?(chopped|diced|minced|sliced|grated|shredded|melted|softened|beaten|peeled|crushed|cubed|julienned|halved|quartered|divided|drained|rinsed|trimmed|torn|cut into[^,]*|at room temperature|room temperature|to taste|for serving|for garnish|plus more[^,]*|or more[^,]*|optional)\s*$/i;

function normalizeFractions(s) {
  let out = s;
  for (const [uni, ascii] of Object.entries(UNICODE_FRACTIONS)) {
    // "1½" → "1 1/2"
    out = out.replace(new RegExp(`(\\d)${uni}`, 'g'), `$1 ${ascii}`).replaceAll(uni, ascii);
  }
  return out;
}

function cleanLine(raw) {
  return normalizeFractions(raw)
    .replace(/^[\s•*\-–—▢☐□✓·]+/, '')      // bullets / checkboxes
    .replace(/^\d+[.)]\s+(?=\D)/, '')        // "1. " list numbering (not "1 onion")
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseIngredientLine(raw) {
  let line = cleanLine(raw);
  if (!line) return null;

  let qtyParts = [];

  // Leading amount: "2", "1 1/2", "3-4", "2.5"
  const amountMatch = line.match(/^(\d+\s+\d\/\d|\d\/\d|\d+(\.\d+)?(\s*[-–to]+\s*\d+(\.\d+)?)?)\s*/);
  if (amountMatch) {
    qtyParts.push(amountMatch[1].replace(/\s*[-–]\s*/, '-'));
    line = line.slice(amountMatch[0].length);
  }

  // Parenthetical size right after amount: "1 (15 oz) can..."
  const parenSize = line.match(/^\(([^)]{1,20})\)\s*/);
  if (parenSize) {
    qtyParts.push(`(${parenSize[1]})`);
    line = line.slice(parenSize[0].length);
  }

  // Unit
  const unitMatch = line.match(UNIT_RE);
  if (unitMatch && amountMatch) {
    qtyParts.push(unitMatch[1].toLowerCase());
    line = line.slice(unitMatch[0].length).replace(/^\.?\s*(of\s+)?/i, '');
  }

  // Strip prep instructions and trailing parentheticals from the name
  let name = line.replace(PREP_WORDS, '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  name = name.replace(/[,;.]+$/, '').trim();
  if (!name) return null;
  name = name[0].toUpperCase() + name.slice(1);

  return { name, qty: qtyParts.join(' ') || null };
}

const METADATA_LINE = /^(prep|cook|total|active|serves|servings|yield|makes|course|cuisine|author|rating|calories|difficulty)s?\b\s*[:|]?/i;
const TO_TASTE_LINE = /to taste\.?$/i;

export function parseRecipeText(text) {
  const results = [];
  const seen = new Set();
  let stopped = false;

  // If there's an explicit "Ingredients" header, skip everything before it
  // (title, description, prep times).
  let lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex(l => /^ingredients?\s*:?\s*$/i.test(l.trim()));
  if (headerIdx !== -1) lines = lines.slice(headerIdx + 1);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (SECTION_STOPPERS.test(line)) { stopped = true; continue; }
    if (stopped) continue;                       // ignore everything after "Instructions"
    if (HEADER_LINES.test(line)) continue;       // "Ingredients:", "For the sauce"
    if (INSTRUCTION_VERBS.test(line)) continue;  // stray instruction sentences
    if (METADATA_LINE.test(line)) continue;      // "Prep: 20 min", "Serves 4"
    if (TO_TASTE_LINE.test(line) && !/^\d/.test(line)) continue; // "salt and pepper to taste"
    const words = line.split(/\s+/).length;
    if (words > 14) continue;                    // prose, not an ingredient
    const parsed = parseIngredientLine(line);
    if (!parsed || parsed.name.length < 2) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(parsed);
  }
  return results;
}
