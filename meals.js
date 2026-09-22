// ============================================================
// PROGRESS — Motore pasti: composizione automatica e calcolo macro
// ============================================================
// La dieta è già strutturata: l'utente sceglie carboidrato/pane/proteina/
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

export const CARBOIDRATI = [
  { id: 'riso',     name: 'Riso',              ingredientId: 'ing005' },
  { id: 'farro',    name: 'Farro',             ingredientId: 'ing007' },
  { id: 'pasta',    name: 'Pasta',             ingredientId: 'ing004' },
  { id: 'couscous', name: 'Cous cous',         ingredientId: 'ing008' },
  { id: 'quinoa',   name: 'Quinoa',            ingredientId: 'ing018' },
  { id: 'orzo',     name: 'Orzo',              ingredientId: 'ing017' },
  { id: 'patate',   name: 'Patate',            ingredientId: 'ing009' },
  { id: 'gnocchi',  name: 'Gnocchi di patate', ingredientId: 'ing020' },
  { id: 'polenta',  name: 'Polenta',           ingredientId: 'ing021' },
  { id: 'pane',     name: 'Pane',              ingredientId: 'ing001' },
];

// Riferimento per le grammature "equivalenti": tutte le quantità standard
// (90/80/60 g) sono calibrate sul riso; per gli altri carboidrati si calcola
// la grammatura che fornisce le stesse calorie del riso alla stessa porzione.
const CARB_REFERENCE_ID = 'ing005';

function equivalentGrams(ingredientId, referenceGrams) {
  const reference = ing(CARB_REFERENCE_ID);
  const target = ing(ingredientId);
  const targetKcal = reference.kcalPer100 * (referenceGrams / 100);
  return Math.max(0, Math.round((targetKcal / target.kcalPer100) * 100 / 5) * 5);
}

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
  { id: 'zucchine',        name: 'Zucchine',          ingredientId: 'ing065' },
  { id: 'melanzane',       name: 'Melanzane',         ingredientId: 'ing074' },
  { id: 'peperoni',        name: 'Peperoni',          ingredientId: 'ing073' },
  { id: 'broccoli',        name: 'Broccoli',          ingredientId: 'ing070' },
  { id: 'cavolfiore',      name: 'Cavolfiore',        ingredientId: 'ing078' },
  { id: 'cavolocappuccio', name: 'Cavolo cappuccio',  ingredientId: 'ing138' },
  { id: 'verza',           name: 'Verza',             ingredientId: 'ing071' },
  { id: 'cavolonero',      name: 'Cavolo nero',       ingredientId: 'ing139' },
  { id: 'spinaci',         name: 'Spinaci',           ingredientId: 'ing072' },
  { id: 'bietole',         name: 'Bietole',           ingredientId: 'ing140' },
  { id: 'fagiolini',       name: 'Fagiolini',         ingredientId: 'ing083' },
  { id: 'asparagi',        name: 'Asparagi',          ingredientId: 'ing077' },
  { id: 'carciofi',        name: 'Carciofi',          ingredientId: 'ing141' },
  { id: 'finocchi',        name: 'Finocchi',          ingredientId: 'ing076' },
  { id: 'pomodori',        name: 'Pomodori',          ingredientId: 'ing064' },
  { id: 'pomodorini',      name: 'Pomodorini',        ingredientId: 'ing142' },
  { id: 'cetrioli',        name: 'Cetrioli',          ingredientId: 'ing143' },
  { id: 'insalata',        name: 'Insalata/lattuga',  ingredientId: 'ing067' },
  { id: 'radicchio',       name: 'Radicchio',         ingredientId: 'ing144' },
  { id: 'rucola',          name: 'Rucola',            ingredientId: 'ing145' },
  { id: 'cicoria',         name: 'Cicoria',           ingredientId: 'ing146' },
  { id: 'scarola',         name: 'Scarola',           ingredientId: 'ing147' },
  { id: 'funghi',          name: 'Funghi',            ingredientId: 'ing075' },
  { id: 'zucca',           name: 'Zucca',             ingredientId: 'ing081' },
  { id: 'carote',          name: 'Carote',            ingredientId: 'ing066' },
  { id: 'cipolle',         name: 'Cipolle',           ingredientId: 'ing068' },
];
export const VERDURE_DEFAULT_ID = 'ing133'; // Verdure miste
export const VERDURE_GRAMS = 300;

export const OLIO_INGREDIENT_ID = 'ing109';

function baseRiceGrams(proteinKind, hasLegumi) {
  if (hasLegumi) return 60;
  if (proteinKind === 'carne') return 90;
  return 80; // uova o formaggio
}

// L'olio non si imposta a mano: si calcola da solo in base a quanti grassi
// (e quindi calorie) arrivano già da proteina/legumi/carboidrato scelti. Più
// l'alimento è magro, più olio viene proposto, e viceversa — restando
// comunque sempre visibile con una quota minima.
const OIL_TARGET_FAT_GRAMS = 20;
const OIL_MIN_GRAMS = 5;

function computeOilGrams(itemsSoFar) {
  const fatSoFar = itemsSoFar.reduce((s, i) => s + i.fat, 0);
  const oil = ing(OLIO_INGREDIENT_ID);
  const neededFat = Math.max(0, OIL_TARGET_FAT_GRAMS - fatSoFar);
  const grams = (neededFat / oil.fatPer100) * 100;
  return Math.max(OIL_MIN_GRAMS, Math.round(grams / 5) * 5);
}

// Grammatura del carboidrato scelto, equivalente (a parità di calorie) alla
// quota standard di riso (90/80/60 g) prevista dalla combinazione proteina +
// legumi. Se è attivo il pane come aggiunta, la quota si riduce di una
// grammatura anch'essa equivalente alle calorie del pane, non un valore fisso.
export function defaultCarbGrams(carboidratoId, proteinKind, hasLegumi, hasPane, paneGrams) {
  const carboidrato = CARBOIDRATI.find(c => c.id === carboidratoId) ?? CARBOIDRATI[0];
  const riceBase = baseRiceGrams(proteinKind, hasLegumi);
  let grams = equivalentGrams(carboidrato.ingredientId, riceBase);

  if (hasPane && paneGrams && carboidratoId !== 'pane') {
    const pane = ing(PANE.ingredientId);
    const target = ing(carboidrato.ingredientId);
    const reductionGrams = (paneGrams * pane.kcalPer100) / target.kcalPer100;
    grams = Math.max(0, Math.round((grams - reductionGrams) / 5) * 5);
  }
  return grams;
}

// Costruisce la composizione completa di un pranzo/cena a partire dalle
// scelte dell'utente. Le quantità (proteina, carboidrato, olio) sono già
// calcolate automaticamente in base a proteina + legumi + pane.
export function buildMainMeal({ carboidratoId, proteinaId, hasLegumi, legumeId, hasPane, paneGrams }) {
  const proteina = PROTEINE.find(p => p.id === proteinaId) ?? PROTEINE[0];
  const effectiveHasPane = hasPane && carboidratoId !== 'pane';
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

  const carboidrato = CARBOIDRATI.find(c => c.id === carboidratoId) ?? CARBOIDRATI[0];
  const carbGrams = defaultCarbGrams(carboidratoId, proteina.kind, hasLegumi, effectiveHasPane, paneGrams);
  if (carbGrams > 0) items.push(item('carboidrato', carboidrato.ingredientId, carbGrams));
  if (effectiveHasPane) items.push(item('pane', PANE.ingredientId, paneGrams));

  items.push(item('verdure', VERDURE_DEFAULT_ID, VERDURE_GRAMS));

  items.push(item('olio', OLIO_INGREDIENT_ID, computeOilGrams(items)));

  return items;
}

// ── Spuntini ─────────────────────────────────────────────────

export const SNACK_PRESETS_DEFAULT = [
  { id: 'skyr0',           name: 'Skyr 0%',                                    items: [{ ingredientId: 'ing053', grams: 150 }] },
  { id: 'yogurtgreco0',    name: 'Yogurt greco 0%',                            items: [{ ingredientId: 'ing128', grams: 170 }] },
  { id: 'yogurtproteico',  name: 'Yogurt proteico',                            items: [{ ingredientId: 'ing131', grams: 150, unitLabel: '1 vasetto' }] },
  { id: 'fiocchidilatte',  name: 'Fiocchi di latte',                           items: [{ ingredientId: 'ing055', grams: 100 }] },
  { id: 'bresaola',        name: 'Bresaola',                                   items: [{ ingredientId: 'ing041', grams: 50 }] },
  { id: 'fesatacchino',    name: 'Fesa di tacchino',                           items: [{ ingredientId: 'ing148', grams: 60 }] },
  { id: 'prosciuttocotto', name: 'Prosciutto cotto sgrassato',                 items: [{ ingredientId: 'ing149', grams: 60 }] },
  { id: 'parmigiano',      name: 'Parmigiano Reggiano',                        items: [{ ingredientId: 'ing061', grams: 25 }] },
  { id: 'mandorle',        name: 'Mandorle',                                   items: [{ ingredientId: 'ing105', grams: 20 }] },
  { id: 'noci',            name: 'Noci',                                       items: [{ ingredientId: 'ing106', grams: 20 }] },
  { id: 'pistacchi',       name: 'Pistacchi',                                  items: [{ ingredientId: 'ing151', grams: 20 }] },
  { id: 'mela',            name: 'Mela',                                       items: [{ ingredientId: 'ing086', grams: 180, unitLabel: '~180 g' }] },
  { id: 'pera',            name: 'Pera',                                       items: [{ ingredientId: 'ing087', grams: 180, unitLabel: '~180 g' }] },
  { id: 'arancia',         name: 'Arancia',                                    items: [{ ingredientId: 'ing088', grams: 200, unitLabel: '~200 g' }] },
  { id: 'kiwi',            name: 'Kiwi',                                       items: [{ ingredientId: 'ing090', grams: 150, unitLabel: '~150 g' }] },
  { id: 'banana',          name: 'Banana',                                     items: [{ ingredientId: 'ing089', grams: 100, unitLabel: '~100 g' }] },
  { id: 'ananas',          name: "Ananas in succo d'ananas, sgocciolato",      items: [{ ingredientId: 'ing150', grams: 150 }] },
  { id: 'galletteFesa',    name: 'Gallette di riso + fesa',                    items: [{ ingredientId: 'ing013', grams: 18, unitLabel: '2 gallette' }, { ingredientId: 'ing148', grams: 30 }] },
  { id: 'gallettePhila',   name: 'Gallette + Philadelphia Light',              items: [{ ingredientId: 'ing013', grams: 18, unitLabel: '2 gallette' }, { ingredientId: 'ing130', grams: 30 }] },
  { id: 'paneBresaola',    name: 'Pane + bresaola',                            items: [{ ingredientId: 'ing001', grams: 30 }, { ingredientId: 'ing041', grams: 30 }] },
];

export function buildPresetItems(presetItems) {
  return presetItems.map(p => item('preset', p.ingredientId, p.grams, p.unitLabel ?? null));
}
