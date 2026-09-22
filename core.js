// ============================================================
// PROGRESS — Core: Supabase, Auth, CRUD, Utility
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ─────────────────────────────────────────────────────

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  supabase.auth.onAuthStateChange((_event, session) => cb(session));
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// ── Settings (peso obiettivo) ───────────────────────────────

export async function fetchSettings() {
  const { data, error } = await supabase
    .from('profile_settings')
    .select('*')
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
}

export async function saveSettings(patch) {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profile_settings')
    .upsert({ user_id: session.user.id, ...patch, updated_at: new Date().toISOString() })
    .select()
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
}

// ── Weight logs ──────────────────────────────────────────────

export async function fetchWeightLogs() {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .order('date', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

export async function addWeightLog(date, value) {
  const { data, error } = await supabase
    .from('weight_logs')
    .insert({ date, value })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteWeightLog(id) {
  const { error } = await supabase.from('weight_logs').delete().eq('id', id);
  if (error) console.error(error);
}

// ── Meals (box Alimentazione) ─────────────────────────────────

export async function fetchMealsForDate(date) {
  const { data, error } = await supabase
    .from('meals')
    .select('*, meal_items(*)')
    .eq('date', date);
  if (error) { console.error(error); return []; }
  return data;
}

export async function fetchAllMealsWithItems() {
  const { data, error } = await supabase
    .from('meals')
    .select('date, type, meal_items(role, ingredient_id, name)');
  if (error) { console.error(error); return []; }
  return data;
}

export async function addMeal(date, type, items, totals) {
  const { data: meal, error: mealError } = await supabase
    .from('meals')
    .insert({ date, type, kcal: totals.kcal, protein: totals.protein, carbs: totals.carbs, fat: totals.fat })
    .select()
    .single();
  if (mealError) { console.error(mealError); return null; }

  const rows = items.map(i => ({
    meal_id: meal.id,
    role: i.role,
    ingredient_id: i.ingredientId,
    name: i.name,
    grams: i.grams,
    unit_label: i.unitLabel,
    kcal: i.kcal,
    protein: i.protein,
    carbs: i.carbs,
    fat: i.fat,
  }));
  const { error: itemsError } = await supabase.from('meal_items').insert(rows);
  if (itemsError) console.error(itemsError);
  return meal;
}

export async function deleteMeal(id) {
  const { error } = await supabase.from('meals').delete().eq('id', id);
  if (error) console.error(error);
}

export async function fetchSnackPresets() {
  const { data, error } = await supabase
    .from('snack_presets')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

export async function addSnackPreset(name, items, totals) {
  const { data, error } = await supabase
    .from('snack_presets')
    .insert({ name, items, kcal: totals.kcal, protein: totals.protein, carbs: totals.carbs, fat: totals.fat })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteSnackPreset(id) {
  const { error } = await supabase.from('snack_presets').delete().eq('id', id);
  if (error) console.error(error);
}

// ── Food entries ─────────────────────────────────────────────

export async function fetchFoodEntries(date) {
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

export async function fetchAllFoodEntriesByDay() {
  const { data, error } = await supabase
    .from('food_entries')
    .select('date, kcal');
  if (error) { console.error(error); return []; }
  const byDay = new Map();
  for (const row of data) {
    byDay.set(row.date, (byDay.get(row.date) || 0) + (row.kcal || 0));
  }
  return [...byDay.entries()].map(([date, kcal]) => ({ date, kcal }));
}

export async function addFoodEntry(entry) {
  const { data, error } = await supabase
    .from('food_entries')
    .insert(entry)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteFoodEntry(id) {
  const { error } = await supabase.from('food_entries').delete().eq('id', id);
  if (error) console.error(error);
}

// ── Activity entries ─────────────────────────────────────────

export async function fetchActivityEntries(date) {
  const { data, error } = await supabase
    .from('activity_entries')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

export async function fetchAllActivityKcal() {
  const { data, error } = await supabase
    .from('activity_entries')
    .select('kcal');
  if (error) { console.error(error); return 0; }
  return data.reduce((s, r) => s + (r.kcal || 0), 0);
}

export async function fetchAllActivityEntries() {
  const { data, error } = await supabase
    .from('activity_entries')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

export async function addActivityEntry(entry) {
  const { data, error } = await supabase
    .from('activity_entries')
    .insert(entry)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function updateActivityEntry(id, patch) {
  const { data, error } = await supabase
    .from('activity_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteActivityEntry(id) {
  const { error } = await supabase.from('activity_entries').delete().eq('id', id);
  if (error) console.error(error);
}

// ── Date utils ───────────────────────────────────────────────

export function today() { return toDateStr(new Date()); }

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toDateStr(dt);
}

export function formatDateIT(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ── Generic utils ────────────────────────────────────────────

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function fmtNum(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function el(id) { return document.getElementById(id); }
export function qs(selector, parent = document) { return parent.querySelector(selector); }
export function qsa(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }

export function openModal(id) {
  const m = el(id);
  if (m) m.classList.add('open');
}

export function closeModal(id) {
  const m = el(id);
  if (m) m.classList.remove('open');
}

export function setupModalClose(overlayId) {
  const overlay = el(overlayId);
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlayId);
  });
}
