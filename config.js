// ============================================================
// PROGRESS — Configurazione Supabase
// ============================================================
// L'anon key è pensata per stare nel client: è pubblica per design.
// La protezione dei dati è garantita dalle policy RLS (vedi schema.sql)
// unite al login: ogni utente vede/scrive solo le proprie righe.

export const SUPABASE_URL = 'https://hxtmfybcfptsunspkhtn.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4dG1meWJjZnB0c3Vuc3BraHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTU0NjksImV4cCI6MjEwMTc3MTQ2OX0.ZzLuVydf_42fm9msBfHFy7v9E9VxP97P2sPSh9BY3tM';
