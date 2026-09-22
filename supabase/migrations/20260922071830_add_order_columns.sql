-- Ordine personalizzato (drag & drop) dei pulsanti carboidrati/proteine
-- nel configuratore pranzo/cena.
alter table profile_settings add column if not exists carb_order jsonb;
alter table profile_settings add column if not exists protein_order jsonb;
