// ============================================================
// PROGRESS — Motore pasti: composizione automatica e calcolo macro
// ============================================================
// La dieta è già strutturata: l'utente sceglie cereale/pane/proteina/
// legumi/verdure/olio e questo modulo calcola grammi, calorie e macro,
// nascondendo la logica delle "sei combinazioni" dietro un'interfaccia
// semplice (vedi box_alimentazione_app.md).
import { INGREDIENTS } from './ingredients.js';

function ing(id) {
  const found = INGREDIENTS.find(i => i.id === id);
  if (!found) throw new Error(`Ingrediente non trovato: ${id}`);
  return found;
}

export function macroFor(ingredientId, grams) {
  const i = ing(ingredientId);
  const f = grams / 100;
  return {
    kcal: i.kcalPer100 * f,
    protein: i.proteinPer100 * f,
    carbs: i.carbsPer100 * f,
    fat: i.fatPer100 * f,
  };
}

function item(role, ingredientId, grams, unitLabel = null) {
  const i = ing(ingredientId);
  return { role, ingredientId, name: i.name, grams, unitLabel, ...macroFor(ingredientId, grams) };
}

export function totalsOf(items) {
  return items.reduce((t, i) => ({
    kcal: t.kcal + i.kcal,
    protein: t.protein + i.protein,
    carbs: t.carbs + i.carbs,
    fat: t.fat + i.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

// ── Colazione ────────────────────────────────────────────────

export const BREAKFAST_BASE = [
  { ingredientId: 'ing128', grams: 250 }, // Yogurt greco 0%
  { ingredientId: 'ing000', grams: 40 },  // Fiocchi d'avena
];

export const TOPPINGS = [
  { id: 'miele',         name: 'Miele',                    ingredientId: 'ing117', grams: 15 },
  { id: 'marmellata',    name: 'Marmellata',               ingredientId: 'ing118', grams: 20 },
  { id: 'acero',         name: "Sciroppo d'acero",         ingredientId: 'ing132', grams: 20 },
  { id: 'burroarachidi', name: "Burro d'arachidi",         ingredientId: 'ing119', grams: 10 },
  { id: 'cremanovi',     name: 'Crema Novi 45% nocciole',  ingredientId: 'ing134', grams: 10 },
  { id: 'ciocc70',       name: 'Cioccolato fondente 70%',  ingredientId: 'ing135', grams: 10 },
  { id: 'cacaoamaro',    name: 'Cacao amaro',              ingredientId: 'ing120', grams: 10 },
  { id: 'nocciole',      name: 'Granella di nocciole',     ingredientId: 'ing136', grams: 10 },
  { id: 'pistacchio',    name: 'Granella di pistacchio',   ingredientId: 'ing137', grams: 10 },
];

export function buildBreakfast(toppingId) {
  const items = BREAKFAST_BASE.map(b => item('base', b.ingredientId, b.grams));
  const topping = TOPPINGS.find(t => t.id === toppingId);
  if (topping) items.push(item('topping', topping.ingredientId, topping.grams));
  return items;
}

// ── Pranzo / Cena ────────────────────────────────────────────

export const CEREALI = [
  { id: 'riso',  name: 'Riso',  ingredientId: 'ing005' },
  { id: 'farro', name: 'Farro', ingredientId: 'ing007' },
  { id: 'pasta', name: 'Pasta', ingredientId: 'ing004' },
];

export const PANE = { ingredientId: 'ing001', name: 'Pane', defaultGrams: 50 };

export const PROTEINE = [
  { id: 'pollo',          name: 'Pollo',               kind: 'carne',     ingredientId: 'ing026', baseGrams: 200, legumiGrams: 150 },
  { id: 'tacchino',       name: 'Tacchino',            kind: 'carne',     ingredientId: 'ing027', baseGrams: 200, legumiGrams: 150 },
  { id: 'manzo',          name: 'Manzo magro',         kind: 'carne',     ingredientId: 'ing028', baseGrams: 200, legumiGrams: 150 },
  { id: 'pesce',          name: 'Pesce bianco',        kind: 'carne',     ingredientId: 'ing030', baseGrams: 200, legumiGrams: 150 },
  { id: 'tonno',          name: 'Tonno al naturale',   kind: 'carne',     ingredientId: 'ing032', baseGrams: 170, legumiGrams: 130 },
  { id: 'uova',           name: 'Uova',                kind: 'uova' },
  { id: 'parmigiano',     name: 'Parmigiano Reggiano', kind: 'formaggio', ingredientId: 'ing061', baseGrams: 70,  legumiGrams: 50  },
  { id: 'philadelphia',   name: 'Philadelphia Light',  kind: 'formaggio', ingredientId: 'ing130', baseGrams: 150, legumiGrams: 120 },
  { id: 'fiocchidilatte', name: 'Fiocchi di latte',    kind: 'formaggio', ingredientId: 'ing055', baseGrams: 200, legumiGrams: 150 },
  { id: 'ricottalight',   name: 'Ricotta light',       kind: 'formaggio', ingredientId: 'ing129', baseGrams: 180, legumiGrams: 150 },
];

export const LEGUMI = [
  { id: 'ceci',       name: 'Ceci',       ingredientId: 'ing125' },
  { id: 'fagioli',    name: 'Fagioli',    ingredientId: 'ing126' },
  { id: 'lenticchie', name: 'Lenticchie', ingredientId: 'ing127' },
  { id: 'piselli',    name: 'Piselli',    ingredientId: 'ing079' },
];
export const LEGUMI_GRAMS = 150;

export const VERDURE_OPZIONALI = [
  { id: 'zucchine',  name: 'Zucchine',  ingredientId: 'ing065' },
  { id: 'broccoli',  name: 'Broccoli',  ingredientId: 'ing070' },
  { id: 'spinaci',   name: 'Spinaci',   ingredientId: 'ing072' },
  { id: 'fagiolini', name: 'Fagiolini', ingredientId: 'ing083' },
  { id: 'peperoni',  name: 'Peperoni',  ingredientId: 'ing073' },
  { id: 'melanzane', name: 'Melanzane', ingredientId: 'ing074' },
  { id: 'insalata',  name: 'Insalata',  ingredientId: 'ing067' },
  { id: 'pomodori',  name: 'Pomodori',  ingredientId: 'ing064' },
];
export const VERDURE_DEFAULT_ID = 'ing133'; // Verdure miste
export const VERDURE_GRAMS = 300;

export const OLIO_INGREDIENT_ID = 'ing109';

function baseCerealGrams(proteinKind, hasLegumi) {
  if (hasLegumi) return 60;
  if (proteinKind === 'carne') return 90;
  return 80; // uova o formaggio
}

function cerealWithBread(base, paneGrams) {
  if (!paneGrams) return base;
  const reduced = base - paneGrams * 0.7;
  return Math.max(0, Math.round(reduced / 5) * 5);
}

export function defaultOilGrams(proteinKind) {
  return proteinKind === 'carne' ? 15 : 10;
}

export function defaultCerealGrams(proteinKind, hasLegumi, hasPane, paneGrams) {
  const base = baseCerealGrams(proteinKind, hasLegumi);
  return hasPane ? cerealWithBread(base, paneGrams) : base;
}

// Costruisce la composizione completa di un pranzo/cena a partire dalle
// scelte dell'utente. Le quantità (proteina, cereale, olio) sono già
// calcolate automaticamente in base a proteina + legumi + pane.
export function buildMainMeal({ cerealeId, proteinaId, hasLegumi, legumeId, hasPane, paneGrams, verduraId, oilGrams }) {
  const proteina = PROTEINE.find(p => p.id === proteinaId) ?? PROTEINE[0];
  const items = [];

  if (proteina.kind === 'uova') {
    if (hasLegumi) {
      items.push(item('proteina', 'ing024', 100, '2 uova'));
      items.push(item('proteina', 'ing025', 150));
      const legume = LEGUMI.find(l => l.id === legumeId) ?? LEGUMI[0];
      items.push(item('legumi', legume.ingredientId, LEGUMI_GRAMS));
    } else {
      items.push(item('proteina', 'ing024', 150, '3 uova'));
      items.push(item('proteina', 'ing025', 200));
    }
  } else {
    const grams = hasLegumi ? proteina.legumiGrams : proteina.baseGrams;
    items.push(item('proteina', proteina.ingredientId, grams));
    if (hasLegumi) {
      const legume = LEGUMI.find(l => l.id === legumeId) ?? LEGUMI[0];
      items.push(item('legumi', legume.ingredientId, LEGUMI_GRAMS));
    }
  }

  const cereale = CEREALI.find(c => c.id === cerealeId) ?? CEREALI[0];
  const cerealeGrams = defaultCerealGrams(proteina.kind, hasLegumi, hasPane, paneGrams);
  if (cerealeGrams > 0) items.push(item('cereale', cereale.ingredientId, cerealeGrams));
  if (hasPane) items.push(item('pane', PANE.ingredientId, paneGrams));

  const verdura = verduraId ? VERDURE_OPZIONALI.find(v => v.id === verduraId) : null;
  items.push(item('verdure', verdura ? verdura.ingredientId : VERDURE_DEFAULT_ID, VERDURE_GRAMS));

  items.push(item('olio', OLIO_INGREDIENT_ID, oilGrams));

  return items;
}

// ── Spuntini ─────────────────────────────────────────────────

export const SNACK_PRESETS_DEFAULT = [
  { id: 'skyr',             name: 'Skyr',                       items: [{ ingredientId: 'ing053', grams: 150 }] },
  { id: 'yogurtgreco',      name: 'Yogurt greco',                items: [{ ingredientId: 'ing052', grams: 170 }] },
  { id: 'yogurtproteico',   name: 'Yogurt proteico',             items: [{ ingredientId: 'ing131', grams: 150 }] },
  { id: 'frutto',           name: 'Frutto',                      items: [{ ingredientId: 'ing089', grams: 150 }] },
  { id: 'galletteaffettato',name: 'Gallette + affettato magro',  items: [{ ingredientId: 'ing013', grams: 20 }, { ingredientId: 'ing041', grams: 50 }] },
  { id: 'fruttasecca',      name: 'Frutta secca',                items: [{ ingredientId: 'ing105', grams: 20 }] },
];

export function buildPresetItems(presetItems) {
  return presetItems.map(p => item('preset', p.ingredientId, p.grams));
}
