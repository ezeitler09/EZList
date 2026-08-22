// Store-section auto-categorization (Task 1.4).
// Local keyword dictionary first; household overrides (passed in by caller) always win.
//
// Matching rules:
//  - Multi-word keywords ("green bean") match as substrings of the item name.
//  - Single-word keywords match whole words only, with simple plural handling,
//    so "pea" matches "peas" but never "peanut butter".
//  - Rule order matters: earlier sections win (e.g. Frozen before Produce so
//    "frozen peas" lands in Frozen).

export const SECTIONS = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Frozen',
  'Pantry & Dry Goods',
  'Canned Goods',
  'Beverages',
  'Snacks',
  'Condiments & Spices',
  'Household & Cleaning',
  'Personal Care',
  'Other'
];

const RULES = [
  ['Frozen', ['frozen', 'ice cream', 'popsicle', 'pizza roll', 'waffle', 'tater tot', 'sorbet', 'gelato']],

  ['Canned Goods', [
    'canned', 'can of', 'soup', 'broth', 'stock', 'tomato sauce', 'tomato paste', 'crushed tomato',
    'diced tomato', 'black bean', 'kidney bean', 'garbanzo', 'chickpea', 'refried bean', 'coconut milk',
    'pumpkin puree', 'green chile', 'green chiles', 'green chili'
  ]],

  ['Condiments & Spices', [
    'ketchup', 'mustard', 'mayo', 'mayonnaise', 'relish', 'hot sauce', 'sriracha', 'soy sauce', 'bbq',
    'barbecue', 'ranch', 'dressing', 'vinegar', 'olive oil', 'vegetable oil', 'canola', 'sesame oil',
    'salt', 'black pepper', 'paprika', 'cumin', 'chili powder', 'oregano', 'cinnamon', 'nutmeg',
    'curry', 'turmeric', 'garlic powder', 'onion powder', 'red pepper flake', 'bay leaf', 'bay leaves',
    'spice', 'seasoning', 'worcestershire', 'fish sauce', 'tahini', 'pesto', 'marinara'
  ]],

  ['Produce', [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'berry', 'strawberry', 'blueberry', 'raspberry',
    'blackberry', 'melon', 'watermelon', 'cantaloupe', 'pineapple', 'mango', 'peach', 'pear', 'plum',
    'kiwi', 'avocado', 'lettuce', 'spinach', 'kale', 'arugula', 'romaine', 'salad', 'cabbage', 'broccoli',
    'cauliflower', 'carrot', 'celery', 'cucumber', 'zucchini', 'squash', 'pepper', 'jalapeno', 'onion',
    'garlic', 'shallot', 'potato', 'sweet potato', 'yam', 'tomato', 'mushroom', 'corn', 'green bean',
    'pea', 'asparagus', 'brussels', 'radish', 'beet', 'ginger', 'cilantro', 'parsley', 'basil', 'mint',
    'rosemary', 'thyme', 'dill', 'scallion', 'green onion', 'leek', 'eggplant', 'herb'
  ]],

  ['Meat & Seafood', [
    'chicken', 'beef', 'steak', 'ground beef', 'pork', 'bacon', 'sausage', 'ham', 'turkey', 'lamb',
    'salmon', 'tuna', 'shrimp', 'fish', 'tilapia', 'cod', 'crab', 'lobster', 'scallop',
    'hot dog', 'bratwurst', 'brat', 'rib', 'roast', 'meatball', 'deli', 'salami', 'pepperoni',
    'prosciutto', 'chorizo'
  ]],

  ['Dairy & Eggs', [
    'milk', 'cream', 'half and half', 'half-and-half', 'butter', 'egg', 'cheese', 'cheddar', 'mozzarella',
    'parmesan', 'feta', 'goat cheese', 'cream cheese', 'yogurt', 'sour cream', 'cottage cheese',
    'whipped cream', 'oat milk', 'almond milk', 'soy milk', 'buttermilk'
  ]],

  ['Bakery', [
    'bread', 'bagel', 'bun', 'roll', 'tortilla', 'pita', 'baguette', 'croissant', 'muffin',
    'english muffin', 'naan', 'sourdough', 'cake', 'pie', 'donut', 'doughnut', 'brioche'
  ]],

  ['Pantry & Dry Goods', [
    'flour', 'sugar', 'brown sugar', 'powdered sugar', 'rice', 'pasta', 'spaghetti', 'penne', 'macaroni',
    'noodle', 'ramen', 'quinoa', 'oat', 'oatmeal', 'cereal', 'granola', 'lentil', 'baking soda',
    'baking powder', 'yeast', 'cornstarch', 'corn starch', 'breadcrumb', 'panko', 'vanilla extract',
    'chocolate chip', 'cocoa', 'peanut butter', 'almond butter', 'jelly', 'jam', 'nutella',
    'raisin', 'couscous', 'taco shell', 'pancake mix', 'syrup', 'honey', 'dried'
  ]],

  ['Beverages', [
    'water', 'sparkling', 'soda', 'cola', 'juice', 'coffee', 'tea', 'kombucha', 'lemonade', 'beer',
    'wine', 'seltzer', 'gatorade', 'energy drink', 'hot chocolate', 'cider'
  ]],

  ['Snacks', [
    'chip', 'cracker', 'pretzel', 'popcorn', 'nut', 'almond', 'cashew', 'peanut', 'pistachio',
    'trail mix', 'granola bar', 'protein bar', 'cookie', 'candy', 'chocolate', 'gum', 'fruit snack',
    'jerky', 'salsa', 'hummus', 'guacamole'
  ]],

  ['Household & Cleaning', [
    'paper towel', 'toilet paper', 'napkin', 'trash bag', 'garbage bag', 'ziploc', 'zip lock', 'foil',
    'plastic wrap', 'parchment', 'dish soap', 'detergent', 'bleach', 'sponge', 'cleaner', 'wipe',
    'laundry', 'dryer sheet', 'light bulb', 'battery'
  ]],

  ['Personal Care', [
    'shampoo', 'conditioner', 'soap', 'body wash', 'toothpaste', 'toothbrush', 'floss', 'deodorant',
    'razor', 'shaving', 'lotion', 'sunscreen', 'tissue', 'kleenex', 'band-aid', 'bandaid', 'advil',
    'tylenol', 'ibuprofen', 'vitamin', 'q-tip', 'cotton ball', 'makeup', 'chapstick', 'lip balm'
  ]]
];

export function normalizeKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Matching key for pantry lookups: normalized + last word singularized,
// so "Eggs" / "egg" and "Tortillas" / "tortilla" match each other.
export function itemKey(name) {
  const tokens = normalizeKey(name).split(' ');
  if (!tokens.length || !tokens[0]) return normalizeKey(name);
  tokens[tokens.length - 1] = singularize(tokens[tokens.length - 1]);
  return tokens.join(' ');
}

function singularize(token) {
  if (token.length > 3 && token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.length > 3 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 2 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

export function categorize(name, overrides = {}) {
  const key = normalizeKey(name);
  if (overrides[key]) return overrides[key];

  const rawTokens = key.split(/[^a-z0-9-]+/).filter(Boolean);
  const tokens = new Set();
  for (const t of rawTokens) {
    tokens.add(t);
    tokens.add(singularize(t));
  }

  // Pass 1: multi-word phrases (most specific — "peanut butter" beats "butter").
  for (const [section, keywords] of RULES) {
    for (const kw of keywords) {
      if (kw.includes(' ') && key.includes(kw)) return section;
    }
  }
  // Pass 2: single-word whole-token matches.
  for (const [section, keywords] of RULES) {
    for (const kw of keywords) {
      if (!kw.includes(' ') && tokens.has(kw)) return section;
    }
  }
  return 'Other';
}
